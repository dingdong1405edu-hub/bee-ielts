import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ListeningStartPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const recent = await prisma.attempt.findMany({
    where: { userId: session.user.id, skill: "LISTENING" },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: { refId: true },
  });
  const recentIds = recent.map((r) => r.refId.replace("mock-", ""));

  let test = await prisma.listeningTest.findFirst({
    where: { bank: "PRACTICE", bandStageId: null, id: { notIn: recentIds.length > 0 ? recentIds : ["__none__"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!test) {
    const all = await prisma.listeningTest.findMany({ where: { bank: "PRACTICE", bandStageId: null }, select: { id: true } });
    if (all.length === 0) redirect("/listening");
    test = (await prisma.listeningTest.findUnique({ where: { id: all[Math.floor(Math.random() * all.length)].id } }))!;
  }
  redirect(`/listening/${test.id}`);
}
