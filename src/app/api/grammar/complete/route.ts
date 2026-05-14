import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  lessonId: z.string(),
  correctCount: z.number().min(0),
  total: z.number().min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });
  const { lessonId, correctCount, total } = parsed.data;
  const score = Math.round((correctCount / total) * 100);

  await prisma.$transaction([
    prisma.grammarProgress.upsert({
      where: { userId_lessonId: { userId: session.user.id, lessonId } },
      update: { completed: true, score },
      create: { userId: session.user.id, lessonId, completed: true, score },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { xp: { increment: correctCount * 5 }, lastActiveAt: new Date() },
    }),
    prisma.attempt.create({
      data: { userId: session.user.id, skill: "GRAMMAR", refId: lessonId, rawAnswer: { correctCount, total }, score: (score / 100) * 9 },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
