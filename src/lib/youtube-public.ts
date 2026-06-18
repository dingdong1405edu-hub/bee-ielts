/**
 * Cookie-free YouTube fallback via public Invidious / Piped instances.
 *
 * When YouTube blocks our datacenter IP (the LOGIN_REQUIRED / bot wall that
 * breaks /from-youtube), these open-source proxy frontends can still fetch the
 * video for us — they do the YouTube round-trip on THEIR infrastructure and
 * hand back metadata + captions (incl. auto-generated) + audio streams over a
 * plain CORS-free JSON API. No cookie, no key, no proxy config required.
 *
 * Instances go up and down, so every call races a short list with a tight
 * timeout and returns null (never throws) so the caller can fall through to the
 * next strategy (manual transcript paste) cleanly.
 */
import { parseTranscript, type ParsedCue } from "@/lib/transcript-parse";

// Kept short + diverse. First responder wins. (Public lists rotate often; this
// is a pragmatic seed — easy to extend via env later if needed.)
const INVIDIOUS_INSTANCES = [
  "https://invidious.nerdvpn.de",
  "https://inv.nadeko.net",
  "https://yewtu.be",
  "https://invidious.jing.rocks",
  "https://iv.melmac.space",
  "https://invidious.privacyredirect.com",
];
const PIPED_API_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://api.piped.private.coffee",
  "https://pipedapi.leptons.xyz",
];

const JSON_TIMEOUT_MS = 7000;
const TEXT_TIMEOUT_MS = 9000;
const AUDIO_TIMEOUT_MS = 90_000;

async function fetchWithTimeout(url: string, ms: number, init?: RequestInit): Promise<Response | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
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

export interface PublicCaption {
  lang: string;
  label: string;
  url: string; // absolute, fetches a WebVTT body
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

/** Look up a video's metadata + caption list + audio streams via public proxies. */
export async function fetchPublicVideo(videoId: string): Promise<PublicVideo | null> {
  // --- Invidious: one call returns title, duration, captions list, formats ---
  for (const base of INVIDIOUS_INSTANCES) {
    const v = await getJson(
      `${base}/api/v1/videos/${videoId}?fields=title,author,lengthSeconds,liveNow,captions,adaptiveFormats`,
    );
    if (v && str(v.title)) {
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
  }

  // --- Piped fallback: /streams/{id} gives subtitles + audioStreams ---
  for (const base of PIPED_API_INSTANCES) {
    const v = await getJson(`${base}/streams/${videoId}`);
    if (v && str(v.title)) {
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
  }

  return null;
}

function pickEnglish(caps: PublicCaption[]): PublicCaption | null {
  return (
    caps.find((c) => c.lang.toLowerCase().startsWith("en")) ??
    caps.find((c) => /english/i.test(c.label)) ??
    null
  );
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
  // Most instances serve WebVTT; some Piped subtitle URLs need ?fmt=vtt.
  const url = video.source === "piped" && !/[?&]fmt=/.test(en.url) ? `${en.url}${en.url.includes("?") ? "&" : "?"}fmt=vtt` : en.url;
  const body = await getText(url);
  if (!body) return { cues: [], langs, video };
  const cues = parseTranscript(body);
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
