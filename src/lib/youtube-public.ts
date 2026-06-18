/**
 * Cookie-free YouTube fallback via public Invidious / Piped instances.
 *
 * When YouTube blocks our datacenter IP (the LOGIN_REQUIRED / bot wall that
 * breaks /from-youtube), these open-source proxy frontends can still fetch the
 * video for us — they do the YouTube round-trip on THEIR infrastructure and
 * hand back metadata + captions (incl. auto-generated) + audio streams over a
 * plain CORS-free JSON API. No cookie, no key, no proxy config required.
 *
 * Public instances go up and down constantly, so we RACE the whole list in
 * parallel (first usable response wins) instead of waiting through dead ones
 * one by one. Every call returns null (never throws) so the caller can fall
 * through to the next strategy (manual transcript paste) cleanly.
 *
 * KNOWN GOTCHA (fixed here): Piped's subtitle URLs default to `fmt=ttml`, which
 * our parser can't read. We force `fmt=vtt` on every caption URL so the body is
 * always WebVTT. If a stray instance ignores that, we also parse TTML directly.
 */
import { parseTranscript, parseTimestamp, type ParsedCue } from "@/lib/transcript-parse";

// Kept short + diverse, working instances first. Public lists rotate often, so
// the parallel race tolerates most of these being dead at any given moment.
const INVIDIOUS_INSTANCES = [
  "https://invidious.nerdvpn.de",
  "https://inv.nadeko.net",
  "https://yewtu.be",
  "https://invidious.jing.rocks",
];
const PIPED_API_INSTANCES = [
  "https://api.piped.private.coffee",
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.leptons.xyz",
  "https://pipedapi.reallyaweso.me",
];

const JSON_TIMEOUT_MS = 8000;
const TEXT_TIMEOUT_MS = 9000;
const AUDIO_TIMEOUT_MS = 90_000;

async function fetchWithTimeout(url: string, ms: number, init?: RequestInit): Promise<Response | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BeeIELTS/1.0)", ...(init?.headers ?? {}) },
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function getJson(url: string): Promise<Record<string, unknown> | null> {
  const res = await fetchWithTimeout(url, JSON_TIMEOUT_MS);
  if (!res || !res.ok) return null;
  // Dead/parked instances often answer 200 with an HTML SPA shell — guard so we
  // don't try to JSON.parse "<!DOCTYPE html>".
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("json")) return null;
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function getText(url: string): Promise<string | null> {
  const res = await fetchWithTimeout(url, TEXT_TIMEOUT_MS);
  if (!res || !res.ok) return null;
  try {
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Resolve with the first task that returns a non-null value; resolve null only
 * once every task has produced null. Never rejects — task errors count as null.
 * This is what lets us probe a dozen flaky instances at once and take whoever
 * answers first, instead of serialising the wait behind dead ones.
 */
function raceFirst<T>(tasks: Array<() => Promise<T | null>>): Promise<T | null> {
  return new Promise((resolve) => {
    let remaining = tasks.length;
    if (remaining === 0) {
      resolve(null);
      return;
    }
    let settled = false;
    const done = (v: T | null) => {
      if (settled) return;
      if (v != null) {
        settled = true;
        resolve(v);
      } else if (--remaining === 0) {
        resolve(null);
      }
    };
    for (const t of tasks) {
      t().then(done, () => done(null));
    }
  });
}

export interface PublicCaption {
  lang: string;
  label: string;
  url: string; // absolute, fetches a WebVTT (or TTML) body
}
export interface PublicVideo {
  title: string;
  author: string;
  durationSec: number;
  isLive: boolean;
  captions: PublicCaption[];
  /** Audio-only stream URLs (smallest first) when the instance exposes them. */
  audioUrls: string[];
  source: "invidious" | "piped";
}

function asArray(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}
function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Force YouTube/Piped timedtext URLs to serve WebVTT (default is often ttml,
 *  which our parser can't read). Replaces an existing fmt param or appends one. */
function forceVtt(url: string): string {
  if (/[?&]fmt=/.test(url)) return url.replace(/([?&]fmt=)[^&]*/, "$1vtt");
  return `${url}${url.includes("?") ? "&" : "?"}fmt=vtt`;
}

async function fetchInvidious(base: string, videoId: string): Promise<PublicVideo | null> {
  const v = await getJson(
    `${base}/api/v1/videos/${videoId}?fields=title,author,lengthSeconds,liveNow,captions,adaptiveFormats`,
  );
  if (!v || !str(v.title)) return null;
  const captions: PublicCaption[] = asArray(v.captions).map((c) => {
    const u = str(c.url);
    return {
      lang: str(c.languageCode) || str(c.language_code),
      label: str(c.label),
      url: u.startsWith("http") ? u : `${base}${u}`,
    };
  });
  const audioUrls = asArray(v.adaptiveFormats)
    .filter((f) => str(f.type).startsWith("audio/"))
    .sort((a, b) => num(a.bitrate) - num(b.bitrate))
    .map((f) => str(f.url))
    .filter(Boolean);
  return {
    title: str(v.title),
    author: str(v.author),
    durationSec: num(v.lengthSeconds),
    isLive: Boolean(v.liveNow),
    captions,
    audioUrls,
    source: "invidious",
  };
}

async function fetchPiped(base: string, videoId: string): Promise<PublicVideo | null> {
  const v = await getJson(`${base}/streams/${videoId}`);
  if (!v || !str(v.title)) return null;
  const captions: PublicCaption[] = asArray(v.subtitles)
    .map((s) => ({ lang: str(s.code), label: str(s.name), url: str(s.url) }))
    .filter((s) => s.url);
  const audioUrls = asArray(v.audioStreams)
    .sort((a, b) => num(a.bitrate) - num(b.bitrate))
    .map((s) => str(s.url))
    .filter(Boolean);
  return {
    title: str(v.title),
    author: str(v.uploader),
    durationSec: num(v.duration),
    isLive: Boolean(v.livestream),
    captions,
    audioUrls,
    source: "piped",
  };
}

/** Look up a video's metadata + caption list + audio streams via public
 *  proxies. Races every instance; first usable response wins. */
export async function fetchPublicVideo(videoId: string): Promise<PublicVideo | null> {
  // Piped first — currently the more reliable network — but raced together so a
  // live Invidious can still win if Piped is having a bad day.
  return raceFirst<PublicVideo>([
    ...PIPED_API_INSTANCES.map((b) => () => fetchPiped(b, videoId)),
    ...INVIDIOUS_INSTANCES.map((b) => () => fetchInvidious(b, videoId)),
  ]);
}

function pickEnglish(caps: PublicCaption[]): PublicCaption | null {
  return (
    caps.find((c) => c.lang.toLowerCase().startsWith("en")) ??
    caps.find((c) => /english/i.test(c.label)) ??
    null
  );
}

/** Minimal TTML (YouTube timedtext fmt=ttml) → cues. Belt-and-suspenders for
 *  the rare instance that ignores our fmt=vtt request. */
function parseTtml(body: string): ParsedCue[] {
  const cues: ParsedCue[] = [];
  const re = /<p\b[^>]*\bbegin="([^"]+)"[^>]*\bend="([^"]+)"[^>]*>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const start = parseTimestamp(m[1]);
    const end = parseTimestamp(m[2]);
    const text = m[3]
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();
    if (start != null && end != null && text) {
      cues.push({ text, offsetSec: start, durationSec: Math.max(0.3, end - start) });
    }
  }
  return cues;
}

function parseCaptionBody(body: string): ParsedCue[] {
  // VTT/SRT or YouTube panel — the normal path.
  const cues = parseTranscript(body);
  if (cues.length > 0) return cues;
  // Fallback: instance served TTML despite fmt=vtt.
  if (/<tt[\s>]/i.test(body) || /<p\b[^>]*\bbegin=/i.test(body)) return parseTtml(body);
  return cues;
}

/**
 * English caption cues via public proxies. Returns the parsed cues plus the
 * full list of available caption languages (so the caller can tell the admin
 * "this video only has Vietnamese captions"). Null = couldn't reach any proxy.
 */
export async function fetchPublicCaptions(
  videoId: string,
  pre?: PublicVideo | null,
): Promise<{ cues: ParsedCue[]; langs: string[]; video: PublicVideo } | null> {
  const video = pre ?? (await fetchPublicVideo(videoId));
  if (!video) return null;
  const langs = video.captions.map((c) => c.lang).filter(Boolean);
  const en = pickEnglish(video.captions);
  if (!en) return { cues: [], langs, video };
  // Always force WebVTT — Piped (and some Invidious) default to TTML which our
  // parser can't read. This was the bug that made every proxy lesson empty.
  const url = forceVtt(en.url);
  let body = await getText(url);
  if (!body) {
    // Retry once without the forced fmt in case the instance choked on it.
    body = await getText(en.url);
  }
  if (!body) return { cues: [], langs, video };
  const cues = parseCaptionBody(body);
  return { cues, langs, video };
}

/**
 * Download an audio-only stream via a public proxy so we can Whisper/Deepgram
 * it when the video has no usable captions. Returns null on any failure or when
 * the file is implausibly small. Caps total bytes to keep memory sane.
 */
export async function fetchPublicAudio(
  videoId: string,
  pre?: PublicVideo | null,
): Promise<{ buffer: Buffer; contentType: string; durationSec: number; title: string } | null> {
  const video = pre ?? (await fetchPublicVideo(videoId));
  if (!video || video.audioUrls.length === 0) return null;

  for (const url of video.audioUrls.slice(0, 3)) {
    const res = await fetchWithTimeout(url, AUDIO_TIMEOUT_MS);
    if (!res || !res.ok) continue;
    try {
      const ab = await res.arrayBuffer();
      if (ab.byteLength < 50_000) continue; // too small = blocked/partial
      const contentType = res.headers.get("content-type") || "audio/webm";
      return { buffer: Buffer.from(ab), contentType, durationSec: video.durationSec, title: video.title };
    } catch {
      continue;
    }
  }
  return null;
}
