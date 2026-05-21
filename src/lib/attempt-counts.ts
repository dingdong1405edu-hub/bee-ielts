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
