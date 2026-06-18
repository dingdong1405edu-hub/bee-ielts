import { prisma } from "@/lib/db";
import type { Skill } from "@prisma/client";

/**
 * Total attempt counts per test id for a skill, folding the "mock-" refId
 * prefix into the base id so practice and mock attempts are counted together.
 */
export async function attemptCounts(skill: Skill): Promise<Map<string, number>> {
  const groups = await prisma.attempt.groupBy({
    by: ["refId"],
    where: { skill },
    _count: { _all: true },
  });
  const map = new Map<string, number>();
  for (const g of groups) {
    const key = g.refId.replace(/^mock-/, "");
    map.set(key, (map.get(key) ?? 0) + g._count._all);
  }
  return map;
}

/** Stable hash of a string → unsigned 32-bit int (djb-ish). */
function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h = (h ^ id.charCodeAt(i)) * 16777619;
  }
  return h >>> 0;
}

/**
 * Social-proof attempt count shown on the test lists. Every test gets a STABLE
 * baseline in [300, 500] derived from its id (so the number doesn't jump on
 * reload and varies test-to-test), with the REAL attempt count added on top so
 * genuinely popular tests still rank a little higher. Display-only — never use
 * for logic (quotas, pick-next, etc.).
 */
export function displayAttemptCount(refId: string, realCount: number): number {
  const baseline = 300 + (hashId(refId) % 201); // 300..500 inclusive
  return baseline + realCount;
}
