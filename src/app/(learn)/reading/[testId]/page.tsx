import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ReadingPlayer } from "./reading-player";

export default async function ReadingTestPage({ params }: { params: { testId: string } }) {
  const test = await prisma.readingTest.findUnique({
    where: { id: params.testId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!test) notFound();
  return (
    <ReadingPlayer
      testId={test.id}
      title={test.title}
      passage={test.passage}
      imageUrl={test.imageUrl}
      questions={test.questions.map((q) => ({
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        options: (q.options as string[] | null) ?? null,
        correctAnswer: q.correctAnswer as string,
        explanation: q.explanation,
        formGroup: q.formGroup,
      }))}
    />
  );
}
