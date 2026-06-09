import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/speaking/roulette/rooms/[code]/spin
 *
 * Host-only action. Advances the room to the next turn:
 *
 *   - WAITING → PLAYING + currentTurn = 1, currentPlayerIdx = 0
 *   - Each subsequent call increments currentPlayerIdx (rotates whose
 *     turn it is) and bumps currentTurn when we wrap back to player 0.
 *   - When currentTurn > totalTurns × players.length, sets status FINISHED.
 *
 * Picks a random unused-in-this-game card for currentCardId. We keep it
 * lightweight — same Part, just exclude what's been picked already.
 *
 * Players poll GET /rooms/[code] every 2s and re-render when currentTurn
 * or currentCardId changes.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { code } = await params;

  const room = await prisma.speakingRouletteRoom.findUnique({
    where: { code: code.toUpperCase() },
    include: { players: { orderBy: { joinedAt: "asc" } } },
  });
  if (!room) {
    return NextResponse.json({ error: "Phòng không tồn tại" }, { status: 404 });
  }
  if (room.hostId !== session.user.id) {
    return NextResponse.json({ error: "Chỉ host mới được spin" }, { status: 403 });
  }
  if (room.status === "FINISHED") {
    return NextResponse.json({ error: "Game đã kết thúc" }, { status: 400 });
  }
  if (room.players.length < 1) {
    return NextResponse.json({ error: "Cần ít nhất 1 người chơi" }, { status: 400 });
  }

  // Determine next turn + player.
  let nextTurn: number;
  let nextPlayerIdx: number;
  if (room.status === "WAITING") {
    nextTurn = 1;
    nextPlayerIdx = 0;
  } else {
    // After a turn ends: rotate to next player; if we wrap, bump turn.
    nextPlayerIdx = (room.currentPlayerIdx + 1) % room.players.length;
    nextTurn =
      nextPlayerIdx === 0 ? room.currentTurn + 1 : room.currentTurn;
  }

  // Out of turns? Mark finished.
  if (nextTurn > room.totalTurns) {
    await prisma.speakingRouletteRoom.update({
      where: { id: room.id },
      data: {
        status: "FINISHED",
        currentCardId: null,
      },
    });
    return NextResponse.json({ ok: true, status: "FINISHED" });
  }

  // Pick a random card for this Part. We accept that a card can repeat
  // across long games — the deck is small, and tracking dealt cards adds
  // complexity for little payoff at 5-25 turn lengths.
  const cards = await prisma.speakingTopicCard.findMany({
    where: { part: room.part },
    select: { id: true },
  });
  if (cards.length === 0) {
    return NextResponse.json(
      { error: "Không có thẻ nào ở Part này" },
      { status: 500 },
    );
  }
  let pick = cards[Math.floor(Math.random() * cards.length)].id;
  // Try not to draw the SAME card twice in a row.
  if (room.currentCardId && cards.length > 1 && pick === room.currentCardId) {
    pick = cards[(cards.findIndex((c) => c.id === pick) + 1) % cards.length].id;
  }

  await prisma.speakingRouletteRoom.update({
    where: { id: room.id },
    data: {
      status: "PLAYING",
      currentTurn: nextTurn,
      currentPlayerIdx: nextPlayerIdx,
      currentCardId: pick,
    },
  });

  return NextResponse.json({ ok: true, turn: nextTurn, cardId: pick });
}
