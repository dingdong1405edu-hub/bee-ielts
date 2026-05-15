import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function bandToCEFR(band: number): "A2" | "B1" | "B2" | "C1" | "C2" {
  if (band <= 4.5) return "A2";
  if (band <= 5.5) return "B1";
  if (band <= 6.5) return "B2";
  if (band <= 7.5) return "C1";
  return "C2";
}
const SESSION_SIZE = 3;
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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { targetBand: true },
  });
  const cefr = bandToCEFR(user?.targetBand ?? 6.0);

  const recent = await prisma.attempt.findMany({
    where: { userId: session.user.id, skill: "READING" },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { refId: true },
  });
  const recentIds = new Set(recent.map((r) => r.refId.replace("mock-", "")));

  let candidates = await prisma.readingTest.findMany({
    where: { level: cefr, id: { notIn: Array.from(recentIds) } },
    select: { id: true },
  });
  if (candidates.length < SESSION_SIZE) {
    const more = await prisma.readingTest.findMany({
      where: { id: { notIn: Array.from(recentIds) } },
      select: { id: true },
    });
    candidates = [...candidates, ...more.filter((m) => !candidates.find((c) => c.id === m.id))];
  }
  if (candidates.length < SESSION_SIZE) {
    candidates = await prisma.readingTest.findMany({ select: { id: true } });
  }
  if (candidates.length === 0) redirect("/reading");

  const picked = pickRandom(candidates, Math.min(SESSION_SIZE, candidates.length));
  const ids = picked.map((p) => p.id).join(",");
  redirect(`/reading/session?ids=${ids}`);
}
