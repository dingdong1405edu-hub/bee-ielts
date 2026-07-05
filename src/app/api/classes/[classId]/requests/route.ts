/**
 * POST /api/classes/:classId/requests — approve or reject a pending join
 * request for a private class (TEACHER/ADMIN).
 *
 * Body: { studentId, action: "approve" | "reject" }
 *   - approve → enrol the student + mark the request APPROVED
 *   - reject  → mark the request REJECTED (student may re-request later)
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTeacher, canManageAllClasses } from "@/lib/teacher-auth";

const bodySchema = z.object({
  studentId: z.string().min(1),
  action: z.enum(["approve", "reject"]),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ classId: string }> },
) {
  const gate = await requireTeacher();
  if (gate instanceof NextResponse) return gate;
  const { classId } = await params;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
  const { studentId, action } = parsed.data;

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { teacherId: true },
  });
  if (!cls) return NextResponse.json({ error: "Không tìm thấy lớp" }, { status: 404 });
  if (cls.teacherId !== gate.id && !canManageAllClasses(gate.role)) {
    return NextResponse.json({ error: "Bạn không phụ trách lớp này" }, { status: 403 });
  }

  if (action === "approve") {
    // Enrol + mark approved atomically.
    await prisma.$transaction([
      prisma.classMember.createMany({
        data: [{ classId, studentId }],
        skipDuplicates: true,
      }),
      prisma.classJoinRequest.updateMany({
        where: { classId, studentId },
        data: { status: "APPROVED", decidedAt: new Date() },
      }),
    ]);
    return NextResponse.json({ approved: true });
  }

  await prisma.classJoinRequest.updateMany({
    where: { classId, studentId },
    data: { status: "REJECTED", decidedAt: new Date() },
  });
  return NextResponse.json({ rejected: true });
}
