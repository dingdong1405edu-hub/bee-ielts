/**
 * Transcript paste parser — turns a transcript the admin copied themselves
 * (from YouTube's own "Show transcript" panel, or a downloaded .vtt / .srt
 * file) into timed cues. This is the YouTube-block escape hatch: the server
 * never touches YouTube's player/captions API (which Railway's datacenter IP
 * is blocked from), so it always works. The admin's logged-in browser is the
 * one that fetched the transcript.
 *
 * Output cues feed the SAME downstream pipeline as the auto path
 * (mergeCuesIntoSegments → refineSegmentsForShadowing → Claude enrich), so a
 * pasted-transcript lesson is just as good as a caption-scraped one.
 *
 * Accepted shapes:
 *   1. WebVTT / SRT cues:  "00:00:01.000 --> 00:00:04.000\nHello there"
 *   2. YouTube panel copy: a timestamp on its own line, then the text line(s)
 *      under it ("0:01\nHello there\n0:04\n..."), OR inline "0:01 Hello there".
 */

/** A timed caption cue. Shape-compatible with RawCue in lib/youtube.ts so the
 *  merge pipeline accepts it directly without an import (keeps youtubei.js out
 *  of this module's graph). */
export interface ParsedCue {
  text: string;
  offsetSec: number;
  durationSec: number;
}

/** Parse a single timestamp token into seconds. Handles, in any combination:
 *  "1:02:03.456" (H:MM:SS.mmm), "02:03,456" (SRT comma ms), "1:05" (M:SS),
 *  and a bare "75.2" seconds value. Returns null if it isn't a timestamp. */
export function parseTimestamp(raw: string): number | null {
  const s = raw.trim().replace(",", ".");
  if (!s) return null;
  if (s.includes(":")) {
    const parts = s.split(":").map((p) => p.trim());
    if (parts.some((p) => p === "" || !/^\d*\.?\d+$/.test(p))) return null;
    let sec = 0;
    for (const p of parts) sec = sec * 60 + parseFloat(p);
    return Number.isFinite(sec) ? sec : null;
  }
  const n = parseFloat(s);
  return Number.isFinite(n) && /^\d*\.?\d+$/.test(s) ? n : null;
}

/** A line that is ONLY a timestamp (YouTube panel rows look like this). */
const TS_ONLY_RE = /^(?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?$/;
/** A line that LEADS with a timestamp then has inline text ("0:01 Hello"). */
const TS_LEAD_RE = /^((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?)\s+(\S.*)$/;
/** The "start --> end" cue header of a VTT/SRT block. */
const CUE_RANGE_RE =
  /(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)\s*-->\s*(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)/;

/** Strip inline caption markup: VTT <c> tags, <00:00:00.000> word timings,
 *  and the few HTML entities YouTube emits. */
function cleanText(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse a WebVTT / SRT body (anything containing "-->"). */
function parseCueBlocks(lines: string[]): ParsedCue[] {
  const cues: ParsedCue[] = [];
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(CUE_RANGE_RE);
    if (!m) {
      i++;
      continue;
    }
    const start = parseTimestamp(m[1]);
    const end = parseTimestamp(m[2]);
    i++;
    const parts: string[] = [];
    while (i < lines.length && !lines[i].includes("-->")) {
      const t = lines[i].trim();
      // Skip blank lines, SRT numeric indices, and VTT headers/notes.
      if (t && !/^\d+$/.test(t) && !/^WEBVTT/i.test(t) && !/^NOTE\b/i.test(t)) {
        parts.push(t);
      }
      i++;
    }
    const text = cleanText(parts.join(" "));
    if (start != null && end != null && text) {
      cues.push({ text, offsetSec: start, durationSec: Math.max(0.3, end - start) });
    }
  }
  return cues;
}

/** Parse the YouTube "Show transcript" panel copy (timestamp lines + text). */
function parsePanel(lines: string[]): ParsedCue[] {
  const pairs: { start: number; text: string }[] = [];
  let pendingStart: number | null = null;
  let pendingText: string[] = [];
  const flush = () => {
    if (pendingStart != null) {
      const t = cleanText(pendingText.join(" "));
      if (t) pairs.push({ start: pendingStart, text: t });
    }
    pendingStart = null;
    pendingText = [];
  };

  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line) continue;
    if (/^\d+$/.test(line)) continue; // stray SRT index / page number
    if (TS_ONLY_RE.test(line)) {
      flush();
      pendingStart = parseTimestamp(line);
      continue;
    }
    const lead = line.match(TS_LEAD_RE);
    if (lead) {
      flush();
      pendingStart = parseTimestamp(lead[1]);
      pendingText = [lead[2]];
      flush();
      continue;
    }
    // Plain text line — belongs to the timestamp above it. Text with no
    // preceding timestamp (a stray header) is dropped: we can't time it.
    if (pendingStart != null) pendingText.push(line);
  }
  flush();

  pairs.sort((a, b) => a.start - b.start);
  // Each cue runs until the next one starts (clamped so a long gap before the
  // next line doesn't make one drill 40s long). The final cue gets a nominal
  // 3s — the merge/refine pass re-chunks everything anyway.
  return pairs.map((p, idx) => {
    const next = pairs[idx + 1];
    const dur = next ? Math.min(12, Math.max(0.4, next.start - p.start)) : 3;
    return { text: p.text, offsetSec: p.start, durationSec: dur };
  });
}

/**
 * Parse a pasted transcript into timed cues. Auto-detects VTT/SRT vs. the
 * YouTube panel format. Returns [] if no timed lines were found (caller should
 * tell the admin their paste had no timestamps).
 */
export function parseTranscript(raw: string): ParsedCue[] {
  const lines = raw.replace(/\r/g, "").split("\n");
  const cues = /-->/.test(raw) ? parseCueBlocks(lines) : parsePanel(lines);
  // Defensive: drop any zero/negative-time junk and keep chronological order.
  return cues
    .filter((c) => Number.isFinite(c.offsetSec) && c.offsetSec >= 0 && c.text.length > 0)
    .sort((a, b) => a.offsetSec - b.offsetSec);
}
