import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { scoreTranscript } from "@/lib/roulette-room";

/**
 * POST /api/speaking/roulette/rooms/[code]/submit
 *
 * The CURRENT-turn player sends the transcript of their recorded answer
 * (the client already hit /api/speaking/transcribe — keeps this endpoint
 * out of the STT timeout). We score it cheap (word-count tiers, see
 * scoreTranscript) and add to the player's cumulative `score`. The host
 * decides when to spin to the next turn — keeps everyone in sync.
 *
 * Allowed only when: status=PLAYING + caller is currentPlayer + the caller
 * hasn't already submitted this turn (idempotent guard against double-tap).
 */
const bodySchema = z.object({
  transcript: z.string().min(0).max(4000),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { code } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const room = await prisma.speakingRouletteRoom.findUnique({
    where: { code: code.toUpperCase() },
    include: { players: { orderBy: { joinedAt: "asc" } } },
  });
  if (!room) {
    return NextResponse.json({ error: "Phòng không tồn tại" }, { status: 404 });
  }
  if (room.status !== "PLAYING") {
    return NextResponse.json({ error: "Game chưa bắt đầu" }, { status: 400 });
  }
  const currentPlayer = room.players[room.currentPlayerIdx];
  if (!currentPlayer || currentPlayer.userId !== session.user.id) {
    return NextResponse.json({ error: "Không phải lượt của bạn" }, { status: 403 });
  }
  if (currentPlayer.lastSubmittedTurn >= room.currentTurn) {
    return NextResponse.json(
      { ok: true, alreadySubmitted: true, score: currentPlayer.score },
    );
  }

  const earned = scoreTranscript(parsed.data.transcript);
  await prisma.speakingRoulettePlayer.update({
    where: { id: currentPlayer.id },
    data: {
      score: { increment: earned },
      lastSubmittedTurn: room.currentTurn,
    },
  });

  return NextResponse.json({ ok: true, earned, transcript: parsed.data.transcript });
}
