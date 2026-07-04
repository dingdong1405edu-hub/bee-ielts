/**
 * POST /api/assignments — create an assignment for a class (TEACHER/ADMIN).
 *
 * Body: { classId, title, deadline?, bankQuestionIds[], description?, config? }
 *   - bankQuestionIds: ids from the existing BeeIELTS question bank (Question).
 *     Every id is validated to exist; unknown ids reject the whole request.
 *   - deadline: ISO datetime string (optional — draft assignments may omit it).
 *   - config: JSON settings (thời gian làm bài, xem đáp án, xáo trộn…).
 * A plain TEACHER may only target their OWN class; ADMIN/OWNER any class.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireTeacher, canManageAllClasses } from "@/lib/teacher-auth";

const bodySchema = z.object({
  classId: z.string().min(1),
  title: z.string().trim().min(1, "Cần tiêu đề").max(200),
  deadline: z.coerce.date().optional(),
  bankQuestionIds: z.array(z.string().min(1)).min(1, "Cần ít nhất 1 câu hỏi").max(500),
  description: z.string().max(5000).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
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
  const { classId, title, deadline, bankQuestionIds, description, config } = parsed.data;

  // Class must exist and be managed by the caller.
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { id: true, teacherId: true },
  });
  if (!cls) {
    return NextResponse.json({ error: "Không tìm thấy lớp" }, { status: 404 });
  }
  if (cls.teacherId !== gate.id && !canManageAllClasses(gate.role)) {
    return NextResponse.json({ error: "Bạn không phụ trách lớp này" }, { status: 403 });
  }

  // Validate every bank question id against the real question bank.
  const questionIds = Array.from(new Set(bankQuestionIds));
  const found = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true },
  });
  const foundIds = new Set(found.map((q) => q.id));
  const missing = questionIds.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: "Một số câu hỏi không tồn tại trong ngân hàng đề", missing },
      { status: 400 },
    );
  }

  const assignment = await prisma.assignment.create({
    data: {
      classId,
      title,
      description: description ?? null,
      deadline: deadline ?? null,
      questionIds,
      config: config === undefined ? undefined : (config as Prisma.InputJsonValue),
    },
    select: {
      id: true,
      classId: true,
      title: true,
      deadline: true,
      questionIds: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ assignment }, { status: 201 });
}
