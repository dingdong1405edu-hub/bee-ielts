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
      // Pull Duolingo-style mini-quizzes too — fold them into the relevant
      // skill group below so they show up as path nodes alongside the
      // longer full-skill exercises.
      miniQuizzes: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          skill: true,
          _count: { select: { questions: true } },
        },
      },
    },
  });
  if (!stage) notFound();

  // Mini-quizzes are part of the chặng — flowed inline with the long tests
  // in their skill column, distinguished only by node size/color. Each
  // entry carries a `kind` so path-view can pick the right node renderer.
  const miniBySkill = (s: "READING" | "LISTENING" | "WRITING" | "SPEAKING") =>
    stage.miniQuizzes
      .filter((q) => q.skill === s)
      .map((q) => ({
        id: `mini-${q.id}`,
        title: q.title,
        subtitle: `${q._count.questions} câu`,
        href: `/band-climber/${stage.id}/mini-quiz/${q.id}`,
        kind: "quiz" as const,
      }));

  // Order: mini-quiz first (warm-up), then long tests — matches the
  // Duolingo intuition of doing short bites before tackling a full passage.
  const allGroups: PathGroup[] = [
    {
      skill: "reading",
      label: "Reading",
      exercises: [
        ...miniBySkill("READING"),
        ...stage.readingTests.map((t) => ({
          id: t.id,
          title: t.title,
          subtitle: `${t.level} · ${t._count.questions} câu`,
          href: `/band-climber/${stage.id}/reading/${t.id}`,
          kind: "test" as const,
        })),
      ],
    },
    {
      skill: "listening",
      label: "Listening",
      exercises: [
        ...miniBySkill("LISTENING"),
        ...stage.listeningTests.map((t) => ({
          id: t.id,
          title: t.title,
          subtitle: `${t._count.questions} câu`,
          href: `/band-climber/${stage.id}/listening/${t.id}`,
          kind: "test" as const,
        })),
      ],
    },
    {
      skill: "writing",
      label: "Writing",
      exercises: [
        ...miniBySkill("WRITING"),
        ...stage.writingTasks.map((t) => ({
          id: t.id,
          title: `Task ${t.taskType} — ${t.prompt.split("\n")[0].slice(0, 60)}`,
          subtitle: `Tối thiểu ${t.minWords} từ`,
          href: `/band-climber/${stage.id}/writing/${t.id}`,
          kind: "test" as const,
        })),
      ],
    },
    {
      skill: "speaking",
      label: "Speaking",
      exercises: [
        ...miniBySkill("SPEAKING"),
        ...stage.speakingSets.map((s) => ({
          id: s.id,
          title: s.topic,
          subtitle: "Speaking Part 1 + 2 + 3",
          href: `/band-climber/${stage.id}/speaking/${s.id}`,
          kind: "test" as const,
        })),
      ],
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
      showTipsButton={stage.tipsShowOnTest}
    />
  );
}
