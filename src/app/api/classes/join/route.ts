/**
 * POST /api/classes/join — a student enters a class join code.
 *
 * Body: { code }
 *   - Public class  → enrol immediately (idempotent).
 *   - Private class → create a PENDING join request; the teacher must approve.
 * Already a member → no-op success.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const schema = z.object({ code: z.string().trim().min(4).max(12) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  const studentId = session.user.id;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Nhập mã lớp" }, { status: 400 });
  }

  const code = parsed.data.code.toUpperCase();
  const cls = await prisma.class.findUnique({
    where: { joinCode: code },
    select: { id: true, name: true, isPrivate: true },
  });
  if (!cls) {
    return NextResponse.json({ error: "Mã lớp không đúng" }, { status: 404 });
  }

  // Already enrolled → nothing to do.
  const member = await prisma.classMember.findUnique({
    where: { classId_studentId: { classId: cls.id, studentId } },
    select: { id: true },
  });
  if (member) {
    return NextResponse.json({ joined: true, class: { id: cls.id, name: cls.name } });
  }

  if (cls.isPrivate) {
    // Private → queue a request for the teacher. Re-requesting resets to PENDING.
    await prisma.classJoinRequest.upsert({
      where: { classId_studentId: { classId: cls.id, studentId } },
      create: { classId: cls.id, studentId },
      update: { status: "PENDING", decidedAt: null },
    });
    return NextResponse.json({ pending: true, class: { id: cls.id, name: cls.name } });
  }

  await prisma.classMember.createMany({
    data: [{ classId: cls.id, studentId }],
    skipDuplicates: true,
  });
  return NextResponse.json({ joined: true, class: { id: cls.id, name: cls.name } });
}
