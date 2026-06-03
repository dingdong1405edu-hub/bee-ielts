import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { defineWordGroq } from "@/lib/groq";

const schema = z.object({
  term: z.string().min(1).max(120),
  /** Optional source label — surfaced in the toast / future deck filtering
   *  (e.g. "Bee tour · 4→5: The Hidden World of Honey Bees"). */
  source: z.string().max(200).optional(),
});

const QUICK_DECK_TITLE = "Vượt band — Tự thu thập";

/**
 * One-tap "add this word to my vocabulary" endpoint used by the BeeGuide
 * highlight chips. Atomically:
 *   1. Finds (or creates) the user's "Vượt band — Tự thu thập" deck.
 *   2. If the term already exists in that deck, returns the existing card.
 *   3. Otherwise calls Groq to generate a Vietnamese definition + English
 *      example sentence and creates the card.
 *
 * Returns enough metadata for the client to render a satisfying toast
 * ("Đã thêm 'X' vào bộ thẻ Vượt band — Tự thu thập") + a deep link.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Thiếu term" }, { status: 400 });
  }
  const term = parsed.data.term.trim();
  if (!term) {
    return NextResponse.json({ error: "Thiếu term" }, { status: 400 });
  }

  const userId = session.user.id;

  try {
    // Find-or-create the quick deck. Plain findFirst + create (no @@unique
    // on title+userId) because the deck title can be edited by the user
    // later if they rename it.
    let deck = await prisma.wordDeck.findFirst({
      where: { userId, title: QUICK_DECK_TITLE },
      select: { id: true, title: true },
    });
    if (!deck) {
      deck = await prisma.wordDeck.create({
        data: { userId, title: QUICK_DECK_TITLE },
        select: { id: true, title: true },
      });
    }

    // De-dupe: if the same term (case-insensitive) is already in this deck,
    // skip the Groq call and return the existing card. Saves AI tokens and
    // keeps the toast honest ("Đã có sẵn trong bộ thẻ").
    const existing = await prisma.wordCard.findFirst({
      where: {
        deckId: deck.id,
        term: { equals: term, mode: "insensitive" },
      },
      select: { id: true, term: true, definition: true, example: true },
    });
    if (existing) {
      return NextResponse.json({
        deckId: deck.id,
        deckTitle: deck.title,
        cardId: existing.id,
        term: existing.term,
        definition: existing.definition,
        example: existing.example,
        existed: true,
      });
    }

    // Groq: Vietnamese definition + English example sentence.
    const { definition, example } = await defineWordGroq(term);

    const card = await prisma.wordCard.create({
      data: {
        deckId: deck.id,
        term,
        definition: definition || `(Chưa có nghĩa cho "${term}")`,
        example: example || null,
      },
    });

    return NextResponse.json({
      deckId: deck.id,
      deckTitle: deck.title,
      cardId: card.id,
      term: card.term,
      definition: card.definition,
      example: card.example,
      existed: false,
    });
  } catch (e) {
    console.error("[words/quick-add]", e);
    return NextResponse.json({ error: "Thêm từ vào bộ thẻ thất bại" }, { status: 500 });
  }
}

export const maxDuration = 30;
