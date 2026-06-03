import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const itemSchema = z.object({
  term: z.string().min(1).max(120),
  definition: z.string().min(1).max(500),
  example: z.string().max(500).optional().or(z.literal("")),
});

const schema = z.object({
  title: z.string().min(1).max(120),
  items: z.array(itemSchema).min(1).max(80),
});

/**
 * Atomically import an admin-curated vocab pack into the signed-in user's
 * personal flashcard library. Creates a brand-new WordDeck (titled after
 * the source — typically the mini-quiz title) and writes every item as a
 * WordCard inside it. Idempotent only at the user-confirms-import level —
 * tapping "Import" twice creates two decks. That's fine; user can delete
 * one in /words.
 *
 * Returns { deckId, cardCount } so the client can deep-link the toast to
 * the new deck for immediate review.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
  const { title, items } = parsed.data;

  try {
    const deck = await prisma.wordDeck.create({
      data: {
        userId: session.user.id,
        title: title.trim().slice(0, 120),
        cards: {
          create: items.map((it) => ({
            term: it.term.trim(),
            definition: it.definition.trim(),
            example: it.example?.trim() || null,
          })),
        },
      },
      select: { id: true, title: true, _count: { select: { cards: true } } },
    });
    return NextResponse.json({
      deckId: deck.id,
      deckTitle: deck.title,
      cardCount: deck._count.cards,
    });
  } catch (e) {
    console.error("[words/import-pack]", e);
    return NextResponse.json({ error: "Tạo bộ thẻ thất bại" }, { status: 500 });
  }
}

export const maxDuration = 30;
