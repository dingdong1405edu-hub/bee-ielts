import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { pickLeastRecentId, recentRefIdsForSkill } from "@/lib/pick-next";

export const dynamic = "force-dynamic";

export default async function ReadingStartPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const recentIds = await recentRefIdsForSkill(prisma, session.user.id, "READING");

  // Practise = 1 bài đọc duy nhất từ kho practice (thi thử dùng kho MOCK riêng).
  const all = await prisma.readingTest.findMany({ where: { bank: "PRACTICE", bandStageId: null }, select: { id: true } });
  if (all.length === 0) redirect("/reading");

  const pick = pickLeastRecentId(all.map((t) => t.id), recentIds)!;
  redirect(`/reading/session?ids=${pick}`);
}
