import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { SpeakingPlayer } from "./speaking-player";

export default async function SpeakingSetPage({ params }: { params: { setId: string } }) {
  const [set, session] = await Promise.all([
    prisma.speakingSet.findUnique({ where: { id: params.setId } }),
    auth(),
  ]);
  if (!set) notFound();

  let userName: string | null = null;
  if (session?.user?.id) {
    const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } });
    userName = u?.name ?? null;
  }

  return (
    <SpeakingPlayer
      setId={set.id}
      topic={set.topic}
      imageUrl={set.imageUrl}
      userName={userName}
      part1Questions={set.part1Questions as string[]}
      part2CueCard={set.part2CueCard as { topic: string; points: string[] }}
      part3Questions={set.part3Questions as string[]}
    />
  );
}
