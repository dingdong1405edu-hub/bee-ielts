import { prisma } from "@/lib/db";
import { nextStreakOnActivity } from "@/lib/streak";

export async function recordActivity(userId: string, opts: { xpGain?: number } = {}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streakDays: true, lastActiveAt: true },
  });
  if (!user) return;
  const { newStreak } = nextStreakOnActivity(user.streakDays, user.lastActiveAt);
  await prisma.user.update({
    where: { id: userId },
    data: {
      streakDays: newStreak,
      lastActiveAt: new Date(),
      ...(opts.xpGain ? { xp: { increment: opts.xpGain } } : {}),
    },
  });
}
