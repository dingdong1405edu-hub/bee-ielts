/**
 * POST /api/classes — create a class (TEACHER / ADMIN only).
 *
 * Body: { name }
 * The caller becomes the class's teacher.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-auth";

const bodySchema = z.object({
  name: z.string().trim().min(1, "Cần tên lớp").max(120),
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

  const created = await prisma.class.create({
    data: { name: parsed.data.name, teacherId: gate.id },
    select: { id: true, name: true, teacherId: true, createdAt: true },
  });

  return NextResponse.json({ class: created }, { status: 201 });
}
