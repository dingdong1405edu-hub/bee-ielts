import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { RouletteDeck, type RouletteCard } from "./roulette-deck";

export const dynamic = "force-dynamic";

/**
 * Speaking Roulette landing — fanned deck of topic cards. Learner picks a
 * Part (1/2/3), spins the deck or taps a card → answers the prompt with
 * mic + AI feedback. Single-player for now; multiplayer rooms ship in a
 * follow-up.
 */
export default async function SpeakingRoulettePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const rows = await prisma.speakingTopicCard.findMany({
    orderBy: [{ part: "asc" }, { order: "asc" }],
  });
  const cards: RouletteCard[] = rows.map((r) => ({
    id: r.id,
    part: r.part as 1 | 2 | 3,
    topic: r.topic,
    question: r.question,
    talkPoints: (r.talkPoints as string[]) ?? [],
    vocab: (r.vocab as { sentence: string; keyWord: string }[]) ?? [],
    hue: r.hue,
  }));

  return <RouletteDeck cards={cards} />;
}
