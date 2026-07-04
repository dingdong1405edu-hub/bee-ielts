/**
 * POST /api/classes/:classId/members — add students to a class (TEACHER/ADMIN).
 *
 * Body: { studentIds: string[] }
 * A plain TEACHER may only add to their OWN class; ADMIN/OWNER to any class.
 * Non-existent user ids are skipped and reported back in `missing`; duplicate
 * enrolments are ignored (skipDuplicates).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTeacher, canManageAllClasses } from "@/lib/teacher-auth";

const bodySchema = z.object({
  studentIds: z.array(z.string().min(1)).min(1, "Cần ít nhất 1 học sinh").max(500),
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
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
      { status: 400 },
    );
  }

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { id: true, teacherId: true },
  });
  if (!cls) {
    return NextResponse.json({ error: "Không tìm thấy lớp" }, { status: 404 });
  }
  // Ownership: teachers manage only their class; admins/owner any class.
  if (cls.teacherId !== gate.id && !canManageAllClasses(gate.role)) {
    return NextResponse.json({ error: "Bạn không phụ trách lớp này" }, { status: 403 });
  }

  // Dedupe input, then keep only ids that map to a real user.
  const requestedIds = Array.from(new Set(parsed.data.studentIds));
  const existing = await prisma.user.findMany({
    where: { id: { in: requestedIds } },
    select: { id: true },
  });
  const validIds = existing.map((u) => u.id);
  const missing = requestedIds.filter((id) => !validIds.includes(id));

  const result =
    validIds.length > 0
      ? await prisma.classMember.createMany({
          data: validIds.map((studentId) => ({ classId, studentId })),
          skipDuplicates: true, // ignore students already enrolled
        })
      : { count: 0 };

  return NextResponse.json({
    added: result.count,
    requested: requestedIds.length,
    skippedExisting: validIds.length - result.count,
    missing, // ids that don't match any user
  });
}
