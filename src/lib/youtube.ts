/**
 * YouTube URL helpers — extract the 11-character video id from any of the
 * URL shapes YouTube has shipped over the years, and compute the canonical
 * thumbnail URL for a given id. Used by the Shadowing module.
 *
 * Also includes server-side audio extraction via youtubei.js — used by the
 * shadowing audio fallback when a video has no English captions on YouTube.
 */
import { Innertube, UniversalCache, Utils } from "youtubei.js";

/** Return the 11-char video id from a YouTube URL, or null if not found. */
export function extractYoutubeId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  // Bare id case — exactly 11 chars from the youtube alphabet.
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
  // youtu.be short link: youtu.be/<id>?…
  const short = raw.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (short) return short[1];
  // youtube.com watch / embed / shorts URLs.
  const watch = raw.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (watch) return watch[1];
  const embed = raw.match(/\/embed\/([A-Za-z0-9_-]{11})/);
  if (embed) return embed[1];
  const shorts = raw.match(/\/shorts\/([A-Za-z0-9_-]{11})/);
  if (shorts) return shorts[1];
  return null;
}

/** Standard YouTube hqdefault thumbnail (480x360, always available). */
export function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** Embed URL for the IFrame Player API — enablejsapi so we can post-message it. */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube.com/embed/${id}?enablejsapi=1&rel=0&modestbranding=1&controls=1`;
}

/**
 * Merge raw YouTube caption cues (each typically 2-3 words long) into
 * sentence-shaped shadowing segments. We greedy-pack cues until we hit a
 * terminal punctuation (.!?) OR the running window grows past `targetSec`
 * seconds OR we cross a long silence gap. Each merged segment carries a
 * single start (from the first cue) and end (last cue's start+duration).
 */
export interface RawCue {
  text: string;
  offsetSec: number;
  durationSec: number;
}
export interface MergedSegment {
  startSec: number;
  endSec: number;
  textEn: string;
}
export function mergeCuesIntoSegments(
  cues: RawCue[],
  opts: { targetSec?: number; maxSec?: number; gapSec?: number } = {},
): MergedSegment[] {
  const targetSec = opts.targetSec ?? 6;
  const maxSec = opts.maxSec ?? 12;
  const gapSec = opts.gapSec ?? 1.2;
  const cleaned = cues
    .map((c) => ({
      ...c,
      text: c.text
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\[.*?\]/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    }))
    .filter((c) => c.text.length > 0);

  const segments: MergedSegment[] = [];
  let bucket: RawCue[] = [];
  const flush = () => {
    if (bucket.length === 0) return;
    const startSec = bucket[0].offsetSec;
    const last = bucket[bucket.length - 1];
    const endSec = Math.max(startSec + 0.5, last.offsetSec + last.durationSec);
    const textEn = bucket
      .map((b) => b.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (textEn) segments.push({ startSec, endSec, textEn });
    bucket = [];
  };

  for (let i = 0; i < cleaned.length; i++) {
    const cur = cleaned[i];
    const prev = bucket[bucket.length - 1];
    if (prev) {
      const gap = cur.offsetSec - (prev.offsetSec + prev.durationSec);
      if (gap > gapSec) flush();
    }
    bucket.push(cur);
    const windowStart = bucket[0].offsetSec;
    const windowEnd = cur.offsetSec + cur.durationSec;
    const span = windowEnd - windowStart;
    const endsSentence = /[.!?]\s*$/.test(cur.text);
    if (endsSentence && span >= targetSec * 0.5) flush();
    else if (span >= maxSec) flush();
    else if (span >= targetSec && /[,;:]\s*$/.test(cur.text)) flush();
  }
  flush();
  return segments;
}

/**
 * youtubei.js — server-side audio fetcher used by the "AI nghe & tạo bài"
 * fallback when a video has no English captions. Singleton client is
 * cheaper (~200ms session init / call avoided) than creating one per
 * request. UniversalCache(false) = in-memory only — fine for Railway.
 *
 * IOS client choice: it's the variant least likely to require a PO token
 * on fresh server IPs. ANDROID would also work; WEB requires a token.
 *
 * HMR safety: in dev, Next.js re-evaluates this module on every code
 * change. A naive `let innertubeSingleton: Innertube | null = null;` at
 * module scope leaks: each HMR cycle creates a fresh session, never GCs
 * the old ones, and a long dev session can stack 50+ Innertube instances
 * holding network sockets. Stash on globalThis (same trick the Prisma
 * singleton uses) so HMR finds the live instance instead of recreating it.
 */
type InnertubeGlobal = typeof globalThis & {
  __beeInnertube?: Innertube;
  __beeInnertubePromise?: Promise<Innertube>;
};
async function getInnertube(): Promise<Innertube> {
  const g = globalThis as InnertubeGlobal;
  if (g.__beeInnertube) return g.__beeInnertube;
  // Concurrent callers must share the same in-flight create() promise or
  // we'd init twice on the very first burst of requests.
  if (g.__beeInnertubePromise) return g.__beeInnertubePromise;
  g.__beeInnertubePromise = Innertube.create({
    cache: new UniversalCache(false),
    generate_session_locally: true,
  }).then((c) => {
    g.__beeInnertube = c;
    return c;
  });
  return g.__beeInnertubePromise;
}

/** Lightweight metadata for a video — used to reject livestreams and to
 *  cap duration before we burn API credits on a 3-hour podcast. */
export interface YouTubeBasicInfo {
  videoId: string;
  title: string;
  durationSec: number;
  isLive: boolean;
  channelTitle: string | null;
}

export async function getYouTubeBasicInfo(videoId: string): Promise<YouTubeBasicInfo> {
  const yt = await getInnertube();
  const info = await yt.getBasicInfo(videoId);
  const basic = info.basic_info;
  return {
    videoId,
    title: basic.title ?? "",
    durationSec: basic.duration ?? 0,
    isLive: !!basic.is_live,
    channelTitle: basic.author ?? null,
  };
}

// MAX_AUDIO_FALLBACK_SEC lives in shadowing-constants.ts so client
// components can use it without dragging youtubei.js into the browser
// bundle. Re-exported here as a convenience for server-side callers
// that already imported from this file.
export { MAX_AUDIO_FALLBACK_SEC } from "./shadowing-constants";
import { MAX_AUDIO_FALLBACK_SEC } from "./shadowing-constants";

/**
 * Download an audio-only track and return it as a Buffer. WebM/Opus by
 * default (~1 MB / min), which Deepgram accepts natively when we send
 * `Content-Type: audio/webm`.
 *
 * Throws if the video is a livestream, age-restricted (LOGIN_REQUIRED),
 * region-locked, or longer than MAX_AUDIO_FALLBACK_SEC.
 */
export interface YouTubeAudio {
  buffer: Buffer;
  contentType: string;
  durationSec: number;
  title: string;
}
export async function getYouTubeAudioBuffer(videoId: string): Promise<YouTubeAudio> {
  const yt = await getInnertube();
  const info = await yt.getBasicInfo(videoId);
  if (info.basic_info.is_live) {
    throw new Error("Video đang livestream — không tải audio được.");
  }
  const dur = info.basic_info.duration ?? 0;
  if (dur === 0) {
    throw new Error("Không xác định được độ dài video.");
  }
  if (dur > MAX_AUDIO_FALLBACK_SEC) {
    throw new Error(
      `Video dài ${Math.round(dur / 60)} phút, vượt giới hạn ${MAX_AUDIO_FALLBACK_SEC / 60} phút cho AI nghe.`,
    );
  }
  const stream = await yt.download(videoId, {
    type: "audio",
    quality: "best",
    format: "any",
    client: "IOS",
  });
  const chunks: Uint8Array[] = [];
  for await (const chunk of Utils.streamToIterable(stream)) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  return {
    buffer,
    // We asked for `format: "any"` so most tracks come back as webm/opus.
    // Deepgram will sniff the container — webm is a safe default.
    contentType: "audio/webm",
    durationSec: dur,
    title: info.basic_info.title ?? "",
  };
}
