import { ListeningTestForm } from "@/components/admin/listening-test-form";

export default async function NewListeningPracticePage({
  searchParams,
}: {
  searchParams: Promise<{ stageId?: string }>;
}) {
  const { stageId } = await searchParams;
  return <ListeningTestForm bank="PRACTICE" defaultBandStageId={stageId} />;
}
