import { ReadingTestForm } from "@/components/admin/reading-test-form";
import { ReadingAiImport } from "@/components/admin/reading-ai-import";

export default async function NewReadingPracticePage({
  searchParams,
}: {
  searchParams: Promise<{ stageId?: string }>;
}) {
  const { stageId } = await searchParams;
  return (
    <div className="space-y-6">
      <ReadingAiImport bank="PRACTICE" />
      <ReadingTestForm bank="PRACTICE" defaultBandStageId={stageId} />
    </div>
  );
}
