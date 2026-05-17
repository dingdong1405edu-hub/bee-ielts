import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A random vocab card from the user's decks, as a 4-option quiz (pop quiz). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cards = await prisma.wordCard.findMany({
    where: { deck: { userId: session.user.id } },
    select: { id: true, term: true, definition: true },
  });
  if (cards.length === 0) return NextResponse.json({ card: null });

  const target = cards[Math.floor(Math.random() * cards.length)];
  const distractors = shuffle(cards.filter((c) => c.id !== target.id))
    .slice(0, 3)
    .map((c) => c.definition);
  const options = shuffle([target.definition, ...distractors]);

  return NextResponse.json({
    card: { term: target.term, answer: target.definition, options },
  });
}
