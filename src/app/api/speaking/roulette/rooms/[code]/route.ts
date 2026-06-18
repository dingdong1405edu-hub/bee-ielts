import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/speaking/roulette/rooms/[code]
 *
 * Poll-friendly room state snapshot. Returns everything the client needs to
 * render the lobby OR the in-progress game without extra round-trips:
 *   - room metadata (code, part, status, currentTurn, totalTurns)
 *   - currentCard fully populated (id, topic, question, talkPoints, vocab,
 *     hue) when the game is mid-turn — null in WAITING/FINISHED
 *   - players list sorted by joinedAt, with name + avatar + score
 *   - currentPlayerId = whose turn it is (null between turns)
 *   - meId = the calling user's playerId so the client knows "is it my turn"
 *
 * Auth: caller must be a member of the room. Non-members get 403 so a
 * leaked code doesn't dox the participant list.
 */
export async function GET(
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
    include: {
      players: {
        orderBy: { joinedAt: "asc" },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
    },
  });
  if (!room) {
    return NextResponse.json({ error: "Phòng không tồn tại" }, { status: 404 });
  }

  const isMember = room.players.some((p) => p.userId === session.user!.id);
  if (!isMember) {
    return NextResponse.json({ error: "Bạn chưa join phòng này" }, { status: 403 });
  }

  let card: {
    id: string;
    topic: string;
    question: string;
    talkPoints: string[];
    vocab: { sentence: string; keyWord: string }[];
    hue: string;
  } | null = null;
  if (room.currentCardId) {
    const c = await prisma.speakingTopicCard.findUnique({
      where: { id: room.currentCardId },
    });
    if (c) {
      card = {
        id: c.id,
        topic: c.topic,
        question: c.question,
        talkPoints: (c.talkPoints as string[]) ?? [],
        vocab: (c.vocab as { sentence: string; keyWord: string }[]) ?? [],
        hue: c.hue,
      };
    }
  }

  const currentPlayer = room.players[room.currentPlayerIdx] ?? null;
  const me = room.players.find((p) => p.userId === session.user!.id) ?? null;

  // Last 40 chat + emoji messages (oldest→newest) for the room.
  const rawMessages = await prisma.speakingRouletteMessage.findMany({
    where: { roomId: room.id },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { id: true, userId: true, name: true, kind: true, text: true, createdAt: true },
  });
  const messages = rawMessages
    .reverse()
    .map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }));

  return NextResponse.json({
    code: room.code,
    hostId: room.hostId,
    part: room.part,
    status: room.status,
    currentTurn: room.currentTurn,
    totalTurns: room.totalTurns,
    currentCard: card,
    currentPlayerId: currentPlayer?.userId ?? null,
    meId: session.user.id,
    iAmHost: room.hostId === session.user.id,
    iAmCurrentPlayer: currentPlayer?.userId === session.user.id,
    iHaveSubmittedThisTurn:
      me ? me.lastSubmittedTurn >= room.currentTurn : false,
    players: room.players.map((p) => ({
      userId: p.userId,
      name: p.user.name ?? "Học viên",
      avatarUrl: p.user.avatarUrl,
      score: p.score,
      lastSubmittedTurn: p.lastSubmittedTurn,
      isHost: p.userId === room.hostId,
    })),
    messages,
  });
}
