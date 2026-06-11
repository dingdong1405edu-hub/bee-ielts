import { prisma } from "@/lib/db";
import { nextStreakOnActivity } from "@/lib/streak";
import { awardMany } from "@/lib/achievements/award";
import { streakTierCodes, xpTierCodes, type Achievement } from "@/lib/achievements/catalog";

/**
 * Records a daily-activity tick: updates streak + adds XP, then checks
 * streak/XP achievement thresholds. Returns the list of badges newly
 * unlocked so callers can splice them into their response payload (the
 * client popup picks them up via `triggerUnlocksFromResponse`).
 */
export async function recordActivity(
  userId: string,
  opts: { xpGain?: number } = {},
): Promise<Achievement[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streakDays: true, lastActiveAt: true, xp: true },
  });
  if (!user) return [];
  const { newStreak } = nextStreakOnActivity(user.streakDays, user.lastActiveAt);
  const newXp = user.xp + (opts.xpGain ?? 0);
  await prisma.user.update({
    where: { id: userId },
    data: {
      streakDays: newStreak,
      lastActiveAt: new Date(),
      ...(opts.xpGain ? { xp: { increment: opts.xpGain } } : {}),
    },
  });
  const codes = [...streakTierCodes(newStreak), ...xpTierCodes(newXp)];
  if (codes.length === 0) return [];
  return awardMany(userId, codes, { streakDays: newStreak, xp: newXp });
}
