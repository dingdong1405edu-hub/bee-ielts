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
import { attemptsAllowedOf, canAttempt } from "@/lib/attempts";

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
      openAt: true,
      skill: true,
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

  // Scheduled open: before openAt a student sees a locked screen (a teacher/
  // admin previewing is never locked). We DON'T create the PENDING submission
  // while locked, so the timer only starts once the bài is open.
  const locked = !isManager && !!assignment.openAt && assignment.openAt.getTime() > Date.now();

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
    feedback: unknown;
    transcript: string | null;
    submittedAt: Date | null;
    attemptCount: number;
  } | null = null;

  if (isMember && !isManager && !locked) {
    const sub = await prisma.submission.upsert({
      where: { assignmentId_studentId: { assignmentId: id, studentId: me.id } },
      create: { assignmentId: id, studentId: me.id, status: "PENDING" },
      update: {},
      select: {
        status: true, totalScore: true, answers: true, feedback: true,
        transcript: true, submittedAt: true, createdAt: true, attemptCount: true,
      },
    });
    startedAt = sub.createdAt;
    alreadySubmitted = sub.status === "SUBMITTED" || sub.status === "GRADED";
    submission = {
      status: sub.status,
      totalScore: sub.totalScore,
      answers: sub.answers,
      feedback: sub.feedback,
      transcript: sub.transcript,
      submittedAt: sub.submittedAt,
      attemptCount: sub.attemptCount,
    };
  }

  // Post-submit REVIEW: reveal the answer key + explanations ONLY when the
  // student has submitted AND has no attempts left — this powers the native
  // Reading solutions view without leaking the key to game a retake. (The
  // passage itself is student-safe and already rides in config.reading.)
  let review: { id: string; correctAnswer: string; explanation: string | null }[] | null = null;
  const allowed = attemptsAllowedOf(assignment.config);
  if (
    isMember && !isManager && alreadySubmitted &&
    !canAttempt(allowed, submission?.attemptCount ?? 0)
  ) {
    const keyRows = await prisma.question.findMany({
      where: { id: { in: assignment.questionIds } },
      select: { id: true, correctAnswer: true, explanation: true },
    });
    const kById = new Map(keyRows.map((r) => [r.id, r]));
    review = assignment.questionIds
      .map((qid) => kById.get(qid))
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .map((r) => ({
        id: r.id,
        correctAnswer: typeof r.correctAnswer === "string" ? r.correctAnswer : String(r.correctAnswer ?? ""),
        explanation: r.explanation,
      }));
  }

  return NextResponse.json({
    assignment: {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      deadline: assignment.deadline,
      openAt: assignment.openAt,
      skill: assignment.skill,
      className: assignment.class.name,
      config: assignment.config ?? {},
      questionCount: questions.length,
      attemptsAllowed: attemptsAllowedOf(assignment.config),
    },
    locked,
    questions,
    startedAt,
    serverNow: new Date().toISOString(),
    isManager,
    alreadySubmitted,
    submission,
    review,
  });
}

/**
 * DELETE /api/assignments/:id — the class teacher (or admin/owner) removes a
 * posted assignment. Submissions cascade via the FK; teacher-authored custom
 * questions (created fresh per assignment, never shared) are cleaned up so no
 * orphan rows are left behind. Bank questions (createdById = null) are kept.
 */
export async function DELETE(
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
    select: { id: true, questionIds: true, class: { select: { teacherId: true } } },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Không tìm thấy bài tập" }, { status: 404 });
  }
  if (assignment.class.teacherId !== me.id && !canManageAllClasses(me.role)) {
    return NextResponse.json({ error: "Bạn không phụ trách lớp này" }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    // Cascade deletes the assignment's submissions via the FK.
    await tx.assignment.delete({ where: { id } });
    // Remove the teacher-authored questions this assignment owned (custom
    // questions are created per-assignment and not shared). Bank questions
    // (createdById = null) are left untouched.
    if (assignment.questionIds.length > 0) {
      await tx.question.deleteMany({
        where: { id: { in: assignment.questionIds }, createdById: { not: null } },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
