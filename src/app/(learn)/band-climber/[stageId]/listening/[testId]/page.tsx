import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { ListeningPlayer } from "@/app/(learn)/listening/[testId]/listening-player";
import { BandClimbIntro } from "@/components/learn/band-climb-intro";
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

  // Only show bee when admin has authored a tour for THIS specific test.
  // No tour authored -> no bee at all (no fallback to a default script).
  const rawTour = test.bandClimbTips as TourStep[] | null;
  const customTour = Array.isArray(rawTour) && rawTour.length > 0 ? rawTour : null;

  return (
    <BandClimbIntro steps={customTour}>
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
