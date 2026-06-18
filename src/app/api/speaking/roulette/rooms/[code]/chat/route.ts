import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/speaking/roulette/rooms/[code]/chat
 *
 * Send a chat message OR an emoji reaction into a roulette room. Members only.
 * Both are stored as SpeakingRouletteMessage rows and surfaced to every player
 * via the room poll (GET /rooms/[code]).
 *   kind="chat"  → text is the message (<= 300 chars)
 *   kind="emoji" → text is a single emoji
 */
const schema = z.object({
  kind: z.enum(["chat", "emoji"]).default("chat"),
  text: z.string().trim().min(1).max(300),
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

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const room = await prisma.speakingRouletteRoom.findUnique({
    where: { code: code.toUpperCase() },
    select: {
      id: true,
      players: { where: { userId: session.user.id }, select: { id: true } },
    },
  });
  if (!room) return NextResponse.json({ error: "Phòng không tồn tại" }, { status: 404 });
  if (room.players.length === 0) {
    return NextResponse.json({ error: "Bạn chưa join phòng này" }, { status: 403 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true },
  });

  // Emoji = keep only the first 8 chars (covers multi-codepoint emoji) so a
  // chat string can't sneak in through the emoji channel.
  const text =
    parsed.data.kind === "emoji"
      ? Array.from(parsed.data.text).slice(0, 4).join("")
      : parsed.data.text;

  await prisma.speakingRouletteMessage.create({
    data: {
      roomId: room.id,
      userId: session.user.id,
      name: me?.name ?? "Học viên",
      kind: parsed.data.kind,
      text,
    },
  });

  return NextResponse.json({ ok: true });
}
