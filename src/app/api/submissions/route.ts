/**
 * POST /api/submissions — a student submits an assignment.
 *
 * Body: { assignmentId, answers: [{questionId, answer}], cheatLogs?: {count, events} }
 *
 * Auto-grades against the question bank (isAnswerCorrect), stores the answers +
 * proctoring log (cheat_logs — kept so the teacher AND the student's parents can
 * review tab-switch/blur events), sets status=GRADED, totalScore=percent, and
 * blocks a second submission.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAnswerCorrect } from "@/lib/utils";

const bodySchema = z.object({
  assignmentId: z.string().min(1),
  answers: z
    .array(z.object({ questionId: z.string().min(1), answer: z.string() }))
    .max(1000)
    .default([]),
  cheatLogs: z
    .object({
      count: z.number().int().min(0).default(0),
      events: z
        .array(z.object({ type: z.string().max(40), at: z.string().max(40) }))
        .max(2000)
        .default([]),
    })
    .optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  const studentId = session.user.id;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
      { status: 400 },
    );
  }
  const { assignmentId, answers, cheatLogs } = parsed.data;

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, classId: true, questionIds: true },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Không tìm thấy bài tập" }, { status: 404 });
  }

  // Must be enrolled in the class to submit.
  const membership = await prisma.classMember.findUnique({
    where: { classId_studentId: { classId: assignment.classId, studentId } },
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "Bạn không thuộc lớp của bài tập này" }, { status: 403 });
  }

  // One attempt only — block resubmission of an already-finished attempt.
  const existing = await prisma.submission.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId } },
    select: { status: true },
  });
  if (existing && (existing.status === "SUBMITTED" || existing.status === "GRADED")) {
    return NextResponse.json({ error: "Bài đã được nộp trước đó." }, { status: 409 });
  }

  // Auto-grade against the answer key.
  const questions = await prisma.question.findMany({
    where: { id: { in: assignment.questionIds } },
    select: { id: true, type: true, correctAnswer: true },
  });
  const answerMap = new Map(answers.map((a) => [a.questionId, a.answer]));
  const total = questions.length;
  let correctCount = 0;
  for (const q of questions) {
    const key = typeof q.correctAnswer === "string" ? q.correctAnswer : String(q.correctAnswer ?? "");
    if (isAnswerCorrect(answerMap.get(q.id), key, q.type)) correctCount += 1;
  }
  const scorePercent = total > 0 ? Math.round((correctCount / total) * 1000) / 10 : 0;

  await prisma.submission.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId } },
    create: {
      assignmentId,
      studentId,
      status: "GRADED",
      totalScore: scorePercent,
      answers: answers as unknown as Prisma.InputJsonValue,
      submittedAt: new Date(),
      cheatLogs: (cheatLogs ?? { count: 0, events: [] }) as unknown as Prisma.InputJsonValue,
    },
    update: {
      status: "GRADED",
      totalScore: scorePercent,
      answers: answers as unknown as Prisma.InputJsonValue,
      submittedAt: new Date(),
      cheatLogs: (cheatLogs ?? { count: 0, events: [] }) as unknown as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({
    ok: true,
    correctCount,
    total,
    scorePercent,
    cheatCount: cheatLogs?.count ?? 0,
  });
}
