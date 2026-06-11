import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  testId: z.string(),
  answers: z.record(z.string()),
  correctCount: z.number().min(0),
  total: z.number().min(1),
  durationSec: z.number().min(0).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });

  const { testId, answers, correctCount, total, durationSec } = parsed.data;
  const band = (correctCount / total) * 9;

  await prisma.attempt.create({
    data: {
      userId: session.user.id,
      skill: "READING",
      refId: testId,
      rawAnswer: answers,
      score: band,
      durationSec: durationSec ?? null,
    },
  });
  const unlocked = await recordActivity(session.user.id, { xpGain: correctCount * 10 });

  return NextResponse.json({ ok: true, band, unlocked });
}
