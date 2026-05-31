import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

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

  const recent = await prisma.attempt.findMany({
    where: { userId: session.user.id, skill: "SPEAKING" },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: { refId: true },
  });
  const recentIds = recent.map((r) => r.refId.replace("mock-", ""));

  let set = await prisma.speakingSet.findFirst({
    where: { bandStageId: null, id: { notIn: recentIds.length > 0 ? recentIds : ["__none__"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!set) {
    const all = await prisma.speakingSet.findMany({ where: { bandStageId: null }, select: { id: true } });
    if (all.length === 0) redirect("/speaking");
    set = (await prisma.speakingSet.findUnique({ where: { id: all[Math.floor(Math.random() * all.length)].id } }))!;
  }
  redirect(`/speaking/${set.id}${partsQs}`);
}
