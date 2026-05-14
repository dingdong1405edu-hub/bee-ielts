import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default async function WritingStartPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const recent = await prisma.attempt.findMany({
    where: { userId: session.user.id, skill: "WRITING" },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { refId: true },
  });
  const recentIds = new Set(recent.map((r) => r.refId.replace("mock-", "")));

  const [t1Pool, t2Pool] = await Promise.all([
    prisma.writingTask.findMany({ where: { taskType: 1 }, select: { id: true } }),
    prisma.writingTask.findMany({ where: { taskType: 2 }, select: { id: true } }),
  ]);
  if (t1Pool.length === 0 || t2Pool.length === 0) redirect("/writing");

  const t1Fresh = t1Pool.filter((t) => !recentIds.has(t.id));
  const t2Fresh = t2Pool.filter((t) => !recentIds.has(t.id));
  const t1 = pickRandom(t1Fresh.length > 0 ? t1Fresh : t1Pool);
  const t2 = pickRandom(t2Fresh.length > 0 ? t2Fresh : t2Pool);
  redirect(`/writing/session?t1=${t1.id}&t2=${t2.id}`);
}
