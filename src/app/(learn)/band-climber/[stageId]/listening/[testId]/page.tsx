import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { ListeningPlayer } from "@/app/(learn)/listening/[testId]/listening-player";
import { BandClimbIntro } from "@/components/learn/band-climb-intro";
import { LISTENING_DEFAULT_TOUR } from "@/lib/band-climb-tours";
import type { TourStep } from "@/components/learn/bee-guide";

export const dynamic = "force-dynamic";

export default async function BandClimbListeningPage({
  params,
}: {
  params: Promise<{ stageId: string; testId: string }>;
}) {
  const { stageId, testId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const test = await prisma.listeningTest.findFirst({
    where: { id: testId, bandStageId: stageId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!test) notFound();

  const customTour = test.bandClimbTips as TourStep[] | null;
  const steps =
    customTour && Array.isArray(customTour) && customTour.length > 0
      ? customTour
      : LISTENING_DEFAULT_TOUR;

  return (
    <BandClimbIntro steps={steps}>
      <ListeningPlayer
        testId={test.id}
        title={test.title}
        audioUrl={test.audioUrl}
        imageUrl={test.imageUrl}
        contentImageUrl={test.contentImageUrl}
        transcript={test.transcript}
        questions={test.questions.map((q) => ({
          id: q.id,
          type: q.type,
          prompt: q.prompt,
          options: (q.options as string[] | null) ?? null,
          correctAnswer: q.correctAnswer as string,
          formGroup: q.formGroup,
          displayNumber: q.displayNumber,
        }))}
      />
    </BandClimbIntro>
  );
}
