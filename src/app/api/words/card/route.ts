import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  deckId: z.string(),
  term: z.string().min(1).max(120),
  definition: z.string().min(1).max(2000),
  example: z.string().max(2000).optional(),
});

/** Add a card to one of the user's decks. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  const deck = await prisma.wordDeck.findUnique({ where: { id: parsed.data.deckId } });
  if (!deck || deck.userId !== session.user.id) {
    return NextResponse.json({ error: "Không tìm thấy bộ thẻ" }, { status: 404 });
  }
  const card = await prisma.wordCard.create({
    data: {
      deckId: deck.id,
      term: parsed.data.term.trim(),
      definition: parsed.data.definition.trim(),
      example: parsed.data.example?.trim() || null,
    },
  });
  return NextResponse.json({ id: card.id });
}

/** Delete a card the user owns. */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = (await req.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: "Bad input" }, { status: 400 });
  const card = await prisma.wordCard.findUnique({ where: { id }, include: { deck: true } });
  if (!card || card.deck.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.wordCard.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
