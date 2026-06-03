import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { MiniQuizPlayer } from "./player";
import type { TourStep } from "@/components/learn/bee-guide";

export const dynamic = "force-dynamic";

export default async function MiniQuizPage({
  params,
}: {
  params: Promise<{ stageId: string; quizId: string }>;
}) {
  const { stageId, quizId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Pull the quiz + its parent stage's per-skill tips in parallel — the
  // player exposes a HƯỚNG DẪN drawer with the same markdown that the
  // band-stage path-view shows, scoped to this quiz's skill.
  const [quiz, stage] = await Promise.all([
    prisma.bandClimbMiniQuiz.findUnique({
      where: { id: quizId },
      include: { questions: { orderBy: { order: "asc" } } },
    }),
    prisma.bandStage.findUnique({
      where: { id: stageId },
      select: {
        reading: true,
        listening: true,
        writing: true,
        speaking: true,
        title: true,
        tipsShowOnMiniQuiz: true,
      },
    }),
  ]);
  if (!quiz || !stage || quiz.bandStageId !== stageId) notFound();
  if (quiz.questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-10 text-center text-muted-foreground">
        Mini-quiz này chưa có câu hỏi nào.
      </div>
    );
  }

  const skill = quiz.skill as "READING" | "LISTENING" | "WRITING" | "SPEAKING";
  const tipMarkdown =
    skill === "READING"
      ? stage.reading
      : skill === "LISTENING"
        ? stage.listening
        : skill === "WRITING"
          ? stage.writing
          : stage.speaking;

  // Admin-authored 🐝 tour for this specific quiz. Null/empty = no overlay,
  // quiz launches immediately (matches the long-test BeeGuide rule).
  const rawTour = quiz.bandClimbTips as TourStep[] | null;
  const customTour = rawTour && Array.isArray(rawTour) && rawTour.length > 0 ? rawTour : null;

  // Admin-curated vocab pack. Null/empty = no pre-quiz preview screen.
  const rawVocab = quiz.vocabPack as
    | { term: string; definition: string; example?: string }[]
    | null;
  const vocabPack =
    rawVocab && Array.isArray(rawVocab) && rawVocab.length > 0 ? rawVocab : null;

  return (
    <MiniQuizPlayer
      stageId={stageId}
      stageTitle={stage.title}
      skill={skill}
      tipMarkdown={stage.tipsShowOnMiniQuiz ? tipMarkdown : ""}
      customTour={customTour}
      vocabPack={vocabPack}
      quiz={{
        id: quiz.id,
        title: quiz.title,
        questions: quiz.questions.map((q) => ({
          id: q.id,
          type: q.type as "IMAGE_CHOICE" | "TEXT_CHOICE" | "FILL_BLANK" | "SPEAKING",
          prompt: q.prompt,
          audioUrl: q.audioUrl,
          options: q.options as { label: string; imageUrl?: string }[],
          correctIndex: q.correctIndex,
          // Admin-authored explanation. Player surfaces it in the verdict
          // bar after the learner checks each non-SPEAKING question. For
          // SPEAKING it's forwarded to the inline grader as a focus hint.
          explanation: q.explanation ?? null,
        })),
      }}
    />
  );
}
