import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/** List the signed-in user's decks. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const decks = await prisma.wordDeck.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true },
  });
  return NextResponse.json({ decks });
}

const createSchema = z.object({ title: z.string().min(1).max(100) });

/** Create a new deck. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Tên bộ thẻ không hợp lệ" }, { status: 400 });
  const deck = await prisma.wordDeck.create({
    data: { userId: session.user.id, title: parsed.data.title.trim() },
  });
  return NextResponse.json({ id: deck.id });
}

/** Delete a deck (cascades to its cards). */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = (await req.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: "Bad input" }, { status: 400 });
  const deck = await prisma.wordDeck.findUnique({ where: { id } });
  if (!deck || deck.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.wordDeck.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
