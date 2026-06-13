import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { pickLeastRecentId, recentRefIdsForSkill } from "@/lib/pick-next";

export const dynamic = "force-dynamic";

export default async function WritingStartPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const recentIds = await recentRefIdsForSkill(prisma, session.user.id, "WRITING");

  const [t1Pool, t2Pool] = await Promise.all([
    prisma.writingTask.findMany({ where: { taskType: 1, bandStageId: null }, select: { id: true } }),
    prisma.writingTask.findMany({ where: { taskType: 2, bandStageId: null }, select: { id: true } }),
  ]);
  if (t1Pool.length === 0 || t2Pool.length === 0) redirect("/writing");

  // Mỗi loại task chọn riêng để tránh trùng đề Task 1 / Task 2 đã làm gần đây.
  const t1 = pickLeastRecentId(t1Pool.map((t) => t.id), recentIds)!;
  const t2 = pickLeastRecentId(t2Pool.map((t) => t.id), recentIds)!;
  redirect(`/writing/session?t1=${t1}&t2=${t2}`);
}
