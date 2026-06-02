import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { MiniQuizForm } from "../mini-quiz-form";

export const dynamic = "force-dynamic";

export default async function EditMiniQuizPage({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}) {
  const { id, quizId } = await params;
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    redirect("/dashboard");
  }
  const [stage, quiz] = await Promise.all([
    prisma.bandStage.findUnique({
      where: { id },
      select: { id: true, title: true, fromBand: true, toBand: true },
    }),
    prisma.bandClimbMiniQuiz.findUnique({
      where: { id: quizId },
      include: { questions: { orderBy: { order: "asc" } } },
    }),
  ]);
  if (!stage || !quiz || quiz.bandStageId !== id) notFound();

  return (
    <MiniQuizForm
      stage={stage}
      mode="edit"
      initial={{
        id: quiz.id,
        title: quiz.title,
        skill: quiz.skill as "READING" | "LISTENING" | "WRITING" | "SPEAKING",
        questions: quiz.questions.map((q) => ({
          type: q.type as "IMAGE_CHOICE" | "TEXT_CHOICE",
          prompt: q.prompt,
          options: q.options as { label: string; imageUrl?: string }[],
          correctIndex: q.correctIndex,
        })),
      }}
    />
  );
}
