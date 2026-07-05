/**
 * /api/classes/:classId/members — manage a class roster (TEACHER/ADMIN).
 *
 *   POST   { studentIds: string[] }  — add students (skipDuplicates).
 *   DELETE { studentId: string }     — kick one student out of the class.
 * A plain TEACHER may only manage their OWN class; ADMIN/OWNER any class.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTeacher, canManageAllClasses } from "@/lib/teacher-auth";

/** Shared ownership check: the class exists and the caller may manage it. */
async function assertManages(
  classId: string,
  actor: { id: string; role: string },
): Promise<NextResponse | null> {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { teacherId: true },
  });
  if (!cls) return NextResponse.json({ error: "Không tìm thấy lớp" }, { status: 404 });
  if (cls.teacherId !== actor.id && !canManageAllClasses(actor.role)) {
    return NextResponse.json({ error: "Bạn không phụ trách lớp này" }, { status: 403 });
  }
  return null;
}

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

  const denied = await assertManages(classId, gate);
  if (denied) return denied;

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

const deleteSchema = z.object({ studentId: z.string().min(1) });

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ classId: string }> },
) {
  const gate = await requireTeacher();
  if (gate instanceof NextResponse) return gate;
  const { classId } = await params;

  const parsed = deleteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Thiếu học sinh cần xoá" }, { status: 400 });
  }

  const denied = await assertManages(classId, gate);
  if (denied) return denied;

  // Remove the enrolment. Also clear any join request so they can re-request
  // later from a clean slate. deleteMany → no throw if the row isn't there.
  await prisma.classMember.deleteMany({
    where: { classId, studentId: parsed.data.studentId },
  });
  await prisma.classJoinRequest.deleteMany({
    where: { classId, studentId: parsed.data.studentId },
  });

  return NextResponse.json({ removed: true });
}
