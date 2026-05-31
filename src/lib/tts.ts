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
export async function playExaminerLine(
  text: string,
  voice: string,
  audioRef: { current: HTMLAudioElement | null },
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  // ---- Path 1: Deepgram TTS proxy ----
  try {
    const res = await fetch("/api/speaking/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed, voice }),
    });
    if (!res.ok) throw new Error(`tts ${res.status}`);
    const url = URL.createObjectURL(await res.blob());
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(url);
    audioRef.current = audio;
    await new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onended = done;
      audio.onerror = done;
      // Resolve on pause too — caller may pause via audioRef.current.pause()
      // when the phase changes; without this the promise hangs forever and
      // the auto-record flow would never reach the countdown.
      audio.onpause = () => {
        if (audio.ended || audio.currentTime === 0) return;
        // Treat user-triggered pause as cancellation.
        done();
      };
      audio.play().catch(done);
    });
    return;
  } catch (e) {
    console.warn("[playExaminerLine] Deepgram failed, falling back to SpeechSynthesis:", e);
  }

  // ---- Path 2: browser SpeechSynthesis fallback (gender-matched) ----
  try {
    await speakText(trimmed, { rate: 0.95, gender: genderForVoiceId(voice) });
  } catch (e) {
    console.warn("[playExaminerLine] SpeechSynthesis also failed:", e);
  }
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
