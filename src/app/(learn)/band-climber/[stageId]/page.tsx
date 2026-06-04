import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PathView, type PathGroup } from "./path-view";

export const dynamic = "force-dynamic";

export default async function BandStagePage({
  params,
}: {
  params: Promise<{ stageId: string }>;
}) {
  const { stageId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
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

  // Server-side lock guard. Mirror the same rule the list page applies so
  // a learner can't deep-link past the gate. Stages at or below the user's
  // placement band stay open (entry + review); any higher stage requires
  // the previous one to be marked complete. Without a placement band we
  // send them back to /band-climber where the PlacementGate pushes them
  // to take the mock.
  const [user, allStages, progress] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { placementBand: true },
    }),
    prisma.bandStage.findMany({
      orderBy: [{ order: "asc" }, { fromBand: "asc" }],
      select: { id: true, fromBand: true },
    }),
    prisma.bandStageProgress.findMany({
      where: { userId: session.user.id },
      select: { bandStageId: true },
    }),
  ]);
  const completedSet = new Set(progress.map((p) => p.bandStageId));
  const isCurrentCompleted = completedSet.has(stage.id);

  if (user?.placementBand == null) redirect("/band-climber");
  {
    const entryFromBand = user.placementBand;
    let prevDone = true;
    let allowed = false;
    for (const s of allStages) {
      const open =
        s.fromBand <= entryFromBand
          ? true
          : prevDone;
      if (s.id === stage.id) {
        allowed = open;
        break;
      }
      // Update prevDone for the NEXT iteration's gate check.
      if (s.fromBand <= entryFromBand) {
        prevDone = completedSet.has(s.id);
      } else if (prevDone) {
        prevDone = completedSet.has(s.id);
      }
    }
    if (!allowed) redirect("/band-climber");
  }

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
      initiallyCompleted={isCurrentCompleted}
    />
  );
}
