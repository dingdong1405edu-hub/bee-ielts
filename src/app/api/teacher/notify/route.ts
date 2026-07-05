/**
 * POST /api/teacher/notify — a teacher sends a notification to students.
 *
 * Body: { classId?: string, title?: string, message: string }
 *   - classId set  → only that class's students (teacher must own it)
 *   - classId null → every student across all the teacher's classes
 * Creates one Notification per (deduped) student; they see it in the bell.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTeacher, canManageAllClasses } from "@/lib/teacher-auth";
import { notifyMany } from "@/lib/notify";

const bodySchema = z.object({
  classId: z.string().min(1).optional(),
  title: z.string().trim().max(140).optional(),
  message: z.string().trim().min(1, "Nhập nội dung thông báo").max(2000),
});

export async function POST(req: Request) {
  const gate = await requireTeacher();
  if (gate instanceof NextResponse) return gate;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
      { status: 400 },
    );
  }
  const { classId, title, message } = parsed.data;

  // Resolve which classes to target — one owned class, or all of them.
  const classWhere = canManageAllClasses(gate.role)
    ? classId
      ? { id: classId }
      : {}
    : classId
      ? { id: classId, teacherId: gate.id }
      : { teacherId: gate.id };

  const classes = await prisma.class.findMany({ where: classWhere, select: { id: true } });
  if (classId && classes.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy lớp của bạn" }, { status: 404 });
  }

  const members = await prisma.classMember.findMany({
    where: { classId: { in: classes.map((c) => c.id) } },
    select: { studentId: true },
  });
  const studentIds = Array.from(new Set(members.map((m) => m.studentId)));
  if (studentIds.length === 0) {
    return NextResponse.json({ sent: 0, message: "Lớp chưa có học sinh nào." });
  }

  await notifyMany(studentIds, {
    kind: "class",
    title: title?.trim() || "Thông báo từ giáo viên",
    body: message,
    href: "/classes",
  });

  return NextResponse.json({ sent: studentIds.length });
}
