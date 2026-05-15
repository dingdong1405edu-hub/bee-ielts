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

  // Strategy: for each of the 4 slots (A/B/C/D), pick 1 not-recently-done passage.
  // If a slot has no fresh passage, fall back to any from that slot. If a slot has
  // nothing at all, fall back to any random passage so the session still gets 4.
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
    const any = await prisma.readingTest.findMany({
      where: { slot, id: { notIn: ordered } },
      select: { id: true },
    });
    if (any.length > 0) ordered.push(pickRandom(any, 1)[0].id);
  }

  // Top up from un-slotted legacy passages if we got fewer than 4
  if (ordered.length < 4) {
    const filler = await prisma.readingTest.findMany({
      where: { id: { notIn: Array.from(recentIds).concat(ordered) } },
      select: { id: true },
    });
    const need = 4 - ordered.length;
    ordered.push(...pickRandom(filler, need).map((f) => f.id));
  }

  if (ordered.length === 0) {
    const all = await prisma.readingTest.findMany({ select: { id: true } });
    if (all.length === 0) redirect("/reading");
    ordered.push(...pickRandom(all, 4).map((a) => a.id));
  }

  redirect(`/reading/session?ids=${ordered.join(",")}`);
}
