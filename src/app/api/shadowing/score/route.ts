import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { deepgramTranscribe } from "@/lib/deepgram";

/**
 * Score a shadowing attempt. The client POSTs raw audio bytes; query
 * params carry segmentId so we can look up the expected sentence and
 * compute a word-match score without trusting client-side data.
 *
 * Score model: bag-of-words match between Whisper transcript and
 * the segment's textEn, ignoring punctuation + casing. Returns
 * { transcript, score, expected, missingWords, extraWords } so the
 * UI can show diff-style feedback. Persists a ShadowingAttempt row.
 */
const PUNCT_RE = /[.,!?;:'"\-()[\]"'""]/g;

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(PUNCT_RE, " ")
    .split(/\s+/)
    .filter(Boolean);
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
    const result = await deepgramTranscribe(audio, rawCt);
    transcript = result.transcript || "";
  } catch (e) {
    console.error("[shadowing/score]", e);
    return NextResponse.json(
      { error: "Nhận dạng giọng nói tạm thời gián đoạn. Hãy thử lại." },
      { status: 502 },
    );
  }

  const expectedWords = normalizeWords(segment.textEn);
  const heardWords = normalizeWords(transcript);

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
