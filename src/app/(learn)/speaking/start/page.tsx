import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { pickLeastRecentId, recentRefIdsForSkill } from "@/lib/pick-next";

export const dynamic = "force-dynamic";

export default async function SpeakingStartPage({
  searchParams,
}: {
  searchParams: Promise<{ parts?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sp = await searchParams;
  const partsQs = sp.parts ? `?parts=${encodeURIComponent(sp.parts)}` : "";

  const recentIds = await recentRefIdsForSkill(prisma, session.user.id, "SPEAKING");

  const all = await prisma.speakingSet.findMany({
    where: { bandStageId: null },
    select: { id: true },
  });
  if (all.length === 0) redirect("/speaking");

  const pick = pickLeastRecentId(all.map((s) => s.id), recentIds)!;
  redirect(`/speaking/${pick}${partsQs}`);
}
