"use client";

import { TTS_VOICES } from "@/lib/tts-voices";

export interface TTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceName?: string;
  lang?: string;
  /** Force a specific gender for the SpeechSynthesis fallback. */
  gender?: "Nữ" | "Nam";
}

/**
 * Gender hint for a given Deepgram voice id — used by the SpeechSynthesis
 * fallback so the candidate keeps hearing a female voice when they picked a
 * female Aura voice. Without this the browser would pick its first available
 * voice (often male) and the gender would flip mid-session whenever Deepgram
 * intermittently failed.
 */
export function genderForVoiceId(voiceId: string | undefined): "Nữ" | "Nam" | undefined {
  if (!voiceId) return undefined;
  return TTS_VOICES.find((v) => v.id === voiceId)?.gender;
}

// Cache the chosen browser voice per gender so it stays consistent within a
// session — without this every utterance could pick a different SpeechSynthesis
// voice and the candidate would hear different speakers across questions.
let cachedBrowserVoice: { gender?: string; voice: SpeechSynthesisVoice } | null = null;

function pickBrowserVoice(gender?: "Nữ" | "Nam"): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  if (cachedBrowserVoice && cachedBrowserVoice.gender === gender) return cachedBrowserVoice.voice;
  const all = speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
  if (all.length === 0) return null;

  // Heuristics: browser voices don't expose gender — match on common names.
  const FEMALE = /samantha|victoria|karen|moira|kate|tessa|fiona|allison|ava|susan|female|zira|hazel|aria|jenny|sonia|nhung/i;
  const MALE = /daniel|alex|fred|tom|oliver|aaron|male|david|mark|guy|ryan|jacob|gordon|james/i;
  let pick: SpeechSynthesisVoice | undefined;
  if (gender === "Nữ") pick = all.find((v) => FEMALE.test(v.name));
  else if (gender === "Nam") pick = all.find((v) => MALE.test(v.name));
  if (!pick) {
    pick =
      all.find((v) => /Google US English|Microsoft Aria|Daniel|Samantha/i.test(v.name)) || all[0];
  }
  cachedBrowserVoice = { gender, voice: pick };
  return pick;
}

/**
 * Speak an examiner line during the Speaking section. Tries the Deepgram
 * proxy at /api/speaking/tts first — it sounds the most like a real IELTS
 * examiner. If the proxy is unavailable (DEEPGRAM_API_KEY missing on the
 * server, network error, etc.) we fall back to the browser's built-in
 * SpeechSynthesis so the candidate STILL hears the question. The promise
 * resolves once playback is finished or the fallback's voice stops.
 *
 * `audioRef` is mutated so callers can pause an in-flight Deepgram audio
 * tag when the phase changes (`audioRef.current.pause()`).
 */
/**
 * Examiner TTS via Web Audio (AudioContext + decodeAudioData). The previous
 * HTMLAudioElement approach was unreliable — Chrome / Safari sometimes
 * silently rejected `audio.play()` after the user-gesture context decayed
 * across async awaits, leaving the candidate with no audio at all.
 *
 * AudioContext is the recommended path for programmatic audio: resume() it
 * once under a user gesture and every subsequent BufferSource.start() works
 * without autoplay drama. If Web Audio playback genuinely fails we fall
 * back to SpeechSynthesis with a gender-matched browser voice so the
 * candidate ALWAYS hears something.
 */
let sharedAudioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudioCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    sharedAudioCtx = new Ctor();
  }
  return sharedAudioCtx;
}

/** MUST be called synchronously inside a user-gesture handler (Bắt đầu click).
 *  Resumes the AudioContext while the gesture is still hot — every later
 *  start() under this context then plays without autoplay rejection. */
export function primeAudioPlayback(): void {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().then(
      () => console.log("[tts] AudioContext resumed (state:", ctx.state, ")"),
      (e) => console.warn("[tts] AudioContext resume failed:", e),
    );
  }
  // Play one near-silent buffer so the page is unambiguously flagged as
  // user-initiated for HTMLAudioElement-based fallbacks too.
  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start(0);
  } catch (e) {
    console.warn("[tts] silent buffer prime failed:", e);
  }
}

/** Track the currently-playing source so we can stop it when the phase
 *  changes (effect cleanup pauses the examiner). */
let currentSource: AudioBufferSourceNode | null = null;

async function tryDeepgram(text: string, voice: string): Promise<void> {
  const ctx = getCtx();
  if (!ctx) throw new Error("AudioContext unavailable");
  if (ctx.state === "suspended") {
    await ctx.resume().catch(() => undefined);
  }

  const res = await fetch("/api/speaking/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`tts ${res.status} ${detail.slice(0, 200)}`);
  }
  const usedVoice = res.headers.get("X-Tts-Voice");
  if (usedVoice && usedVoice !== voice) {
    console.warn(`[tts] requested ${voice} but server fell back to ${usedVoice}`);
  }
  const arrayBuf = await res.arrayBuffer();
  console.log(`[tts] got ${arrayBuf.byteLength} bytes of MP3 from Deepgram`);

  // decodeAudioData wants a fresh ArrayBuffer it can detach — works in both
  // promise and callback forms; the modern promise form is universal now.
  const audioBuf = await ctx.decodeAudioData(arrayBuf.slice(0));

  // Stop any previous take.
  if (currentSource) {
    try {
      currentSource.stop();
    } catch {
      /* ignore */
    }
    currentSource = null;
  }

  const source = ctx.createBufferSource();
  source.buffer = audioBuf;
  source.connect(ctx.destination);
  currentSource = source;

  await new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      if (currentSource === source) currentSource = null;
      resolve();
    };
    source.onended = done;
    try {
      source.start(0);
      console.log(`[tts] playing ${audioBuf.duration.toFixed(2)}s via AudioContext`);
    } catch (e) {
      console.error("[tts] source.start failed:", e);
      done();
    }
  });
}

/** Stop whatever the examiner is currently saying — used by the phase-change
 *  cleanup so the old greeting / question doesn't keep playing into the next. */
function stopCurrent() {
  if (currentSource) {
    try {
      currentSource.stop();
    } catch {
      /* ignore */
    }
    currentSource = null;
  }
}

export async function playExaminerLine(
  text: string,
  voice: string,
  audioRef: { current: HTMLAudioElement | null },
): Promise<void> {
  // audioRef is kept in the signature for compatibility with the previous
  // pause-on-cleanup callers. We use a module-level source ref instead, so
  // intercept the audioRef "pause" semantics by surfacing stopCurrent.
  if (audioRef.current === null) {
    // Use the audioRef as a sentinel — overwrite with a stub that proxies
    // pause() to stopCurrent. That way existing callers (audioRef.current.pause())
    // still work without code changes.
    audioRef.current = {
      pause: stopCurrent,
    } as unknown as HTMLAudioElement;
  }

  const trimmed = text.trim();
  if (!trimmed) return;

  // 1) Deepgram via AudioContext — preferred when it works.
  try {
    await tryDeepgram(trimmed, voice);
    return;
  } catch (e) {
    console.warn("[playExaminerLine] Deepgram path failed, falling back to SpeechSynthesis:", e);
  }

  // 2) SpeechSynthesis fallback — guarantees the candidate hears SOMETHING.
  //    Same gender as the requested voice so it doesn't feel jarring.
  try {
    await speakText(trimmed, { rate: 0.95, gender: genderForVoiceId(voice) });
  } catch (e) {
    console.error("[playExaminerLine] SpeechSynthesis also failed — staying silent:", e);
  }
}

/** Kept for API compatibility — TTS path is no longer locked. No-op. */
export function resetTtsPathLock() {
  /* no-op */
}

/** Stop any in-flight examiner audio: pause the Deepgram tag + cancel SpeechSynthesis. */
export function stopExaminerLine(audioRef: { current: HTMLAudioElement | null }) {
  if (audioRef.current) {
    try {
      audioRef.current.pause();
    } catch {
      /* ignore */
    }
    audioRef.current = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}

export function speakText(text: string, opts: TTSOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      reject(new Error("Speech synthesis not supported"));
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = opts.lang ?? "en-US";
    utter.rate = opts.rate ?? 0.95;
    utter.pitch = opts.pitch ?? 1.0;
    utter.volume = opts.volume ?? 1.0;
    if (opts.voiceName) {
      const v = speechSynthesis.getVoices().find((x) => x.name === opts.voiceName);
      if (v) utter.voice = v;
    } else {
      const preferred = pickBrowserVoice(opts.gender);
      if (preferred) utter.voice = preferred;
    }
    utter.onend = () => resolve();
    utter.onerror = (e) => reject(e);
    speechSynthesis.speak(utter);
  });
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    speechSynthesis.cancel();
  }
}

export function isTTSSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Short 880Hz beep using the Web Audio API. Signals to the candidate that
 * recording has begun (same affordance as luyennoi.com). Resolves after the
 * tone has fully faded so it can be `await`-ed before MediaRecorder.start().
 */
export async function playStartBeep(): Promise<void> {
  if (typeof window === "undefined") return;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.23);
    await new Promise((r) => setTimeout(r, 240));
  } finally {
    try {
      await ctx.close();
    } catch {
      /* ignore */
    }
  }
}

/** "Good morning/afternoon/evening" based on the candidate's local clock. */
export function timeOfDayGreeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** Speak with natural pacing — splits on punctuation, adds pauses. */
export async function speakWithPauses(text: string, opts: TTSOptions = {}): Promise<void> {
  const segments = text
    .split(/([.,!?:;])\s*/)
    .reduce<string[]>((acc, part, i, arr) => {
      if (/[.,!?:;]/.test(part)) {
        acc[acc.length - 1] += part;
      } else if (part.trim()) {
        acc.push(part.trim());
      }
      return acc;
    }, []);

  for (const seg of segments) {
    if (!seg) continue;
    await speakText(seg, opts);
    const pause = /[.!?]/.test(seg.slice(-1)) ? 600 : /[,;:]/.test(seg.slice(-1)) ? 250 : 100;
    await new Promise((r) => setTimeout(r, pause));
  }
}
