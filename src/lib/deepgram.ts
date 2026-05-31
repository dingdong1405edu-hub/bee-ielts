/**
 * Deepgram helpers — speech-to-text (transcription with word confidence) and
 * text-to-speech (Aura voices). The API key stays server-side.
 */

import { DEFAULT_VOICE } from "./tts-voices";

const DG_LISTEN = "https://api.deepgram.com/v1/listen";
const DG_SPEAK = "https://api.deepgram.com/v1/speak";

function key(): string {
  const k = process.env.DEEPGRAM_API_KEY;
  if (!k) throw new Error("DEEPGRAM_API_KEY not set");
  return k;
}

export interface DGWord {
  word: string;
  confidence: number;
}

export interface DGTranscript {
  transcript: string;
  words: DGWord[];
}

/** Transcribe an audio buffer. Returns the transcript and per-word confidence.
 *  Tries nova-2 (battle-tested) → nova-3 (newer) so a transient model issue
 *  on one falls through to the other. */
export async function deepgramTranscribe(audio: ArrayBuffer, contentType: string): Promise<DGTranscript> {
  const models = ["nova-2", "nova-3"];
  let lastErr: Error | null = null;
  for (const model of models) {
    const url = `${DG_LISTEN}?model=${model}&language=en&punctuate=true&smart_format=true`;
    const ct = contentType || "audio/webm";
    console.log(`[deepgram-stt] POST model=${model} content-type=${ct} bytes=${audio.byteLength}`);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Token ${key()}`, "Content-Type": ct },
        body: audio,
      });
      if (!res.ok) {
        const txt = await res.text();
        lastErr = new Error(`Deepgram STT ${model} ${res.status}: ${txt.slice(0, 300)}`);
        console.error(`[deepgram-stt] ${model} returned ${res.status}: ${txt.slice(0, 300)}`);
        continue;
      }
      const data = (await res.json()) as {
        results?: {
          channels?: {
            alternatives?: {
              transcript?: string;
              words?: { word: string; confidence: number }[];
            }[];
          }[];
        };
      };
      const alt = data.results?.channels?.[0]?.alternatives?.[0];
      console.log(
        `[deepgram-stt] ${model} success — transcript chars=${(alt?.transcript ?? "").length}, words=${(alt?.words ?? []).length}`,
      );
      return {
        transcript: alt?.transcript ?? "",
        words: (alt?.words ?? []).map((w) => ({ word: w.word, confidence: w.confidence })),
      };
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      console.error(`[deepgram-stt] ${model} threw:`, lastErr.message);
    }
  }
  throw lastErr ?? new Error("Deepgram STT failed for all models");
}

/** Synthesize speech for `text` with the chosen Aura voice. Returns MP3 bytes. */
export async function deepgramSpeak(text: string, voice: string = DEFAULT_VOICE): Promise<ArrayBuffer> {
  const clean = text.slice(0, 1800);
  const url = `${DG_SPEAK}?model=${encodeURIComponent(voice)}&encoding=mp3`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Token ${key()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: clean }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Deepgram TTS ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.arrayBuffer();
}
