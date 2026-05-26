import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { SpeakingPlayer } from "@/app/(learn)/speaking/[setId]/speaking-player";
import { BandClimbIntro } from "@/components/learn/band-climb-intro";
import { SPEAKING_DEFAULT_TOUR } from "@/lib/band-climb-tours";
import type { TourStep } from "@/components/learn/bee-guide";

export const dynamic = "force-dynamic";

export default async function BandClimbSpeakingPage({
  params,
}: {
  params: Promise<{ stageId: string; setId: string }>;
}) {
  const { stageId, setId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [set, sessionUser] = await Promise.all([
    prisma.speakingSet.findFirst({ where: { id: setId, bandStageId: stageId } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } }),
  ]);
  if (!set) notFound();

  const customTour = set.bandClimbTips as TourStep[] | null;
  const steps =
    customTour && Array.isArray(customTour) && customTour.length > 0
      ? customTour
      : SPEAKING_DEFAULT_TOUR;

  return (
    <BandClimbIntro steps={steps}>
      <SpeakingPlayer
        setId={set.id}
        topic={set.topic}
        imageUrl={set.imageUrl}
        userName={sessionUser?.name ?? null}
        part1Questions={set.part1Questions as string[]}
        part2CueCard={set.part2CueCard as { topic: string; points: string[] }}
        part3Questions={set.part3Questions as string[]}
      />
    </BandClimbIntro>
  );
}
