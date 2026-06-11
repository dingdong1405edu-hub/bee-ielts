/**
 * Award helper. Idempotent — calling twice with the same (userId, code)
 * is safe (DB unique constraint catches the second insert, we just
 * return `{ unlocked: false }` instead of throwing).
 *
 * Callers from server actions / API routes:
 *   1. Compute the criterion (score, count, band etc).
 *   2. Pass the matching code to `awardAchievement` (or band tier codes
 *      via `awardBandTier` for skill bands).
 *   3. If `unlocked === true`, surface the badge in the response so the
 *      client popup fires.
 *
 * Failure mode policy: NEVER let an award failure break the underlying
 * action (a user's quiz score is more important than a badge unlock).
 * All paths catch + log and return `{ unlocked: false }`.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  ACHIEVEMENT_BY_CODE,
  allBandTiersBelow,
  type Achievement,
} from "./catalog";

export interface AwardResult {
  unlocked: boolean;
  achievement: Achievement | null;
}

/** Unlock a single achievement. Returns `unlocked: true` only if this
 *  call CREATED a new row (not if the user already had it). */
export async function awardAchievement(
  userId: string,
  code: string,
  context?: Record<string, unknown>,
): Promise<AwardResult> {
  const achievement = ACHIEVEMENT_BY_CODE[code];
  if (!achievement) {
    console.warn(`[achievements] unknown code ${code} — catalog stale?`);
    return { unlocked: false, achievement: null };
  }
  try {
    await prisma.userAchievement.create({
      data: {
        userId,
        code,
        context: context ? (context as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
    return { unlocked: true, achievement };
  } catch (e) {
    // P2002 = unique constraint = already had it.
    const errCode = (e as { code?: string }).code;
    if (errCode === "P2002") return { unlocked: false, achievement };
    console.error(`[achievements] award fail for ${userId}/${code}:`, e);
    return { unlocked: false, achievement };
  }
}

/** Award ALL tier badges at or below the given band for a skill family.
 *  Used when a user jumps straight to a high band — they collect every
 *  medal up to their reached tier. Returns the LIST of newly-unlocked
 *  achievements (deduped) so the client popup can play a fanfare for
 *  each (or chain them). */
export async function awardBandTier(
  userId: string,
  family: string,
  band: number,
  context?: Record<string, unknown>,
): Promise<Achievement[]> {
  const codes = allBandTiersBelow(family, band);
  const newlyUnlocked: Achievement[] = [];
  for (const code of codes) {
    const result = await awardAchievement(userId, code, context);
    if (result.unlocked && result.achievement) {
      newlyUnlocked.push(result.achievement);
    }
  }
  return newlyUnlocked;
}

/** Award an arbitrary list of codes idempotently. Returns only the
 *  badges that were newly unlocked. Used for cross-cutting checks
 *  (streak/xp/vocab-perfection) where multiple codes can fire at once. */
export async function awardMany(
  userId: string,
  codes: string[],
  context?: Record<string, unknown>,
): Promise<Achievement[]> {
  const newlyUnlocked: Achievement[] = [];
  for (const code of codes) {
    const result = await awardAchievement(userId, code, context);
    if (result.unlocked && result.achievement) newlyUnlocked.push(result.achievement);
  }
  return newlyUnlocked;
}

/** Get all unlocked achievement codes for a user — used by the
 *  badge-wall page to compute locked-vs-unlocked. Single column scan
 *  so cheap to call on every profile load. */
export async function listUnlockedCodes(userId: string): Promise<string[]> {
  const rows = await prisma.userAchievement.findMany({
    where: { userId },
    select: { code: true },
  });
  return rows.map((r) => r.code);
}
