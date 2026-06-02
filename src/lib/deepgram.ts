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

/** Map a recording mime-type to a filename extension Whisper / Groq accept.
 *  The recorder produces webm in Chrome/Firefox and mp4 in Safari; both are
 *  fine for Groq Whisper as long as we attach the correct extension. */
function extForCt(ct: string): string {
  const lc = ct.toLowerCase();
  if (lc.includes("webm")) return "webm";
  if (lc.includes("ogg")) return "ogg";
  if (lc.includes("mp4") || lc.includes("m4a")) return "m4a";
  if (lc.includes("wav")) return "wav";
  if (lc.includes("mp3") || lc.includes("mpeg")) return "mp3";
  return "webm";
}

/** Fallback transcription via Groq Whisper-large-v3-turbo. Groq doesn't return
 *  per-word confidence, so we synthesise a flat 0.9 score for every token —
 *  enough for the player's downstream "low-confidence underlined word"
 *  feature to leave them all unhighlighted, which is the safest default. */
async function groqWhisperTranscribe(audio: ArrayBuffer, contentType: string): Promise<DGTranscript> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error("GROQ_API_KEY not set");

  const ext = extForCt(contentType || "audio/webm");
  const filename = `recording.${ext}`;
  const blob = new Blob([audio], { type: contentType || `audio/${ext}` });

  const form = new FormData();
  form.append("file", blob, filename);
  form.append("model", "whisper-large-v3-turbo");
  form.append("language", "en");
  form.append("response_format", "verbose_json");
  form.append("temperature", "0");

  console.log(`[groq-stt] POST whisper bytes=${audio.byteLength} ext=${ext}`);
  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${groqKey}` },
    body: form,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Groq Whisper ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    text?: string;
    words?: { word: string }[];
    segments?: { text: string; words?: { word: string }[] }[];
  };
  const transcript = (data.text ?? "").trim();
  // Prefer top-level `words`; fall back to flattening per-segment words; if
  // both are absent (Groq sometimes returns segments only), tokenise the
  // transcript ourselves so the player still gets a `words` array to map.
  const tokens =
    data.words?.map((w) => w.word) ??
    data.segments?.flatMap((s) => s.words?.map((w) => w.word) ?? s.text.trim().split(/\s+/)) ??
    transcript.split(/\s+/).filter(Boolean);
  console.log(`[groq-stt] success chars=${transcript.length} tokens=${tokens.length}`);
  return {
    transcript,
    words: tokens.map((w) => ({ word: w, confidence: 0.9 })),
  };
}

/** Transcribe an audio buffer. Tries Deepgram nova-2 first; on auth/network
 *  failure (or empty result) falls through to Groq Whisper so a missing
 *  DEEPGRAM_API_KEY can't take the whole Speaking feature down. */
export async function deepgramTranscribe(audio: ArrayBuffer, contentType: string): Promise<DGTranscript> {
  // Deepgram first — gives us per-word confidence, which the UI uses to
  // underline mispronounced words. Only one model: nova-2 → nova-3 was a
  // pointless retry when both share the same auth token (a 401 stays 401).
  const dgKey = process.env.DEEPGRAM_API_KEY;
  if (dgKey) {
    const url = `${DG_LISTEN}?model=nova-2&language=en&punctuate=true&smart_format=true`;
    const ct = contentType || "audio/webm";
    console.log(`[deepgram-stt] POST nova-2 content-type=${ct} bytes=${audio.byteLength}`);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Token ${dgKey}`, "Content-Type": ct },
        body: audio,
      });
      if (res.ok) {
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
        const transcript = (alt?.transcript ?? "").trim();
        const words = (alt?.words ?? []).map((w) => ({ word: w.word, confidence: w.confidence }));
        console.log(
          `[deepgram-stt] success chars=${transcript.length} words=${words.length}`,
        );
        if (transcript) return { transcript, words };
        console.warn("[deepgram-stt] empty transcript — falling back to Groq Whisper");
      } else {
        const txt = await res.text();
        console.error(`[deepgram-stt] ${res.status}: ${txt.slice(0, 300)} — falling back to Groq Whisper`);
      }
    } catch (e) {
      console.error(`[deepgram-stt] threw:`, e instanceof Error ? e.message : e);
    }
  } else {
    console.warn("[deepgram-stt] DEEPGRAM_API_KEY not set — using Groq Whisper directly");
  }

  // Groq Whisper fallback — same audio bytes, no extra fetch from the client.
  return groqWhisperTranscribe(audio, contentType);
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
