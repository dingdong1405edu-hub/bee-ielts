import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { gradeWritingGroq, gradeSpeakingGroq } from "@/lib/groq";
import { isAnswerCorrect } from "@/lib/utils";

const gradableQuestion = z.object({
  id: z.string(),
  correctAnswer: z.string(),
  type: z.string().optional(),
});

const schema = z.object({
  listening: z.object({
    testIds: z.array(z.string()),
    answers: z.record(z.string()),
    questions: z.array(gradableQuestion),
  }),
  reading: z.object({
    testIds: z.array(z.string()),
    answers: z.record(z.string()),
    questions: z.array(gradableQuestion),
  }),
  writing: z.object({
    task1Id: z.string(),
    essay1: z.string(),
    task2Id: z.string(),
    essay2: z.string(),
  }),
  speaking: z.object({
    setId: z.string(),
    topic: z.string(),
    transcripts: z.object({ "1": z.string(), "2": z.string(), "3": z.string() }),
  }),
});

function scoreToBand(correct: number, total: number): number {
  if (total === 0) return 0;
  const pct = correct / total;
  if (pct >= 0.97) return 9.0;
  if (pct >= 0.9) return 8.5;
  if (pct >= 0.85) return 8.0;
  if (pct >= 0.78) return 7.5;
  if (pct >= 0.7) return 7.0;
  if (pct >= 0.6) return 6.5;
  if (pct >= 0.5) return 6.0;
  if (pct >= 0.4) return 5.5;
  if (pct >= 0.3) return 5.0;
  if (pct >= 0.2) return 4.5;
  if (pct >= 0.1) return 4.0;
  return 3.5;
}

function roundOverall(avg: number): number {
  return Math.round(avg * 2) / 2;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });
  const { listening, reading, writing, speaking } = parsed.data;
  const userId = session.user.id;

  // Listening + Reading: auto-grade
  const lCorrect = listening.questions.filter(
    (q) => isAnswerCorrect(listening.answers[q.id], q.correctAnswer, q.type),
  ).length;
  const rCorrect = reading.questions.filter(
    (q) => isAnswerCorrect(reading.answers[q.id], q.correctAnswer, q.type),
  ).length;
  const lBand = scoreToBand(lCorrect, listening.questions.length);
  const rBand = scoreToBand(rCorrect, reading.questions.length);

  // Writing — band-1.0 floor on AI failure / empty essay. Each task is graded
  // independently so a Task 1 failure doesn't void Task 2's score.
  let wBand = 1.0;
  let wFeedback = "Không chấm được Writing — band 1.0 mặc định.";
  let task1Result: { band: number; summary: string; full: unknown } | null = null;
  let task2Result: { band: number; summary: string; full: unknown } | null = null;
  const [wt1, wt2] = await Promise.all([
    prisma.writingTask.findUnique({ where: { id: writing.task1Id } }),
    prisma.writingTask.findUnique({ where: { id: writing.task2Id } }),
  ]);
  if (wt1 && writing.essay1.trim().length > 20) {
    try {
      const r1 = (await gradeWritingGroq({
        taskType: 1,
        prompt: wt1.prompt,
        essay: writing.essay1,
      })) as { overallBand: number; summary: string };
      const band = Number.isFinite(r1.overallBand) && r1.overallBand > 0 ? r1.overallBand : 1.0;
      task1Result = { band, summary: r1.summary || "—", full: r1 };
    } catch (e) {
      console.error("[mock writing task1]", e);
      task1Result = { band: 1.0, summary: "Chấm thất bại — band 1.0.", full: null };
    }
  } else {
    task1Result = { band: 1.0, summary: "Bài quá ngắn — band 1.0.", full: null };
  }
  if (wt2 && writing.essay2.trim().length > 20) {
    try {
      const r2 = (await gradeWritingGroq({
        taskType: 2,
        prompt: wt2.prompt,
        essay: writing.essay2,
      })) as { overallBand: number; summary: string };
      const band = Number.isFinite(r2.overallBand) && r2.overallBand > 0 ? r2.overallBand : 1.0;
      task2Result = { band, summary: r2.summary || "—", full: r2 };
    } catch (e) {
      console.error("[mock writing task2]", e);
      task2Result = { band: 1.0, summary: "Chấm thất bại — band 1.0.", full: null };
    }
  } else {
    task2Result = { band: 1.0, summary: "Bài quá ngắn — band 1.0.", full: null };
  }
  wBand = roundOverall(task1Result.band / 3 + (2 * task2Result.band) / 3);
  if (wBand < 1.0) wBand = 1.0;
  wFeedback = `Task 1 (${task1Result.band.toFixed(1)}): ${task1Result.summary} | Task 2 (${task2Result.band.toFixed(1)}): ${task2Result.summary}`;

  // Speaking — same band-1.0 floor. Full grader output kept for review.
  let sBand = 1.0;
  let sFeedback = "Không chấm được Speaking — band 1.0 mặc định.";
  let speakingFull: unknown = null;
  try {
    const combinedTranscript = `[Part 1]\n${speaking.transcripts["1"]}\n\n[Part 2]\n${speaking.transcripts["2"]}\n\n[Part 3]\n${speaking.transcripts["3"]}`;
    if (combinedTranscript.replace(/\[.*?\]/g, "").trim().length > 20) {
      const sResult = (await gradeSpeakingGroq({
        part: 1,
        topic: speaking.topic,
        questions: ["Part 1 + Part 2 + Part 3 combined"],
        transcript: combinedTranscript,
      })) as { overallBand: number; summary: string };
      sBand = Number.isFinite(sResult.overallBand) && sResult.overallBand > 0 ? sResult.overallBand : 1.0;
      sFeedback = sResult.summary || "—";
      speakingFull = sResult;
    } else {
      sFeedback = "Transcript trống hoặc quá ngắn (<20 ký tự) — band 1.0 mặc định.";
    }
  } catch (e) {
    console.error("[mock speaking]", e);
  }

  const overallBand = roundOverall((lBand + rBand + wBand + sBand) / 4);

  const summary =
    overallBand >= 7.5
      ? "Tuyệt vời — bạn đang ở mức rất khá. Tiếp tục giữ phong độ và tinh chỉnh chi tiết."
      : overallBand >= 6.5
        ? "Khá tốt. Tập trung vào kỹ năng yếu nhất để kéo overall band lên."
        : overallBand >= 5.5
          ? "Mức trung bình. Cần luyện thêm về vocabulary và độ tự tin trong Speaking/Writing."
          : "Cần luyện đều cả 4 kỹ năng. Làm thêm các bài practice trước khi mock lại.";

  // Fetch full test detail so the review page can show prompts + correct
  // answers + explanations without depending on the underlying tests
  // still existing later.
  const [lTests, rTests, sSet] = await Promise.all([
    prisma.listeningTest.findMany({
      where: { id: { in: listening.testIds } },
      include: { questions: { orderBy: { order: "asc" } } },
    }),
    prisma.readingTest.findMany({
      where: { id: { in: reading.testIds } },
      include: { questions: { orderBy: { order: "asc" } } },
    }),
    prisma.speakingSet.findUnique({ where: { id: speaking.setId } }),
  ]);

  // Update placement + persist the full mock attempt as one row.
  const [, attempt] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { placementBand: overallBand, placementDoneAt: new Date() },
    }),
    prisma.mockAttempt.create({
      data: {
        userId,
        overallBand,
        summary,
        listeningBand: lBand,
        listeningCorrect: lCorrect,
        listeningTotal: listening.questions.length,
        listeningPayload: {
          tests: lTests.map((t) => ({
            id: t.id,
            title: t.title,
            audioUrl: t.audioUrl,
            transcript: t.transcript,
            section: t.section,
          })),
          questions: lTests.flatMap((t) =>
            t.questions.map((q) => ({
              id: q.id,
              testId: t.id,
              type: q.type,
              prompt: q.prompt,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              displayNumber: q.displayNumber,
              formGroup: q.formGroup,
            })),
          ),
          answers: listening.answers,
        },
        readingBand: rBand,
        readingCorrect: rCorrect,
        readingTotal: reading.questions.length,
        readingPayload: {
          passages: rTests.map((t) => ({
            id: t.id,
            title: t.title,
            passage: t.passage,
            imageUrl: t.imageUrl,
            level: t.level,
          })),
          questions: rTests.flatMap((t) =>
            t.questions.map((q) => ({
              id: q.id,
              testId: t.id,
              type: q.type,
              prompt: q.prompt,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              displayNumber: q.displayNumber,
              formGroup: q.formGroup,
            })),
          ),
          answers: reading.answers,
        },
        writingBand: wBand,
        writingPayload: {
          task1: {
            id: writing.task1Id,
            taskType: 1,
            prompt: wt1?.prompt ?? "(đã xoá)",
            imageUrl: wt1?.imageUrl ?? null,
            diagramSvg: wt1?.diagramSvg ?? null,
            essay: writing.essay1,
            band: task1Result.band,
            summary: task1Result.summary,
            ai: task1Result.full as Prisma.InputJsonValue,
          },
          task2: {
            id: writing.task2Id,
            taskType: 2,
            prompt: wt2?.prompt ?? "(đã xoá)",
            imageUrl: wt2?.imageUrl ?? null,
            essay: writing.essay2,
            band: task2Result.band,
            summary: task2Result.summary,
            ai: task2Result.full as Prisma.InputJsonValue,
          },
          combinedFeedback: wFeedback,
        } as Prisma.InputJsonValue,
        speakingBand: sBand,
        speakingPayload: {
          setId: speaking.setId,
          topic: speaking.topic,
          imageUrl: sSet?.imageUrl ?? null,
          part1Questions: (sSet?.part1Questions as string[] | undefined) ?? [],
          part2CueCard: (sSet?.part2CueCard as { topic: string; points: string[] } | undefined) ?? {
            topic: "",
            points: [],
          },
          // Mock trims Part 3 to a single question; record what was actually asked.
          part3Questions: ((sSet?.part3Questions as string[] | undefined) ?? []).slice(0, 1),
          transcripts: speaking.transcripts,
          band: sBand,
          summary: sFeedback,
          ai: speakingFull as Prisma.InputJsonValue,
        } as Prisma.InputJsonValue,
      },
      select: { id: true },
    }),
  ]);

  // Keep the legacy Attempt rows so /api/attempt-counts + per-skill review
  // history elsewhere still works.
  await prisma.$transaction([
    prisma.attempt.create({
      data: {
        userId,
        skill: "LISTENING",
        refId: `mock-${listening.testIds.join("+")}`,
        rawAnswer: listening.answers,
        score: lBand,
      },
    }),
    prisma.attempt.create({
      data: {
        userId,
        skill: "READING",
        refId: `mock-${reading.testIds.join("+")}`,
        rawAnswer: reading.answers,
        score: rBand,
      },
    }),
    prisma.attempt.create({
      data: {
        userId,
        skill: "WRITING",
        refId: `mock-${writing.task1Id}+${writing.task2Id}`,
        rawAnswer: { essay1: writing.essay1, essay2: writing.essay2 },
        score: wBand,
        feedback: { summary: wFeedback } as object,
      },
    }),
    prisma.attempt.create({
      data: {
        userId,
        skill: "SPEAKING",
        refId: `mock-${speaking.setId}`,
        rawAnswer: speaking.transcripts as object,
        score: sBand,
        feedback: { summary: sFeedback } as object,
      },
    }),
  ]);

  return NextResponse.json({
    attemptId: attempt.id,
    overallBand,
    perSkill: {
      listening: { band: lBand, correct: lCorrect, total: listening.questions.length },
      reading: { band: rBand, correct: rCorrect, total: reading.questions.length },
      writing: { band: wBand, feedback: wFeedback },
      speaking: { band: sBand, feedback: sFeedback },
    },
    summary,
  });
}

export const maxDuration = 120;
