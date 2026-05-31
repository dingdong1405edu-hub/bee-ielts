import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { SpeakingPlayer } from "./speaking-player";

type PartNum = 1 | 2 | 3;

function parseParts(raw: string | undefined): PartNum[] | undefined {
  if (!raw) return undefined;
  const out: PartNum[] = [];
  for (const tok of raw.split(",")) {
    const n = Number(tok.trim());
    if (n === 1 || n === 2 || n === 3) out.push(n);
  }
  return out.length > 0 ? out : undefined;
}

export default async function SpeakingSetPage({
  params,
  searchParams,
}: {
  params: { setId: string };
  searchParams: Promise<{ parts?: string }>;
}) {
  const [set, session, sp] = await Promise.all([
    prisma.speakingSet.findUnique({ where: { id: params.setId } }),
    auth(),
    searchParams,
  ]);
  if (!set) notFound();

  let userName: string | null = null;
  if (session?.user?.id) {
    const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } });
    userName = u?.name ?? null;
  }

  const initialParts = parseParts(sp.parts);

  return (
    <SpeakingPlayer
      setId={set.id}
      topic={set.topic}
      imageUrl={set.imageUrl}
      userName={userName}
      part1Questions={set.part1Questions as string[]}
      part2CueCard={set.part2CueCard as { topic: string; points: string[] }}
      part3Questions={set.part3Questions as string[]}
      initialParts={initialParts}
    />
  );
}
