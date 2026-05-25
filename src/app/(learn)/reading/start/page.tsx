import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default async function ReadingStartPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const recent = await prisma.attempt.findMany({
    where: { userId: session.user.id, skill: "READING" },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: { refId: true },
  });
  const recentIds = new Set(recent.map((r) => r.refId.replace("mock-", "")));

  // Practise = 1 bài đọc duy nhất từ kho practice (thi thử dùng kho MOCK riêng).
  const all = await prisma.readingTest.findMany({ where: { bank: "PRACTICE", bandStageId: null }, select: { id: true } });
  if (all.length === 0) redirect("/reading");

  const fresh = all.filter((t) => !recentIds.has(t.id));
  const pick = pickRandom(fresh.length > 0 ? fresh : all);

  redirect(`/reading/session?ids=${pick.id}`);
}
