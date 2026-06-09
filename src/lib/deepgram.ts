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

/** Extract content words (>=3 chars, not stopwords) for STT priming. We use
 *  these as Deepgram `keywords` + Whisper `prompt` so the recogniser knows
 *  what vocabulary to expect. Mild bias only — we DON'T force exact match
 *  or the model would hallucinate the expected text and the scoring becomes
 *  meaningless. */
const STT_STOPWORDS = new Set([
  "the", "and", "for", "but", "you", "are", "was", "with", "his", "her",
  "she", "him", "all", "any", "can", "had", "has", "have", "let", "not",
  "one", "our", "out", "she", "that", "their", "this", "what", "when",
  "where", "which", "who", "will", "your", "from", "they", "them", "were",
  "been", "being", "than", "then", "into", "just", "like", "some", "such",
  "very", "well", "also", "more", "most", "much", "only", "over", "under",
]);
function extractPrimingKeywords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z' ]/g, " ")
        .split(/\s+/)
        .map((w) => w.replace(/^'+|'+$/g, ""))
        .filter((w) => w.length >= 3 && !STT_STOPWORDS.has(w)),
    ),
  ).slice(0, 40);
}

/** Fallback transcription via Groq Whisper-large-v3-turbo. Groq doesn't return
 *  per-word confidence, so we synthesise a flat 0.9 score for every token —
 *  enough for the player's downstream "low-confidence underlined word"
 *  feature to leave them all unhighlighted, which is the safest default. */
async function groqWhisperTranscribe(
  audio: ArrayBuffer,
  contentType: string,
  primingKeywords: string[] = [],
): Promise<DGTranscript> {
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
  // Whisper "prompt" primes the decoder with vocabulary it should expect.
  // Pass ONLY the content-word list (no surrounding sentence) — feeding the
  // literal expected sentence causes hallucination where Whisper echoes the
  // prompt even for silence. A 40-word vocab hint is enough.
  if (primingKeywords.length > 0) {
    form.append("prompt", `Vocabulary: ${primingKeywords.join(", ")}.`);
  }

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
 *  DEEPGRAM_API_KEY can't take the whole Speaking feature down.
 *
 *  `expectedText` (optional) is the target sentence the user is shadowing.
 *  When provided we extract content words and pass them as Deepgram
 *  `keywords` (intensifier 2 — mild) and as Whisper `prompt` so the
 *  recogniser has a vocabulary hint. This typically halves word-error rate
 *  on 3-10s shadowing clips. Soft bias only — wrong pronunciation still
 *  shows up as wrong in the transcript. */
export async function deepgramTranscribe(
  audio: ArrayBuffer,
  contentType: string,
  expectedText?: string,
): Promise<DGTranscript> {
  const primingKeywords = expectedText ? extractPrimingKeywords(expectedText) : [];
  // Deepgram first — gives us per-word confidence, which the UI uses to
  // underline mispronounced words. Only one model: nova-2 → nova-3 was a
  // pointless retry when both share the same auth token (a 401 stays 401).
  const dgKey = process.env.DEEPGRAM_API_KEY;
  if (dgKey) {
    const params = new URLSearchParams({
      model: "nova-2",
      language: "en",
      punctuate: "true",
      smart_format: "true",
    });
    // Deepgram `keywords=word:intensifier` boosts the model's prior on
    // these tokens. Intensifier 2 = mild (range is 1-10). Higher than 3-4
    // starts causing false positives where the model "hears" the keyword
    // even when the user said something else — bad for accurate scoring.
    for (const w of primingKeywords) {
      params.append("keywords", `${w}:2`);
    }
    const url = `${DG_LISTEN}?${params.toString()}`;
    const ct = contentType || "audio/webm";
    console.log(
      `[deepgram-stt] POST nova-2 content-type=${ct} bytes=${audio.byteLength} keywords=${primingKeywords.length}`,
    );
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
  return groqWhisperTranscribe(audio, contentType, primingKeywords);
}

/** One sentence-shaped chunk with audio timestamps, used by the Shadowing
 *  audio-fallback path. start/end are seconds (float). */
export interface DGUtterance {
  start: number;
  end: number;
  text: string;
}

export interface DGTranscriptWithTimings {
  utterances: DGUtterance[];
  source: "deepgram" | "groq-whisper";
}

/** Synthesize even-duration utterances over the audio's whole length when
 *  the STT provider returns text but no segment boundaries. Without this,
 *  we'd push {start:0, end:0} for the whole transcript and the merger
 *  would collapse every shadowing segment to a 0.5s window at t=0 — every
 *  segment in the lesson would show up as "starts at second 0", utterly
 *  unusable. Splits on sentence boundaries; if none, on punctuation; if
 *  none, on word count. */
function distributeFlatTranscript(
  text: string,
  totalDurationSec: number,
): DGUtterance[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (!totalDurationSec || totalDurationSec <= 0) totalDurationSec = 60;
  // Sentence-shaped chunks: split on punctuation, then group word-wise so
  // each chunk lands roughly 6-12 seconds at typical English speech rate
  // (~2.5 wps).
  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const buckets: string[] = [];
  let cur: string[] = [];
  let curWords = 0;
  const TARGET_WORDS = 22; // ~8-9s at 2.5 wps
  for (const sent of sentences) {
    const w = sent.split(/\s+/).length;
    cur.push(sent);
    curWords += w;
    if (curWords >= TARGET_WORDS) {
      buckets.push(cur.join(" "));
      cur = [];
      curWords = 0;
    }
  }
  if (cur.length) buckets.push(cur.join(" "));
  if (buckets.length === 0) buckets.push(clean);
  // Allocate time proportional to each bucket's word count.
  const wordCounts = buckets.map((b) => b.split(/\s+/).length);
  const totalWords = wordCounts.reduce((a, b) => a + b, 0) || 1;
  let t = 0;
  return buckets.map((b, i) => {
    const share = wordCounts[i] / totalWords;
    const dur = totalDurationSec * share;
    const start = t;
    const end = i === buckets.length - 1 ? totalDurationSec : t + dur;
    t = end;
    return { start, end, text: b };
  });
}

/** Groq Whisper fallback for the timings path. verbose_json includes a
 *  `segments` array with start/end seconds — close enough to Deepgram
 *  utterances for our shadowing chunking. */
async function groqWhisperTranscribeWithTimings(
  audio: ArrayBuffer,
  contentType: string,
  fallbackDurationSec: number,
): Promise<DGTranscriptWithTimings> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error("GROQ_API_KEY not set");

  const ext = extForCt(contentType || "audio/webm");
  const filename = `audio.${ext}`;
  const blob = new Blob([audio], { type: contentType || `audio/${ext}` });

  const form = new FormData();
  form.append("file", blob, filename);
  form.append("model", "whisper-large-v3-turbo");
  form.append("language", "en");
  form.append("response_format", "verbose_json");
  form.append("temperature", "0");

  console.log(`[groq-stt-timings] POST whisper bytes=${audio.byteLength} ext=${ext}`);
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
    segments?: { start: number; end: number; text: string }[];
  };
  const utterances: DGUtterance[] = (data.segments ?? [])
    .filter((s) => s && typeof s.start === "number" && typeof s.end === "number")
    .map((s) => ({
      start: s.start,
      end: s.end,
      text: (s.text ?? "").trim(),
    }))
    .filter((u) => u.text.length > 0);

  if (utterances.length === 0 && data.text) {
    // No segments returned — distribute the flat transcript across the
    // known audio duration so we don't collapse every segment to t=0.
    console.warn(
      `[groq-stt-timings] no segments — distributing ${data.text.length} chars across ${fallbackDurationSec}s`,
    );
    return {
      utterances: distributeFlatTranscript(data.text, fallbackDurationSec),
      source: "groq-whisper",
    };
  }

  console.log(`[groq-stt-timings] success utterances=${utterances.length}`);
  return { utterances, source: "groq-whisper" };
}

/** Transcribe audio with per-utterance timestamps suitable for breaking
 *  into shadowing segments. Tries Deepgram nova-2 with utterances + smart
 *  format; falls back to Groq Whisper segments on any error. `audioDurationSec`
 *  is needed for the Groq no-segments edge case — pass 0 if unknown. */
export async function deepgramTranscribeWithTimings(
  audio: ArrayBuffer,
  contentType: string,
  audioDurationSec: number = 0,
): Promise<DGTranscriptWithTimings> {
  const dgKey = process.env.DEEPGRAM_API_KEY;
  if (dgKey) {
    // utterances=true gives sentence-shaped chunks; utt_split=1.2 means
    // "split on pauses >=1.2s" — empirically yields 5-15s clips, close
    // to our shadowing target before our merger trims further.
    const params = new URLSearchParams({
      model: "nova-2",
      language: "en",
      smart_format: "true",
      utterances: "true",
      utt_split: "1.2",
    });
    const url = `${DG_LISTEN}?${params.toString()}`;
    const ct = contentType || "audio/webm";
    console.log(
      `[deepgram-timings] POST nova-2 utterances=true content-type=${ct} bytes=${audio.byteLength}`,
    );
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Token ${dgKey}`, "Content-Type": ct },
        body: audio,
      });
      if (res.ok) {
        const data = (await res.json()) as {
          results?: {
            utterances?: { start: number; end: number; transcript: string }[];
          };
        };
        const utterances: DGUtterance[] = (data.results?.utterances ?? [])
          .filter((u) => u && typeof u.start === "number" && typeof u.end === "number")
          .map((u) => ({
            start: u.start,
            end: u.end,
            text: (u.transcript ?? "").trim(),
          }))
          .filter((u) => u.text.length > 0);
        console.log(`[deepgram-timings] success utterances=${utterances.length}`);
        if (utterances.length > 0) {
          return { utterances, source: "deepgram" };
        }
        console.warn("[deepgram-timings] no utterances — falling back to Groq Whisper");
      } else {
        // Loud log for auth / rate-limit problems so an admin staring at a
        // "AI nghe (groq-whisper)" lesson knows WHY Deepgram was skipped.
        if (res.status === 401) {
          console.error(
            "[deepgram-timings] 401 — DEEPGRAM_API_KEY rejected. Check the key in Railway env.",
          );
        } else if (res.status === 429) {
          console.error(
            "[deepgram-timings] 429 — Deepgram rate-limited. Falling back to Groq.",
          );
        }
        const txt = await res.text();
        console.error(
          `[deepgram-timings] ${res.status}: ${txt.slice(0, 300)} — falling back to Groq Whisper`,
        );
      }
    } catch (e) {
      console.error(`[deepgram-timings] threw:`, e instanceof Error ? e.message : e);
    }
  } else {
    console.warn("[deepgram-timings] DEEPGRAM_API_KEY not set — using Groq Whisper directly");
  }

  return groqWhisperTranscribeWithTimings(audio, contentType, audioDurationSec);
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
