"use client";

export interface TTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceName?: string;
  lang?: string;
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
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.play().catch(() => {
        URL.revokeObjectURL(url);
        resolve();
      });
    });
    return;
  } catch (e) {
    console.warn("[playExaminerLine] Deepgram failed, falling back to SpeechSynthesis:", e);
  }

  // ---- Path 2: browser SpeechSynthesis fallback ----
  try {
    await speakText(trimmed, { rate: 0.95 });
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
      const voices = speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
      const preferred =
        voices.find((v) => /Google US English|Microsoft Aria|Daniel|Samantha/i.test(v.name)) ||
        voices[0];
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
