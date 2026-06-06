/**
 * YouTube URL helpers — extract the 11-character video id from any of the
 * URL shapes YouTube has shipped over the years, and compute the canonical
 * thumbnail URL for a given id. Used by the Shadowing module.
 */

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
