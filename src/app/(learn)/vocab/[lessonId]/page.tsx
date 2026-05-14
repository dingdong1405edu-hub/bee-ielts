import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { LessonPlayer } from "./lesson-player";

export default async function VocabLessonPage({ params }: { params: { lessonId: string } }) {
  const lesson = await prisma.vocabLesson.findUnique({
    where: { id: params.lessonId },
    include: { unit: true },
  });
  if (!lesson) notFound();
  return <LessonPlayer lessonId={lesson.id} title={lesson.title} unitTitle={lesson.unit.title} exercises={lesson.exercises as Exercise[]} />;
}

type Exercise =
  | { type: "translate"; prompt: string; options: string[]; answer: string }
  | { type: "match"; prompt: string; options: string[]; answer: string }
  | { type: "type"; prompt: string; answer: string };
