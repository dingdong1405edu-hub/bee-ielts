import { SpeakingSetForm } from "@/components/admin/speaking-set-form";

export default async function NewSpeakingSetPage({
  searchParams,
}: {
  searchParams: Promise<{ stageId?: string }>;
}) {
  const { stageId } = await searchParams;
  return <SpeakingSetForm defaultBandStageId={stageId} />;
}
