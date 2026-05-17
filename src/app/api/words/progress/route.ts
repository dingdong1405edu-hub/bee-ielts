import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const schema = z.object({ cardId: z.string(), mastered: z.boolean() });

/** Update a card's "mastered" state (used by Learn mode). */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });

  const card = await prisma.wordCard.findUnique({
    where: { id: parsed.data.cardId },
    include: { deck: true },
  });
  if (!card || card.deck.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.wordCard.update({
    where: { id: card.id },
    data: { mastered: parsed.data.mastered },
  });
  return NextResponse.json({ ok: true });
}
