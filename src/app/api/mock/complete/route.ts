import { NextResponse } from "next/server";
import { z } from "zod";
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
  // IELTS-like band mapping (simplified)
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

  // Writing: AI grade both tasks — Task 1 weighted 1/3, Task 2 weighted 2/3.
  let wBand = 0;
  let wFeedback = "Không chấm được Writing.";
  try {
    const [wt1, wt2] = await Promise.all([
      prisma.writingTask.findUnique({ where: { id: writing.task1Id } }),
      prisma.writingTask.findUnique({ where: { id: writing.task2Id } }),
    ]);
    let b1 = 0;
    let b2 = 0;
    let s1 = "";
    let s2 = "";
    if (wt1 && writing.essay1.trim().length > 20) {
      const r1 = (await gradeWritingGroq({
        taskType: 1,
        prompt: wt1.prompt,
        essay: writing.essay1,
      })) as { overallBand: number; summary: string };
      b1 = r1.overallBand;
      s1 = r1.summary;
    }
    if (wt2 && writing.essay2.trim().length > 20) {
      const r2 = (await gradeWritingGroq({
        taskType: 2,
        prompt: wt2.prompt,
        essay: writing.essay2,
      })) as { overallBand: number; summary: string };
      b2 = r2.overallBand;
      s2 = r2.summary;
    }
    wBand = roundOverall(b1 / 3 + (2 * b2) / 3);
    wFeedback = `Task 1 (${b1.toFixed(1)}): ${s1 || "—"} | Task 2 (${b2.toFixed(1)}): ${s2 || "—"}`;
  } catch (e) {
    console.error("[mock writing]", e);
  }

  // Speaking: AI grade (combine 3 parts into one transcript)
  let sBand = 5.0;
  let sFeedback = "Không chấm được Speaking.";
  try {
    const combinedTranscript = `[Part 1]\n${speaking.transcripts["1"]}\n\n[Part 2]\n${speaking.transcripts["2"]}\n\n[Part 3]\n${speaking.transcripts["3"]}`;
    if (combinedTranscript.replace(/\[.*?\]/g, "").trim().length > 20) {
      const sResult = (await gradeSpeakingGroq({
        part: 1,
        topic: speaking.topic,
        questions: ["Part 1 + Part 2 + Part 3 combined"],
        transcript: combinedTranscript,
      })) as { overallBand: number; summary: string };
      sBand = sResult.overallBand;
      sFeedback = sResult.summary;
    }
  } catch (e) {
    console.error("[mock speaking]", e);
  }

  const overallBand = roundOverall((lBand + rBand + wBand + sBand) / 4);

  // Update placement — first mock auto-sets it, subsequent mocks refresh
  // it so /band-climber always recommends a stage matching the learner's
  // current level.
  await prisma.user.update({
    where: { id: userId },
    data: { placementBand: overallBand, placementDoneAt: new Date() },
  });

  // Save 4 attempts with prefix mock- to distinguish from practice
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

  const summary =
    overallBand >= 7.5
      ? "Tuyệt vời — bạn đang ở mức rất khá. Tiếp tục giữ phong độ và tinh chỉnh chi tiết."
      : overallBand >= 6.5
        ? "Khá tốt. Tập trung vào kỹ năng yếu nhất để kéo overall band lên."
        : overallBand >= 5.5
          ? "Mức trung bình. Cần luyện thêm về vocabulary và độ tự tin trong Speaking/Writing."
          : "Cần luyện đều cả 4 kỹ năng. Làm thêm các bài practice trước khi mock lại.";

  return NextResponse.json({
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
