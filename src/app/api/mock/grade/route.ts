import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { gradeWriting, gradeSpeaking } from "@/lib/claude";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  listening: z.object({
    testId: z.string(),
    answers: z.record(z.string()),
    correctCount: z.number(),
    total: z.number(),
    durationSec: z.number().optional(),
  }),
  reading: z.object({
    testId: z.string(),
    answers: z.record(z.string()),
    correctCount: z.number(),
    total: z.number(),
    durationSec: z.number().optional(),
  }),
  writing1: z.object({ taskId: z.string(), essay: z.string(), durationSec: z.number().optional() }),
  writing2: z.object({ taskId: z.string(), essay: z.string(), durationSec: z.number().optional() }),
  speaking: z.object({
    setId: z.string(),
    topic: z.string(),
    transcripts: z.object({ "1": z.string(), "2": z.string(), "3": z.string() }),
    part1Questions: z.array(z.string()),
    part2CueCard: z.object({ topic: z.string(), points: z.array(z.string()) }),
    part3Questions: z.array(z.string()),
    durationSec: z.number().optional(),
  }),
});

function bandFromCorrect(correct: number, total: number) {
  // IELTS-like banding (loose approximation 0..9)
  const r = correct / total;
  if (r >= 0.95) return 9;
  if (r >= 0.88) return 8.5;
  if (r >= 0.80) return 8;
  if (r >= 0.72) return 7.5;
  if (r >= 0.64) return 7;
  if (r >= 0.56) return 6.5;
  if (r >= 0.48) return 6;
  if (r >= 0.40) return 5.5;
  if (r >= 0.32) return 5;
  if (r >= 0.24) return 4.5;
  return Math.max(3, r * 9);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });
  const userId = session.user.id;
  const m = parsed.data;

  const listeningBand = bandFromCorrect(m.listening.correctCount, m.listening.total);
  const readingBand = bandFromCorrect(m.reading.correctCount, m.reading.total);

  const [w1Task, w2Task, speakingSet] = await Promise.all([
    prisma.writingTask.findUnique({ where: { id: m.writing1.taskId } }),
    prisma.writingTask.findUnique({ where: { id: m.writing2.taskId } }),
    prisma.speakingSet.findUnique({ where: { id: m.speaking.setId } }),
  ]);

  let writing1Result: { overallBand: number } | null = null;
  let writing2Result: { overallBand: number } | null = null;
  let speakingResult: { overallBand: number } | null = null;
  const errors: string[] = [];

  try {
    if (w1Task && m.writing1.essay.trim().length >= 20) {
      writing1Result = (await gradeWriting({
        taskType: 1,
        prompt: w1Task.prompt,
        essay: m.writing1.essay,
      })) as { overallBand: number };
    }
  } catch (e) {
    console.error("[mock w1]", e);
    errors.push("Writing Task 1 chấm lỗi");
  }
  try {
    if (w2Task && m.writing2.essay.trim().length >= 20) {
      writing2Result = (await gradeWriting({
        taskType: 2,
        prompt: w2Task.prompt,
        essay: m.writing2.essay,
      })) as { overallBand: number };
    }
  } catch (e) {
    console.error("[mock w2]", e);
    errors.push("Writing Task 2 chấm lỗi");
  }

  const writingBand = writing1Result && writing2Result
    ? (writing1Result.overallBand + writing2Result.overallBand * 2) / 3 // task 2 weighted 2x as in real IELTS
    : (writing1Result?.overallBand ?? writing2Result?.overallBand ?? 0);

  // Combine 3 speaking parts into a single grade by joining transcripts
  try {
    if (speakingSet) {
      const combined = `[PART 1]\n${m.speaking.transcripts["1"]}\n\n[PART 2]\n${m.speaking.transcripts["2"]}\n\n[PART 3]\n${m.speaking.transcripts["3"]}`;
      if (combined.replace(/\[PART \d\]\n/g, "").trim().length >= 30) {
        speakingResult = (await gradeSpeaking({
          part: 1,
          topic: m.speaking.topic,
          questions: [
            ...m.speaking.part1Questions,
            `Cue: ${m.speaking.part2CueCard.topic}`,
            ...m.speaking.part2CueCard.points,
            ...m.speaking.part3Questions,
          ],
          transcript: combined,
        })) as { overallBand: number };
      }
    }
  } catch (e) {
    console.error("[mock speaking]", e);
    errors.push("Speaking chấm lỗi");
  }

  const overallBand = +((listeningBand + readingBand + writingBand + (speakingResult?.overallBand ?? 0)) / 4).toFixed(1);

  // Save attempts for history
  await Promise.all([
    prisma.attempt.create({
      data: {
        userId,
        skill: "LISTENING",
        refId: m.listening.testId,
        rawAnswer: m.listening.answers,
        score: listeningBand,
        durationSec: m.listening.durationSec ?? null,
      },
    }),
    prisma.attempt.create({
      data: {
        userId,
        skill: "READING",
        refId: m.reading.testId,
        rawAnswer: m.reading.answers,
        score: readingBand,
        durationSec: m.reading.durationSec ?? null,
      },
    }),
    writing1Result &&
      prisma.attempt.create({
        data: {
          userId,
          skill: "WRITING",
          refId: m.writing1.taskId,
          rawAnswer: { essay: m.writing1.essay, taskType: 1, fromMock: true },
          score: writing1Result.overallBand,
          feedback: writing1Result as object,
          durationSec: m.writing1.durationSec ?? null,
        },
      }),
    writing2Result &&
      prisma.attempt.create({
        data: {
          userId,
          skill: "WRITING",
          refId: m.writing2.taskId,
          rawAnswer: { essay: m.writing2.essay, taskType: 2, fromMock: true },
          score: writing2Result.overallBand,
          feedback: writing2Result as object,
          durationSec: m.writing2.durationSec ?? null,
        },
      }),
    speakingResult &&
      prisma.attempt.create({
        data: {
          userId,
          skill: "SPEAKING",
          refId: m.speaking.setId,
          rawAnswer: { transcripts: m.speaking.transcripts, fromMock: true },
          score: speakingResult.overallBand,
          feedback: speakingResult as object,
          durationSec: m.speaking.durationSec ?? null,
        },
      }),
  ].filter(Boolean));

  await recordActivity(userId, { xpGain: 200 });

  return NextResponse.json({
    overallBand,
    perSkill: {
      listening: listeningBand,
      reading: readingBand,
      writing: +writingBand.toFixed(1),
      speaking: speakingResult?.overallBand ?? null,
    },
    details: {
      writing1: writing1Result,
      writing2: writing2Result,
      speaking: speakingResult,
    },
    errors,
  });
}

export const maxDuration = 120;
