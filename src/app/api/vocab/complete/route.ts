import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { recordActivity } from "@/lib/activity";
import { awardMany } from "@/lib/achievements/award";
import {
  allVocabPerfectionCodes,
  type Achievement,
} from "@/lib/achievements/catalog";

const schema = z.object({
  lessonId: z.string(),
  score: z.number().min(0).max(100),
  totalCorrect: z.number().min(0),
  total: z.number().min(1),
  durationSec: z.number().min(0).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });

  const { lessonId, score, totalCorrect, total, durationSec } = parsed.data;
  const xpGain = totalCorrect * 5;
  const userId = session.user.id;

  // Detect "first lesson" by checking BEFORE we mark it completed — must
  // happen before the upsert so the count is honest.
  const priorCompletedCount = await prisma.vocabProgress.count({
    where: { userId, completed: true },
  });

  await prisma.$transaction([
    prisma.vocabProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: { completed: true, score },
      create: { userId, lessonId, completed: true, score },
    }),
    prisma.attempt.create({
      data: {
        userId,
        skill: "VOCAB",
        refId: lessonId,
        rawAnswer: { totalCorrect, total },
        score: (score / 100) * 9,
        durationSec: durationSec ?? null,
      },
    }),
  ]);

  // Achievement codes to try awarding. Idempotent — DB unique constraint
  // means re-runs are free.
  const codes: string[] = [];
  if (priorCompletedCount === 0) codes.push("vocab_first_lesson");
  codes.push(...allVocabPerfectionCodes(score));

  const unlocked: Achievement[] = [];
  if (codes.length > 0) {
    const lessonUnlocks = await awardMany(userId, codes, {
      lessonId,
      score,
      totalCorrect,
      total,
    });
    unlocked.push(...lessonUnlocks);
  }
  // Streak + XP badges fold in from recordActivity.
  const activityUnlocks = await recordActivity(userId, { xpGain });
  unlocked.push(...activityUnlocks);

  return NextResponse.json({ ok: true, xpGain, unlocked });
}
