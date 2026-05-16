import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { WritingPlayer } from "./writing-player";

export default async function WritingTaskPage({ params }: { params: { taskId: string } }) {
  const task = await prisma.writingTask.findUnique({ where: { id: params.taskId } });
  if (!task) notFound();
  return (
    <WritingPlayer
      taskId={task.id}
      taskType={task.taskType as 1 | 2}
      prompt={task.prompt}
      imageUrl={task.imageUrl}
      diagramSvg={task.diagramSvg}
      minWords={task.minWords}
      timeLimit={task.timeLimit}
    />
  );
}
