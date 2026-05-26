import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { WritingPlayer } from "@/app/(learn)/writing/[taskId]/writing-player";
import { BandClimbIntro } from "@/components/learn/band-climb-intro";
import { WRITING_DEFAULT_TOUR } from "@/lib/band-climb-tours";
import type { TourStep } from "@/components/learn/bee-guide";

export const dynamic = "force-dynamic";

export default async function BandClimbWritingPage({
  params,
}: {
  params: Promise<{ stageId: string; taskId: string }>;
}) {
  const { stageId, taskId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const task = await prisma.writingTask.findFirst({
    where: { id: taskId, bandStageId: stageId },
  });
  if (!task) notFound();

  const customTour = task.bandClimbTips as TourStep[] | null;
  const steps =
    customTour && Array.isArray(customTour) && customTour.length > 0
      ? customTour
      : WRITING_DEFAULT_TOUR;

  return (
    <BandClimbIntro steps={steps}>
      <WritingPlayer
        taskId={task.id}
        taskType={task.taskType as 1 | 2}
        prompt={task.prompt}
        imageUrl={task.imageUrl}
        diagramSvg={task.diagramSvg}
        minWords={task.minWords}
      />
    </BandClimbIntro>
  );
}
