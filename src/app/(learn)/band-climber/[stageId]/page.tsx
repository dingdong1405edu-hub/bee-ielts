import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PathView, type PathGroup } from "./path-view";

export const dynamic = "force-dynamic";

export default async function BandStagePage({
  params,
}: {
  params: Promise<{ stageId: string }>;
}) {
  const { stageId } = await params;
  const stage = await prisma.bandStage.findUnique({
    where: { id: stageId },
    include: {
      readingTests: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          level: true,
          // _count avoids hydrating the full question rows just to read a length.
          _count: { select: { questions: true } },
        },
      },
      listeningTests: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          _count: { select: { questions: true } },
        },
      },
      writingTasks: {
        orderBy: { createdAt: "asc" },
        select: { id: true, taskType: true, prompt: true, minWords: true },
      },
      speakingSets: {
        orderBy: { createdAt: "asc" },
        select: { id: true, topic: true },
      },
    },
  });
  if (!stage) notFound();

  const allGroups: PathGroup[] = [
    {
      skill: "reading",
      label: "Reading",
      exercises: stage.readingTests.map((t) => ({
        id: t.id,
        title: t.title,
        subtitle: `${t.level} · ${t._count.questions} câu`,
        href: `/band-climber/${stage.id}/reading/${t.id}`,
      })),
    },
    {
      skill: "listening",
      label: "Listening",
      exercises: stage.listeningTests.map((t) => ({
        id: t.id,
        title: t.title,
        subtitle: `${t._count.questions} câu`,
        href: `/band-climber/${stage.id}/listening/${t.id}`,
      })),
    },
    {
      skill: "writing",
      label: "Writing",
      exercises: stage.writingTasks.map((t) => ({
        id: t.id,
        title: `Task ${t.taskType} — ${t.prompt.split("\n")[0].slice(0, 60)}`,
        subtitle: `Tối thiểu ${t.minWords} từ`,
        href: `/band-climber/${stage.id}/writing/${t.id}`,
      })),
    },
    {
      skill: "speaking",
      label: "Speaking",
      exercises: stage.speakingSets.map((s) => ({
        id: s.id,
        title: s.topic,
        subtitle: "Speaking Part 1 + 2 + 3",
        href: `/band-climber/${stage.id}/speaking/${s.id}`,
      })),
    },
  ];
  const groups = allGroups.filter((g) => g.exercises.length > 0);

  return (
    <PathView
      stage={{
        id: stage.id,
        fromBand: stage.fromBand,
        toBand: stage.toBand,
        title: stage.title,
        subtitle: stage.subtitle,
        description: stage.description,
      }}
      groups={groups}
      tips={{
        reading: stage.reading,
        listening: stage.listening,
        writing: stage.writing,
        speaking: stage.speaking,
      }}
    />
  );
}
