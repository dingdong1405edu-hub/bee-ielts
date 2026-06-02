import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { MiniQuizPlayer } from "./player";

export const dynamic = "force-dynamic";

export default async function MiniQuizPage({
  params,
}: {
  params: Promise<{ stageId: string; quizId: string }>;
}) {
  const { stageId, quizId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const quiz = await prisma.bandClimbMiniQuiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!quiz || quiz.bandStageId !== stageId) notFound();
  if (quiz.questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-10 text-center text-muted-foreground">
        Mini-quiz này chưa có câu hỏi nào.
      </div>
    );
  }

  return (
    <MiniQuizPlayer
      stageId={stageId}
      quiz={{
        id: quiz.id,
        title: quiz.title,
        questions: quiz.questions.map((q) => ({
          id: q.id,
          type: q.type as "IMAGE_CHOICE" | "TEXT_CHOICE",
          prompt: q.prompt,
          options: q.options as { label: string; imageUrl?: string }[],
          correctIndex: q.correctIndex,
        })),
      }}
    />
  );
}
