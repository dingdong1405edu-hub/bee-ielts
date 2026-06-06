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
