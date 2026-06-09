import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { deepgramTranscribe } from "@/lib/deepgram";

/**
 * Score a shadowing attempt. The client POSTs raw audio bytes; query
 * params carry segmentId so we can look up the expected sentence and
 * compute a word-match score without trusting client-side data.
 *
 * Score model: bag-of-words match between the STT transcript and the
 * segment's textEn, ignoring punctuation + casing AFTER expanding
 * contractions and normalising numbers. Returns
 * { transcript, score, expected, missingWords, extraWords } so the
 * UI can show diff-style feedback. Persists a ShadowingAttempt row.
 */

/** Common English contractions → expanded form. Applied to BOTH the heard
 *  transcript and the expected text before tokenising so `"don't"` and
 *  `"do not"` count as a match. Without this, the bag-of-words scorer
 *  was punishing learners whose pronunciation matched but whose word
 *  count diverged on contractions. */
const CONTRACTIONS: Array<[RegExp, string]> = [
  // pronoun + verb
  [/\bi'm\b/gi, "i am"],
  [/\bi've\b/gi, "i have"],
  [/\bi'd\b/gi, "i would"],
  [/\bi'll\b/gi, "i will"],
  [/\byou're\b/gi, "you are"],
  [/\byou've\b/gi, "you have"],
  [/\byou'd\b/gi, "you would"],
  [/\byou'll\b/gi, "you will"],
  [/\bhe's\b/gi, "he is"],
  [/\bhe'd\b/gi, "he would"],
  [/\bhe'll\b/gi, "he will"],
  [/\bshe's\b/gi, "she is"],
  [/\bshe'd\b/gi, "she would"],
  [/\bshe'll\b/gi, "she will"],
  [/\bit's\b/gi, "it is"],
  [/\bit'd\b/gi, "it would"],
  [/\bit'll\b/gi, "it will"],
  [/\bwe're\b/gi, "we are"],
  [/\bwe've\b/gi, "we have"],
  [/\bwe'd\b/gi, "we would"],
  [/\bwe'll\b/gi, "we will"],
  [/\bthey're\b/gi, "they are"],
  [/\bthey've\b/gi, "they have"],
  [/\bthey'd\b/gi, "they would"],
  [/\bthey'll\b/gi, "they will"],
  [/\bthere's\b/gi, "there is"],
  [/\bthere're\b/gi, "there are"],
  [/\bhere's\b/gi, "here is"],
  [/\bwhat's\b/gi, "what is"],
  [/\bwho's\b/gi, "who is"],
  [/\bthat's\b/gi, "that is"],
  [/\blet's\b/gi, "let us"],
  // negations
  [/\bdon't\b/gi, "do not"],
  [/\bdoesn't\b/gi, "does not"],
  [/\bdidn't\b/gi, "did not"],
  [/\bisn't\b/gi, "is not"],
  [/\baren't\b/gi, "are not"],
  [/\bwasn't\b/gi, "was not"],
  [/\bweren't\b/gi, "were not"],
  [/\bhasn't\b/gi, "has not"],
  [/\bhaven't\b/gi, "have not"],
  [/\bhadn't\b/gi, "had not"],
  [/\bcan't\b/gi, "cannot"],
  [/\bcannot\b/gi, "can not"],
  [/\bcouldn't\b/gi, "could not"],
  [/\bshouldn't\b/gi, "should not"],
  [/\bwouldn't\b/gi, "would not"],
  [/\bwon't\b/gi, "will not"],
  [/\bmustn't\b/gi, "must not"],
  [/\bmightn't\b/gi, "might not"],
  // informal / spoken
  [/\bgonna\b/gi, "going to"],
  [/\bwanna\b/gi, "want to"],
  [/\bgotta\b/gi, "got to"],
  [/\blemme\b/gi, "let me"],
  [/\bgimme\b/gi, "give me"],
  [/\b'cause\b/gi, "because"],
  [/\b'em\b/gi, "them"],
];

/** Single-digit / small-number → word mapping. Deepgram's smart_format
 *  often outputs "5" while the segment text says "five" (or vice-versa);
 *  both forms should count as the same word. */
const NUMBER_WORDS: Record<string, string> = {
  "0": "zero",
  "1": "one",
  "2": "two",
  "3": "three",
  "4": "four",
  "5": "five",
  "6": "six",
  "7": "seven",
  "8": "eight",
  "9": "nine",
  "10": "ten",
  "11": "eleven",
  "12": "twelve",
  "13": "thirteen",
  "14": "fourteen",
  "15": "fifteen",
  "16": "sixteen",
  "17": "seventeen",
  "18": "eighteen",
  "19": "nineteen",
  "20": "twenty",
};

/** Filler tokens (often emitted by Whisper) we strip from the HEARD list
 *  so they don't show up as "extra words" in the diff feedback. The bag-of-
 *  words score doesn't penalise extras anyway, but the UI display gets
 *  much cleaner. */
const FILLERS = new Set([
  "uh", "um", "uhm", "umm", "uhh", "ah", "ahh", "er", "erm",
  "hmm", "mhm", "mhmm", "uhhuh", "huh",
]);

const PUNCT_RE = /[.,!?;:'"\-()[\]"'""…—–]/g;

function expandContractions(text: string): string {
  let out = text;
  for (const [re, replacement] of CONTRACTIONS) out = out.replace(re, replacement);
  return out;
}

function normalizeWords(text: string, dropFillers: boolean): string[] {
  const expanded = expandContractions(text);
  const words = expanded
    .toLowerCase()
    .replace(PUNCT_RE, " ")
    .split(/\s+/)
    .filter(Boolean);
  // Convert any pure-digit token within range to its word form. Keeps
  // longer numbers / years (e.g. "1999") as-is — those are usually said
  // as multi-word constructs anyway and the scorer handles them weakly.
  const normalized = words.map((w) => NUMBER_WORDS[w] ?? w);
  return dropFillers ? normalized.filter((w) => !FILLERS.has(w)) : normalized;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const segmentId = url.searchParams.get("segmentId");
  if (!segmentId) {
    return NextResponse.json({ error: "Thiếu segmentId" }, { status: 400 });
  }
  const segment = await prisma.shadowingSegment.findUnique({
    where: { id: segmentId },
    select: { id: true, textEn: true, lessonId: true },
  });
  if (!segment) {
    return NextResponse.json({ error: "Segment không tồn tại" }, { status: 404 });
  }

  const rawCt = req.headers.get("content-type") || "audio/webm";
  const audio = await req.arrayBuffer();
  if (audio.byteLength < 1000) {
    return NextResponse.json({ error: "Bản ghi quá ngắn" }, { status: 400 });
  }
  if (audio.byteLength > 12_000_000) {
    return NextResponse.json({ error: "Bản ghi quá lớn" }, { status: 413 });
  }

  let transcript = "";
  try {
    // preferFast=true → Groq Whisper turbo first (~300-800ms vs Deepgram
    // 500-2000ms). The shadowing score doesn't use per-word confidence,
    // so we trade nothing for the speed win. Deepgram is the fallback.
    // expectedText primes either provider for ~50% WER reduction on
    // short shadowing clips.
    const t0 = Date.now();
    const result = await deepgramTranscribe(audio, rawCt, segment.textEn, true);
    transcript = result.transcript || "";
    console.log(`[shadowing/score] STT done in ${Date.now() - t0}ms`);
  } catch (e) {
    console.error("[shadowing/score]", e);
    return NextResponse.json(
      { error: "Nhận dạng giọng nói tạm thời gián đoạn. Hãy thử lại." },
      { status: 502 },
    );
  }

  const expectedWords = normalizeWords(segment.textEn, false);
  const heardWords = normalizeWords(transcript, true);

  // Bag-of-words match — every expected word counts once, marked
  // satisfied the first time it appears in the heard sequence. This
  // tolerates filler/order changes while still penalising skipped
  // content.
  const heardCount = new Map<string, number>();
  for (const w of heardWords) heardCount.set(w, (heardCount.get(w) ?? 0) + 1);

  let matched = 0;
  const missingWords: string[] = [];
  for (const w of expectedWords) {
    const left = heardCount.get(w) ?? 0;
    if (left > 0) {
      heardCount.set(w, left - 1);
      matched++;
    } else {
      missingWords.push(w);
    }
  }
  const extraWords: string[] = [];
  for (const [w, n] of heardCount) {
    for (let i = 0; i < n; i++) extraWords.push(w);
  }
  const score = expectedWords.length === 0
    ? 0
    : Math.round((matched / expectedWords.length) * 100);

  await prisma.shadowingAttempt.create({
    data: {
      userId: session.user.id,
      lessonId: segment.lessonId,
      segmentId: segment.id,
      transcript,
      score,
    },
  });

  return NextResponse.json({
    transcript,
    expected: segment.textEn,
    score,
    matched,
    total: expectedWords.length,
    missingWords,
    extraWords,
  });
}

export const maxDuration = 60;
