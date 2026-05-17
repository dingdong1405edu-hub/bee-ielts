import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { DeckView } from "@/components/words/deck-view";

export const dynamic = "force-dynamic";

export default async function DeckPage({ params }: { params: { deckId: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const deck = await prisma.wordDeck.findUnique({
    where: { id: params.deckId },
    include: { cards: { orderBy: { createdAt: "asc" } } },
  });
  if (!deck || deck.userId !== session.user.id) notFound();

  return (
    <DeckView
      deck={{ id: deck.id, title: deck.title }}
      cards={deck.cards.map((c) => ({
        id: c.id,
        term: c.term,
        definition: c.definition,
        example: c.example,
      }))}
    />
  );
}
