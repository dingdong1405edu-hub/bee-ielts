import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { pickLeastRecentId, recentRefIdsForSkill } from "@/lib/pick-next";

export const dynamic = "force-dynamic";

export default async function ListeningStartPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const recentIds = await recentRefIdsForSkill(prisma, session.user.id, "LISTENING");

  const all = await prisma.listeningTest.findMany({
    where: { bank: "PRACTICE", bandStageId: null },
    select: { id: true },
  });
  if (all.length === 0) redirect("/listening");

  const pick = pickLeastRecentId(all.map((t) => t.id), recentIds)!;
  redirect(`/listening/${pick}`);
}
