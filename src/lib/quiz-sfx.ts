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
