import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const schema = z.object({ id: z.string().min(1) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });

  // Only delete the attempt if it belongs to the current user.
  const attempt = await prisma.attempt.findUnique({
    where: { id: parsed.data.id },
    select: { userId: true },
  });
  if (!attempt || attempt.userId !== session.user.id) {
    return NextResponse.json({ error: "Không tìm thấy bài" }, { status: 404 });
  }

  await prisma.attempt.delete({ where: { id: parsed.data.id } });
  return NextResponse.json({ ok: true });
}
