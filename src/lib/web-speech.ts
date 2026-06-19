"use client";

/**
 * Thin wrapper over the browser's Web Speech API SpeechRecognition. Works in
 * Chrome / Edge / Safari without any server roundtrip — the OS does STT
 * directly. We use it ONLY for the live preview caption (instant, in-browser)
 * and as a FALLBACK when Deepgram can't be reached. The GRADED transcript is
 * always re-done by Deepgram on stop: the browser engine runs en-US and is
 * weak on accents + proper nouns, so grading on it produced the "I said one
 * thing, the caption shows another" complaint. Deepgram is the source of truth.
 */

type SRConstructor = new () => SpeechRecognition;

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  0: SpeechRecognitionAlternative;
  item(i: number): SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  length: number;
  item(i: number): SpeechRecognitionResult;
  [i: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((e: Event) => void) | null;
  onstart: ((e: Event) => void) | null;
}

function getSRCtor(): SRConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isWebSpeechSupported(): boolean {
  return getSRCtor() !== null;
}

export interface WebSpeechSession {
  /** Stop accumulating + abort the underlying recognizer. */
  stop(): void;
  /** Returns the final transcript collected so far. */
  getTranscript(): string;
}

/**
 * Start a Web Speech session. `onInterim` fires with the running transcript
 * (final + in-progress text) every time the recognizer updates so the UI can
 * show live captions. Resolves the session immediately.
 */
export function startWebSpeech(opts: {
  lang?: string;
  onInterim?: (text: string) => void;
  onError?: (error: string) => void;
}): WebSpeechSession | null {
  const Ctor = getSRCtor();
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.lang = opts.lang ?? "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let finalText = "";
  let stopped = false;

  recognition.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      const t = r[0]?.transcript ?? "";
      if (r.isFinal) {
        finalText += (finalText && !finalText.endsWith(" ") ? " " : "") + t.trim();
      } else {
        interim += t;
      }
    }
    if (opts.onInterim) {
      const live = (finalText + " " + interim).trim();
      opts.onInterim(live);
    }
  };
  recognition.onerror = (e) => {
    console.warn("[web-speech] error:", e.error, e.message);
    if (opts.onError) opts.onError(e.error);
  };
  // Chrome ends the session after a long silence — restart it until the
  // caller stops explicitly, so a slow speaker doesn't lose the recogniser
  // mid-answer.
  recognition.onend = () => {
    if (stopped) return;
    try {
      recognition.start();
    } catch {
      /* already running */
    }
  };

  try {
    recognition.start();
  } catch (e) {
    console.warn("[web-speech] start failed:", e);
    return null;
  }

  return {
    stop() {
      stopped = true;
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
    },
    getTranscript() {
      return finalText.trim();
    },
  };
}
