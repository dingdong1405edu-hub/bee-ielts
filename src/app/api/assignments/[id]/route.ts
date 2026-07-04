/**
 * GET /api/assignments/:id — load an assignment for a STUDENT to work on.
 *
 * Access: a student enrolled in the assignment's class, OR the class teacher /
 * admin / owner (preview). Questions are returned WITHOUT `correctAnswer` /
 * `explanation` so the answer key never reaches the browser.
 *
 * For a student this also upserts a PENDING Submission so we have a stable
 * `startedAt` to anchor a duration-based countdown, and reports whether they
 * have already submitted (→ the client shows the result read-only).
 *
 * Timing model (client builds the countdown from these):
 *   - config.durationMin → relative limit anchored at startedAt.
 *   - deadline           → absolute limit.
 *   - neither            → unlimited ("vĩnh viễn").
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canManageAllClasses } from "@/lib/teacher-auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (!me) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await params;
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    select: {
      id: true,
      classId: true,
      title: true,
      description: true,
      deadline: true,
      questionIds: true,
      config: true,
      class: { select: { teacherId: true, name: true } },
    },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Không tìm thấy bài tập" }, { status: 404 });
  }

  const isManager = me.id === assignment.class.teacherId || canManageAllClasses(me.role);
  const membership = await prisma.classMember.findUnique({
    where: { classId_studentId: { classId: assignment.classId, studentId: me.id } },
    select: { id: true },
  });
  const isMember = Boolean(membership);
  if (!isManager && !isMember) {
    return NextResponse.json({ error: "Bạn không thuộc lớp của bài tập này" }, { status: 403 });
  }

  // Questions WITHOUT the answer key, re-ordered to match the teacher's list.
  const rows = await prisma.question.findMany({
    where: { id: { in: assignment.questionIds } },
    select: { id: true, type: true, prompt: true, options: true, displayNumber: true, formGroup: true },
  });
  const byId = new Map(rows.map((q) => [q.id, q]));
  const questions = assignment.questionIds
    .map((qid) => byId.get(qid))
    .filter((q): q is NonNullable<typeof q> => Boolean(q));

  // Students get a PENDING submission created on first open (anchors the timer);
  // managers just preview and never create one.
  let startedAt: Date | null = null;
  let alreadySubmitted = false;
  let submission: {
    status: string;
    totalScore: number | null;
    answers: unknown;
    submittedAt: Date | null;
  } | null = null;

  if (isMember && !isManager) {
    const sub = await prisma.submission.upsert({
      where: { assignmentId_studentId: { assignmentId: id, studentId: me.id } },
      create: { assignmentId: id, studentId: me.id, status: "PENDING" },
      update: {},
      select: { status: true, totalScore: true, answers: true, submittedAt: true, createdAt: true },
    });
    startedAt = sub.createdAt;
    alreadySubmitted = sub.status === "SUBMITTED" || sub.status === "GRADED";
    submission = {
      status: sub.status,
      totalScore: sub.totalScore,
      answers: sub.answers,
      submittedAt: sub.submittedAt,
    };
  }

  return NextResponse.json({
    assignment: {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      deadline: assignment.deadline,
      className: assignment.class.name,
      config: assignment.config ?? {},
      questionCount: questions.length,
    },
    questions,
    startedAt,
    serverNow: new Date().toISOString(),
    isManager,
    alreadySubmitted,
    submission,
  });
}
