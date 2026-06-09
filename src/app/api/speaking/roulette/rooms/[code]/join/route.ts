import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/speaking/roulette/rooms/[code]/join
 *
 * Add the caller to an existing room. No-op if they're already a member
 * (idempotent so a browser refresh or stale tab can rejoin without 4xx).
 * Cap at 6 players per room. WAITING-only — can't join once the game
 * has started.
 */
const MAX_PLAYERS = 6;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { code } = await params;
  const upper = code.toUpperCase();

  const room = await prisma.speakingRouletteRoom.findUnique({
    where: { code: upper },
    include: { players: { select: { userId: true } } },
  });
  if (!room) {
    return NextResponse.json({ error: "Phòng không tồn tại" }, { status: 404 });
  }
  const userId = session.user.id;
  if (room.players.some((p) => p.userId === userId)) {
    return NextResponse.json({ ok: true, alreadyJoined: true, code: upper });
  }
  if (room.status !== "WAITING") {
    return NextResponse.json(
      { error: "Phòng đã bắt đầu — không thể join giữa chừng" },
      { status: 409 },
    );
  }
  if (room.players.length >= MAX_PLAYERS) {
    return NextResponse.json({ error: "Phòng đã đầy (6 người)" }, { status: 409 });
  }
  await prisma.speakingRoulettePlayer.create({
    data: { roomId: room.id, userId },
  });
  return NextResponse.json({ ok: true, code: upper });
}
