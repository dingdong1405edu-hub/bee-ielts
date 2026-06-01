import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { WritingPlayer } from "@/app/(learn)/writing/[taskId]/writing-player";
import { BandClimbIntro } from "@/components/learn/band-climb-intro";
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

  // Only show bee when admin has authored a tour for THIS specific task.
  const rawTour = task.bandClimbTips as TourStep[] | null;
  const customTour = Array.isArray(rawTour) && rawTour.length > 0 ? rawTour : null;

  return (
    <BandClimbIntro steps={customTour}>
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
