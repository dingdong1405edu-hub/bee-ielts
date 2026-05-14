import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  testId: z.string(),
  answers: z.record(z.string()),
  correctCount: z.number().min(0),
  total: z.number().min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });

  const { testId, answers, correctCount, total } = parsed.data;
  await prisma.attempt.create({
    data: {
      userId: session.user.id,
      skill: "LISTENING",
      refId: testId,
      rawAnswer: answers,
      score: (correctCount / total) * 9,
    },
  });
  await prisma.user.update({
    where: { id: session.user.id },
    data: { xp: { increment: correctCount * 10 }, lastActiveAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
