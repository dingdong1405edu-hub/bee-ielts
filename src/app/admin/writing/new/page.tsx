import { WritingTaskForm } from "@/components/admin/writing-task-form";

export default async function NewWritingTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ stageId?: string }>;
}) {
  const { stageId } = await searchParams;
  return <WritingTaskForm defaultBandStageId={stageId} />;
}
