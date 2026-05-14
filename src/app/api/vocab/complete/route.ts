import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  lessonId: z.string(),
  score: z.number().min(0).max(100),
  totalCorrect: z.number().min(0),
  total: z.number().min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });

  const { lessonId, score, totalCorrect, total } = parsed.data;
  const xpGain = totalCorrect * 5;

  await prisma.$transaction([
    prisma.vocabProgress.upsert({
      where: { userId_lessonId: { userId: session.user.id, lessonId } },
      update: { completed: true, score },
      create: { userId: session.user.id, lessonId, completed: true, score },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: {
        xp: { increment: xpGain },
        hearts: { decrement: Math.min(5, total - totalCorrect) },
        lastActiveAt: new Date(),
      },
    }),
    prisma.attempt.create({
      data: {
        userId: session.user.id,
        skill: "VOCAB",
        refId: lessonId,
        rawAnswer: { totalCorrect, total },
        score: (score / 100) * 9,
      },
    }),
  ]);

  return NextResponse.json({ ok: true, xpGain });
}
