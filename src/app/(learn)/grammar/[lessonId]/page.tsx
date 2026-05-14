import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { GrammarPlayer } from "./grammar-player";

export default async function GrammarLessonPage({ params }: { params: { lessonId: string } }) {
  const lesson = await prisma.grammarLesson.findUnique({
    where: { id: params.lessonId },
    include: { unit: true },
  });
  if (!lesson) notFound();
  return (
    <GrammarPlayer
      lessonId={lesson.id}
      title={lesson.title}
      unitTitle={lesson.unit.title}
      content={lesson.content}
      exercises={lesson.exercises as { type: "fill"; prompt: string; answer: string }[]}
    />
  );
}
