import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SpeakingPlayer } from "./speaking-player";

export default async function SpeakingSetPage({ params }: { params: { setId: string } }) {
  const set = await prisma.speakingSet.findUnique({ where: { id: params.setId } });
  if (!set) notFound();
  return (
    <SpeakingPlayer
      setId={set.id}
      topic={set.topic}
      part1Questions={set.part1Questions as string[]}
      part2CueCard={set.part2CueCard as { topic: string; points: string[] }}
      part3Questions={set.part3Questions as string[]}
    />
  );
}
