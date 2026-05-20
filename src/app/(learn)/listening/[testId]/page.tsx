import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ListeningPlayer } from "./listening-player";

export default async function ListeningTestPage({ params }: { params: { testId: string } }) {
  const test = await prisma.listeningTest.findUnique({
    where: { id: params.testId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!test) notFound();
  return (
    <ListeningPlayer
      testId={test.id}
      title={test.title}
      audioUrl={test.audioUrl}
      imageUrl={test.imageUrl}
      transcript={test.transcript}
      questions={test.questions.map((q) => ({
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        options: (q.options as string[] | null) ?? null,
        correctAnswer: q.correctAnswer as string,
      }))}
    />
  );
}
