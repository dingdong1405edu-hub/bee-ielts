/**
 * Shadowing module constants safe to import from BOTH client and server.
 *
 * Kept in its own file because `src/lib/youtube.ts` pulls in youtubei.js
 * (server-only, includes Node `Buffer` types) and importing it from a
 * `"use client"` component would drag youtubei.js into the browser bundle.
 */

/** Maximum allowable video duration for the audio-fallback path. Audio
 *  size at 96-128kbps Opus is ~1MB/min so 30min ≈ 30MB — under the
 *  Deepgram 2GB cap by a wide margin but right around our memory comfort
 *  line on Railway. Bump cautiously. */
export const MAX_AUDIO_FALLBACK_SEC = 30 * 60;
