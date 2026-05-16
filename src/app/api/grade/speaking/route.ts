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
  transcript: z.string().min(20),
  lowConfidenceWords: z.array(z.string()).optional(),
  durationSec: z.number().min(0).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });

  const { setId, part, topic, questions, cueCard, transcript, lowConfidenceWords, durationSec } = parsed.data;
  const effectiveQuestions =
    part === 2 && cueCard ? [`Cue card: ${cueCard.topic}`, ...cueCard.points] : questions;

  try {
    const result = (await gradeSpeakingGroq({
      part,
      topic,
      questions: effectiveQuestions,
      transcript,
      lowConfidenceWords,
    })) as { overallBand: number };

    await prisma.attempt.create({
      data: {
        userId: session.user.id,
        skill: "SPEAKING",
        refId: setId,
        rawAnswer: { part, transcript },
        score: result.overallBand,
        feedback: result as object,
        durationSec: durationSec ?? null,
      },
    });
    await recordActivity(session.user.id, { xpGain: 50 });
    return NextResponse.json({ result });
  } catch (e) {
    console.error("[grade/speaking]", e);
    return NextResponse.json({ error: "AI chấm bài thất bại" }, { status: 500 });
  }
}

export const maxDuration = 60;
