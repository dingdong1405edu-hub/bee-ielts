/**
 * Speaking Roulette multiplayer helpers.
 *
 * Score model (intentionally simple — no AI grading on the hot path so
 * polling stays cheap and turns don't stall on a 3-5s Claude call):
 *   - Word count tier: 0-19 → 0, 20-39 → 40, 40-59 → 70, 60-99 → 90,
 *     100+ → 100. Rough proxy for fluency on a 60-90s answer.
 *   - We may upgrade to AI band scoring in v2.
 */

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1

export function generateRoomCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return s;
}

export function scoreTranscript(transcript: string): number {
  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount >= 100) return 100;
  if (wordCount >= 60) return 90;
  if (wordCount >= 40) return 70;
  if (wordCount >= 20) return 40;
  return 0;
}
