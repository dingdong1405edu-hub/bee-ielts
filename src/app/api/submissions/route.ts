/**
 * POST /api/submissions — a student submits an assignment.
 *
 * Body: { assignmentId, answers: [{questionId, answer}], cheatLogs?: {count, events} }
 *
 * Auth + membership + one-attempt guard live here; the actual grading (query
 * answer key → compare → IELTS band → update Submission) is delegated to
 * GradingService. Only Reading/Listening questions are auto-graded.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { GradingService } from "@/lib/grading-service";

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
    select: { id: true, classId: true },
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

  // Auto-grade + persist (status=GRADED, totalScore=band, answers, cheat_logs).
  const result = await GradingService.gradeSubmission({
    assignmentId,
    studentId,
    answers,
    cheatLogs,
  });

  return NextResponse.json({
    ok: true,
    band: result.band,
    correctCount: result.correctCount,
    total: result.autoGradedCount,
    totalQuestions: result.totalQuestions,
    skippedCount: result.skippedCount,
    scorePercent: result.scorePercent,
    breakdown: result.breakdown,
    cheatCount: cheatLogs?.count ?? 0,
  });
}
