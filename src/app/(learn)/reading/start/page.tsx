import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const SLOTS = ["A", "B", "C", "D"] as const;

function pickRandom<T>(arr: T[], n: number): T[] {
  const a = [...arr];
  const out: T[] = [];
  while (out.length < n && a.length > 0) {
    const i = Math.floor(Math.random() * a.length);
    out.push(a.splice(i, 1)[0]);
  }
  return out;
}

export default async function ReadingStartPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const recent = await prisma.attempt.findMany({
    where: { userId: session.user.id, skill: "READING" },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { refId: true },
  });
  const recentIds = new Set(recent.map((r) => r.refId.replace("mock-", "")));

  // ONLY pick from slot-tagged passages — these have clean 2-group structure.
  // Legacy un-slotted passages (mixed question types) are excluded from session picks.
  const ordered: string[] = [];
  for (const slot of SLOTS) {
    const fresh = await prisma.readingTest.findMany({
      where: { slot, id: { notIn: Array.from(recentIds).concat(ordered) } },
      select: { id: true },
    });
    if (fresh.length > 0) {
      ordered.push(pickRandom(fresh, 1)[0].id);
      continue;
    }
    // No fresh in this slot — fall back to any in this slot (allow repeats)
    const any = await prisma.readingTest.findMany({
      where: { slot, id: { notIn: ordered } },
      select: { id: true },
    });
    if (any.length > 0) ordered.push(pickRandom(any, 1)[0].id);
  }

  if (ordered.length === 0) redirect("/reading");

  redirect(`/reading/session?ids=${ordered.join(",")}`);
}
