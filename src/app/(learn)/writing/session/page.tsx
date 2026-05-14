import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { WritingSession } from "./writing-session";

export const dynamic = "force-dynamic";

export default async function WritingSessionPage({ searchParams }: { searchParams: { t1?: string; t2?: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { t1, t2 } = searchParams;
  if (!t1 || !t2) redirect("/writing");

  const [task1, task2] = await Promise.all([
    prisma.writingTask.findUnique({ where: { id: t1 } }),
    prisma.writingTask.findUnique({ where: { id: t2 } }),
  ]);
  if (!task1 || !task2) redirect("/writing");

  return (
    <WritingSession
      task1={{
        id: task1.id,
        prompt: task1.prompt,
        imageUrl: task1.imageUrl,
        minWords: task1.minWords,
      }}
      task2={{
        id: task2.id,
        prompt: task2.prompt,
        minWords: task2.minWords,
      }}
    />
  );
}
