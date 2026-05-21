import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { SpeakingSetForm } from "@/components/admin/speaking-set-form";

export default async function EditSpeakingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const set = await prisma.speakingSet.findUnique({ where: { id } });
  if (!set) notFound();

  return (
    <SpeakingSetForm
      initial={{
        id: set.id,
        topic: set.topic,
        imageUrl: set.imageUrl,
        part1Questions: (set.part1Questions as string[]) ?? [],
        part2CueCard: (set.part2CueCard as { topic: string; points: string[] }) ?? { topic: "", points: [] },
        part3Questions: (set.part3Questions as string[]) ?? [],
      }}
    />
  );
}
