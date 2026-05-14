import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function WritingAutoPickPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const recent = await prisma.attempt.findMany({
    where: { userId: session.user.id, skill: "WRITING" },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { refId: true },
  });
  const recentIds = recent.map((r) => r.refId.replace("mock-", ""));

  let task = await prisma.writingTask.findFirst({
    where: { id: { notIn: recentIds.length > 0 ? recentIds : ["__none__"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!task) {
    const all = await prisma.writingTask.findMany({ select: { id: true } });
    if (all.length === 0) {
      return (
        <div className="max-w-md mx-auto text-center py-20">
          <h1 className="text-2xl font-extrabold">Chưa có Writing task</h1>
        </div>
      );
    }
    task = (await prisma.writingTask.findUnique({ where: { id: all[Math.floor(Math.random() * all.length)].id } }))!;
  }

  redirect(`/writing/${task.id}`);
}
