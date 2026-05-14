"use client";

export interface TTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceName?: string;
  lang?: string;
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
