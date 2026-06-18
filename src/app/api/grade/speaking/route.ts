import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { gradeSpeakingGroq } from "@/lib/groq";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  setId: z.string(),
  part: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  topic: z.string(),
  questions: z.array(z.string()).default([]),
  cueCard: z.object({ topic: z.string(), points: z.array(z.string()) }).optional(),
  transcript: z.string(),
  lowConfidenceWords: z.array(z.string()).optional(),
  durationSec: z.number().min(0).optional(),
});

// Returned when we can't grade — empty/very short transcript or AI failure.
// User explicitly asked for 0.0 in these cases, not a courtesy 1.0.
function ungradeableResult(reason: string) {
  return {
    overallBand: 0.0,
    criteria: {
      fluencyCoherence: { band: 0, feedback: reason },
      lexicalResource: { band: 0, feedback: reason },
      grammaticalRange: { band: 0, feedback: reason },
      pronunciation: { band: 0, feedback: reason, note: "Không có dữ liệu để chấm." },
    },
    observations: [reason],
    corrections: [],
    pronunciationFixes: [],
    questionTips: [],
    usefulPhrases: [],
    collocations: [],
    phrasalVerbs: [],
    improvedSample: "",
    summary: reason,
  };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });

  const { setId, part, topic, questions, cueCard, transcript, lowConfidenceWords, durationSec } = parsed.data;
  const effectiveQuestions =
    part === 2 && cueCard ? [`Cue card: ${cueCard.topic}`, ...cueCard.points] : questions;

  // Model answers are written to the learner's target band so they study an
  // attainable, high-scoring example (not a fixed 7.5).
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { targetBand: true },
  });
  const targetBand = me?.targetBand ?? 6.5;

  // Short-circuit when there's nothing to grade — don't waste AI tokens.
  if (transcript.trim().length < 20) {
    const result = ungradeableResult("Không nghe được bài nói (transcript trống hoặc quá ngắn) — band 0.0.");
    await prisma.attempt.create({
      data: {
        userId: session.user.id,
        skill: "SPEAKING",
        refId: setId,
        rawAnswer: { part, transcript },
        score: 0,
        feedback: result as object,
        durationSec: durationSec ?? null,
      },
    });
    return NextResponse.json({ result });
  }

  try {
    const result = (await gradeSpeakingGroq({
      part,
      topic,
      questions: effectiveQuestions,
      transcript,
      lowConfidenceWords,
      targetBand,
    })) as { overallBand: number };

    const score = Number.isFinite(result.overallBand) && result.overallBand >= 0 ? result.overallBand : 0;

    await prisma.attempt.create({
      data: {
        userId: session.user.id,
        skill: "SPEAKING",
        refId: setId,
        rawAnswer: { part, transcript },
        score,
        feedback: result as object,
        durationSec: durationSec ?? null,
      },
    });
    await recordActivity(session.user.id, { xpGain: 50 });
    return NextResponse.json({ result });
  } catch (e) {
    console.error("[grade/speaking]", e);
    const result = ungradeableResult("AI không chấm được — band 0.0.");
    await prisma.attempt.create({
      data: {
        userId: session.user.id,
        skill: "SPEAKING",
        refId: setId,
        rawAnswer: { part, transcript },
        score: 0,
        feedback: result as object,
        durationSec: durationSec ?? null,
      },
    });
    return NextResponse.json({ result });
  }
}

export const maxDuration = 60;
