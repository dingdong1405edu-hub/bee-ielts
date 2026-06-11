import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { gradeSpeakingGroq } from "@/lib/groq";
import { recordActivity } from "@/lib/activity";

const answerSchema = z.object({
  question: z.string().min(1),
  transcript: z.string(),
  lowConfidenceWords: z.array(z.string()).optional(),
});

const schema = z.object({
  quizId: z.string(),
  // Vượt-band quiz title — surfaced as the "topic" for the IELTS grader.
  topic: z.string().default("Vượt band — Speaking quiz"),
  answers: z.array(answerSchema).min(1),
  durationSec: z.number().min(0).optional(),
});

function ungradeable(reason: string) {
  return {
    overallBand: 0,
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

/**
 * End-of-quiz aggregate grader for Vượt-band SPEAKING quizzes. Concatenates
 * every recorded answer into a single transcript chunked by question, hands
 * the whole thing to the same IELTS examiner prompt the Speaking practice
 * page uses, and persists an Attempt so the user can revisit the review
 * later (parallel to a normal /speaking attempt).
 *
 * Behaviour mirrors /api/grade/speaking — single transcript, single grade,
 * one Attempt row — so the user's "y chang speaking luyện tập" requirement
 * is met without forking the grading pipeline.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad input" }, { status: 400 });
  }

  const { quizId, topic, answers, durationSec } = parsed.data;

  // Join every per-question transcript into a single combined transcript with
  // explicit question markers so the IELTS grader can map per-question
  // feedback back to each prompt.
  const transcript = answers
    .map((a, i) => `Q${i + 1}: ${a.question}\nA${i + 1}: ${a.transcript || "(không nói)"}`)
    .join("\n\n");
  const questions = answers.map((a) => a.question);
  const lowConfidenceWords = Array.from(
    new Set(answers.flatMap((a) => a.lowConfidenceWords ?? [])),
  );
  const totalChars = answers.reduce((sum, a) => sum + a.transcript.trim().length, 0);

  if (totalChars < 20) {
    const result = ungradeable("Tổng câu trả lời quá ngắn — không đủ dữ liệu để chấm.");
    await prisma.attempt.create({
      data: {
        userId: session.user.id,
        skill: "SPEAKING",
        refId: quizId,
        rawAnswer: { part: 1, transcript, source: "band-climb-quiz", answers },
        score: 0,
        feedback: result as object,
        durationSec: durationSec ?? null,
      },
    });
    return NextResponse.json({ result });
  }

  try {
    const result = (await gradeSpeakingGroq({
      part: 1,
      topic,
      questions,
      transcript,
      lowConfidenceWords,
    })) as { overallBand: number };

    const score =
      Number.isFinite(result.overallBand) && result.overallBand >= 0 ? result.overallBand : 0;

    await prisma.attempt.create({
      data: {
        userId: session.user.id,
        skill: "SPEAKING",
        refId: quizId,
        rawAnswer: { part: 1, transcript, source: "band-climb-quiz", answers },
        score,
        feedback: result as object,
        durationSec: durationSec ?? null,
      },
    });
    const unlocked = await recordActivity(session.user.id, { xpGain: 50 });
    return NextResponse.json({ result, unlocked });
  } catch (e) {
    console.error("[grade/quiz-speaking-final]", e);
    const result = ungradeable("AI không chấm được — thử lại sau.");
    await prisma.attempt.create({
      data: {
        userId: session.user.id,
        skill: "SPEAKING",
        refId: quizId,
        rawAnswer: { part: 1, transcript, source: "band-climb-quiz", answers },
        score: 0,
        feedback: result as object,
        durationSec: durationSec ?? null,
      },
    });
    return NextResponse.json({ result });
  }
}

export const maxDuration = 90;
