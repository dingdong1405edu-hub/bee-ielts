/**
 * POST /api/classes/join — a student self-enrols into a class using its join
 * code (any logged-in user). Idempotent: joining twice is a no-op.
 *
 * Body: { code }
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
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Nhập mã lớp" }, { status: 400 });
  }

  const code = parsed.data.code.toUpperCase();
  const cls = await prisma.class.findUnique({
    where: { joinCode: code },
    select: { id: true, name: true },
  });
  if (!cls) {
    return NextResponse.json({ error: "Mã lớp không đúng" }, { status: 404 });
  }

  await prisma.classMember.createMany({
    data: [{ classId: cls.id, studentId: session.user.id }],
    skipDuplicates: true, // already a member → fine
  });

  return NextResponse.json({ class: cls });
}
