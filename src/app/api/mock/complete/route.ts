import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { gradeWriting, gradeSpeaking } from "@/lib/claude";

const schema = z.object({
  listening: z.object({
    testId: z.string(),
    answers: z.record(z.string()),
    questions: z.array(z.object({ id: z.string(), correctAnswer: z.string() })),
  }),
  reading: z.object({
    testId: z.string(),
    answers: z.record(z.string()),
    questions: z.array(z.object({ id: z.string(), correctAnswer: z.string() })),
  }),
  writing: z.object({ taskId: z.string(), essay: z.string() }),
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
    (q) => (listening.answers[q.id] || "").trim().toLowerCase() === q.correctAnswer.toLowerCase(),
  ).length;
  const rCorrect = reading.questions.filter(
    (q) => (reading.answers[q.id] || "").trim().toLowerCase() === q.correctAnswer.toLowerCase(),
  ).length;
  const lBand = scoreToBand(lCorrect, listening.questions.length);
  const rBand = scoreToBand(rCorrect, reading.questions.length);

  // Writing: AI grade
  let wBand = 5.0;
  let wFeedback = "Không chấm được Writing.";
  try {
    const wTask = await prisma.writingTask.findUnique({ where: { id: writing.taskId } });
    if (wTask && writing.essay.trim().length > 20) {
      const wResult = (await gradeWriting({
        taskType: wTask.taskType as 1 | 2,
        prompt: wTask.prompt,
        essay: writing.essay,
      })) as { overallBand: number; summary: string };
      wBand = wResult.overallBand;
      wFeedback = wResult.summary;
    }
  } catch (e) {
    console.error("[mock writing]", e);
  }

  // Speaking: AI grade (combine 3 parts into one transcript)
  let sBand = 5.0;
  let sFeedback = "Không chấm được Speaking.";
  try {
    const combinedTranscript = `[Part 1]\n${speaking.transcripts["1"]}\n\n[Part 2]\n${speaking.transcripts["2"]}\n\n[Part 3]\n${speaking.transcripts["3"]}`;
    if (combinedTranscript.replace(/\[.*?\]/g, "").trim().length > 20) {
      const sResult = (await gradeSpeaking({
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

  // Save 4 attempts with prefix mock- to distinguish from practice
  await prisma.$transaction([
    prisma.attempt.create({
      data: {
        userId,
        skill: "LISTENING",
        refId: `mock-${listening.testId}`,
        rawAnswer: listening.answers,
        score: lBand,
      },
    }),
    prisma.attempt.create({
      data: {
        userId,
        skill: "READING",
        refId: `mock-${reading.testId}`,
        rawAnswer: reading.answers,
        score: rBand,
      },
    }),
    prisma.attempt.create({
      data: {
        userId,
        skill: "WRITING",
        refId: `mock-${writing.taskId}`,
        rawAnswer: { essay: writing.essay },
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
