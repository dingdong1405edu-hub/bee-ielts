import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ReadingTestForm } from "@/components/admin/reading-test-form";
import type { TourStepDraft } from "@/components/admin/band-climb-tours-editor";

export default async function EditReadingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const test = await prisma.readingTest.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!test) notFound();

  return (
    <ReadingTestForm
      bank={test.bank}
      initial={{
        id: test.id,
        title: test.title,
        passage: test.passage,
        imageUrl: test.imageUrl,
        level: test.level,
        bandStageId: test.bandStageId,
        bandClimbTips: (test.bandClimbTips as TourStepDraft[] | null) ?? [],
        questions: test.questions.map((q) => ({
          type: q.type,
          prompt: q.prompt,
          options: (q.options as string[] | null) ?? null,
          correctAnswer: q.correctAnswer as string,
          explanation: q.explanation,
          formGroup: q.formGroup,
          displayNumber: q.displayNumber,
        })),
      }}
    />
  );
}
