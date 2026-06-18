/**
 * Web Audio "ding" / "buzz" helpers for the mini-quiz feedback bar.
 * No audio files, no extra deps — synthesises a short ascending chime
 * for correct answers and a low descending blip for wrong ones.
 *
 * AudioContext must be created lazily inside a user gesture or the
 * browser will block it; we instantiate on first call, after the
 * "Kiểm tra" tap which is itself a gesture.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  startOffset: number,
  durationMs: number,
  gainPeak: number,
  type: OscillatorType,
) {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const t0 = now + startOffset;
  const t1 = t0 + durationMs / 1000;

  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(gainPeak, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t1);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t1 + 0.05);
}

/** Pleasant 2-note ascending chime (C5 → G5) — Duolingo-style "ding". */
export function playCorrectSfx() {
  tone(523.25, 0, 130, 0.16, "triangle"); // C5
  tone(659.25, 0.08, 160, 0.16, "triangle"); // E5
  tone(783.99, 0.16, 240, 0.18, "triangle"); // G5
}

/** Soft "wrong" buzz (low descending sawtooth) — short so it doesn't annoy. */
export function playWrongSfx() {
  tone(220, 0, 180, 0.12, "sawtooth");
  tone(165, 0.1, 200, 0.1, "sawtooth");
}

// ===== Shadowing / Dictation specific =====

/** Tiny tick when the dictation typer hits the correct next letter. Soft +
 *  short so a fast typist isn't drowning in clicks. */
export function playTypingTickSfx() {
  tone(880, 0, 35, 0.08, "sine"); // A5, 35ms, very quiet
}

/** Heavier 3-note flourish when a whole dictation/shadowing segment is
 *  completed correctly — bigger than playCorrectSfx so it feels like a
 *  bigger reward than a single quiz question. */
export function playSegmentDoneSfx() {
  tone(523.25, 0, 100, 0.18, "triangle"); // C5
  tone(659.25, 0.06, 120, 0.18, "triangle"); // E5
  tone(783.99, 0.12, 140, 0.18, "triangle"); // G5
  tone(1046.5, 0.2, 220, 0.2, "triangle"); // C6
}

/** Streak chime (5+ correct segments in a row) — adds an extra octave on
 *  top of playSegmentDoneSfx so the user notices "yes, I'm on a roll". */
export function playStreakSfx() {
  tone(523.25, 0, 90, 0.16, "triangle");
  tone(659.25, 0.05, 100, 0.16, "triangle");
  tone(783.99, 0.1, 110, 0.16, "triangle");
  tone(1046.5, 0.15, 140, 0.18, "triangle");
  tone(1318.5, 0.22, 260, 0.18, "triangle"); // E6 cap
}

/** End-of-lesson fanfare — fired once when user finishes every segment. */
export function playLessonCompleteSfx() {
  tone(523.25, 0, 120, 0.18, "triangle");
  tone(659.25, 0.08, 120, 0.18, "triangle");
  tone(783.99, 0.16, 120, 0.18, "triangle");
  tone(1046.5, 0.28, 240, 0.22, "triangle");
  tone(1318.5, 0.4, 320, 0.22, "triangle");
}

/** Soft "swoosh" when the video auto-advances to the next segment. Distinct
 *  from playCorrectSfx so the ear can tell "I was right" vs "next is coming". */
export function playSwooshSfx() {
  tone(440, 0, 80, 0.08, "sine");
  tone(660, 0.04, 100, 0.08, "sine");
}

/** Quick bubbly "pop" — used for emoji reactions in Speaking Roulette. */
export function playPopSfx() {
  tone(880, 0, 50, 0.1, "sine");
  tone(1320, 0.05, 90, 0.12, "sine");
}
