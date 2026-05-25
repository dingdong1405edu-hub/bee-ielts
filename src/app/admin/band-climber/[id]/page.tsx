import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { BandStageForm } from "@/components/admin/band-stage-form";

export default async function EditBandStagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const stage = await prisma.bandStage.findUnique({ where: { id } });
  if (!stage) notFound();

  return (
    <BandStageForm
      initial={{
        id: stage.id,
        fromBand: stage.fromBand,
        toBand: stage.toBand,
        title: stage.title,
        subtitle: stage.subtitle,
        description: stage.description,
        order: stage.order,
        reading: stage.reading,
        listening: stage.listening,
        writing: stage.writing,
        speaking: stage.speaking,
      }}
    />
  );
}
