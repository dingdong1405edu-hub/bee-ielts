import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { generateRoomCode } from "@/lib/roulette-room";

/**
 * POST /api/speaking/roulette/rooms
 *
 * Create a new multiplayer room. Caller becomes the host and is auto-added
 * to the players list. Returns the code so the client can show + share it.
 */
const bodySchema = z.object({
  part: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  totalTurns: z.number().int().min(1).max(10).optional().default(5),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const userId = session.user.id;

  // Generate a unique code — retry a handful of times if the (very small)
  // chance of collision hits with 6 chars from a 32-symbol alphabet.
  let code = "";
  for (let attempt = 0; attempt < 6; attempt++) {
    code = generateRoomCode();
    const exists = await prisma.speakingRouletteRoom.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!exists) break;
    code = "";
  }
  if (!code) {
    return NextResponse.json({ error: "Không tạo được mã phòng" }, { status: 500 });
  }

  const room = await prisma.speakingRouletteRoom.create({
    data: {
      code,
      hostId: userId,
      part: parsed.data.part,
      totalTurns: parsed.data.totalTurns,
      players: {
        create: { userId },
      },
    },
    select: { code: true },
  });

  return NextResponse.json({ code: room.code });
}
