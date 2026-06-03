import { cache } from "react";
import { prisma } from "@/lib/db";

/**
 * Per-request memoized user lookup. Two Suspense boundaries in the learn
 * layout both need fields from the user row (stats bar + pop-quiz gate);
 * `React.cache()` dedupes the Prisma round-trip within a single request
 * so we only hit the DB once.
 */
export const getCurrentUserChrome = cache(async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      xp: true,
      hearts: true,
      streakDays: true,
      name: true,
      avatarUrl: true,
      email: true,
      popQuizOn: true,
      // Role is sourced from DB (not JWT) so that the OWNER promoting another
      // user to ADMIN takes effect on their next page load — JWT carries the
      // role from sign-in time and stays stale otherwise.
      role: true,
    },
  });
});
