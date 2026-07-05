/**
 * PATCH /api/classes/:classId — update class settings (TEACHER/ADMIN).
 *
 * Body: { isPrivate?, name? }
 *   - isPrivate toggles the approval-required mode.
 * A plain TEACHER may only edit their OWN class; ADMIN/OWNER any class.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTeacher, canManageAllClasses } from "@/lib/teacher-auth";

const bodySchema = z
  .object({
    isPrivate: z.boolean().optional(),
    name: z.string().trim().min(1).max(120).optional(),
  })
  .refine((b) => b.isPrivate !== undefined || b.name !== undefined, {
    message: "Không có thay đổi nào",
  });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ classId: string }> },
) {
  const gate = await requireTeacher();
  if (gate instanceof NextResponse) return gate;
  const { classId } = await params;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
      { status: 400 },
    );
  }

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { id: true, teacherId: true },
  });
  if (!cls) return NextResponse.json({ error: "Không tìm thấy lớp" }, { status: 404 });
  if (cls.teacherId !== gate.id && !canManageAllClasses(gate.role)) {
    return NextResponse.json({ error: "Bạn không phụ trách lớp này" }, { status: 403 });
  }

  const updated = await prisma.class.update({
    where: { id: classId },
    data: {
      ...(parsed.data.isPrivate !== undefined ? { isPrivate: parsed.data.isPrivate } : {}),
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
    },
    select: { id: true, name: true, isPrivate: true },
  });

  return NextResponse.json({ class: updated });
}
