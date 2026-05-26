import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { WritingTaskForm } from "@/components/admin/writing-task-form";
import type { TourStepDraft } from "@/components/admin/band-climb-tours-editor";

export default async function EditWritingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const task = await prisma.writingTask.findUnique({ where: { id } });
  if (!task) notFound();

  return (
    <WritingTaskForm
      initial={{
        id: task.id,
        taskType: task.taskType,
        prompt: task.prompt,
        imageUrl: task.imageUrl,
        minWords: task.minWords,
        timeLimit: task.timeLimit,
        bandStageId: task.bandStageId,
        bandClimbTips: (task.bandClimbTips as TourStepDraft[] | null) ?? [],
      }}
    />
  );
}
