import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ReadingSession } from "./reading-session";

export const dynamic = "force-dynamic";

export default async function ReadingSessionPage({ searchParams }: { searchParams: { ids?: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const ids = (searchParams.ids ?? "").split(",").filter(Boolean);
  if (ids.length < 1) redirect("/reading");

  const [tests, user] = await Promise.all([
    prisma.readingTest.findMany({
      where: { id: { in: ids } },
      include: { questions: { orderBy: { order: "asc" } } },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { targetBand: true },
    }),
  ]);

  // Preserve order from query string
  const orderedTests = ids.map((id) => tests.find((t) => t.id === id)).filter((t) => t != null) as typeof tests;
  if (orderedTests.length === 0) redirect("/reading");

  return (
    <ReadingSession
      targetBand={user?.targetBand ?? 6.0}
      passages={orderedTests.map((t) => ({
        id: t.id,
        title: t.title,
        level: t.level,
        passage: t.passage,
        imageUrl: t.imageUrl,
        questions: t.questions.map((q) => ({
          id: q.id,
          type: q.type,
          prompt: q.prompt,
          options: (q.options as string[] | null) ?? null,
          correctAnswer: q.correctAnswer as string,
          formGroup: q.formGroup,
          displayNumber: q.displayNumber,
        })),
      }))}
    />
  );
}
