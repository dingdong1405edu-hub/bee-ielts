/**
 * Deepgram helpers — speech-to-text (transcription with word confidence) and
 * text-to-speech (Aura voices). The API key stays server-side.
 */

const DG_LISTEN = "https://api.deepgram.com/v1/listen";
const DG_SPEAK = "https://api.deepgram.com/v1/speak";
const TTS_MODEL = "aura-asteria-en";
const STT_MODEL = "nova-2";

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

/** Transcribe an audio buffer. Returns the transcript and per-word confidence. */
export async function deepgramTranscribe(audio: ArrayBuffer, contentType: string): Promise<DGTranscript> {
  const url = `${DG_LISTEN}?model=${STT_MODEL}&language=en&punctuate=true&smart_format=true`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Token ${key()}`, "Content-Type": contentType || "audio/webm" },
    body: audio,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Deepgram STT ${res.status}: ${txt.slice(0, 200)}`);
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
  return {
    transcript: alt?.transcript ?? "",
    words: (alt?.words ?? []).map((w) => ({ word: w.word, confidence: w.confidence })),
  };
}

/** Synthesize speech for `text`. Returns MP3 audio bytes. */
export async function deepgramSpeak(text: string): Promise<ArrayBuffer> {
  const clean = text.slice(0, 1800);
  const url = `${DG_SPEAK}?model=${TTS_MODEL}&encoding=mp3`;
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
