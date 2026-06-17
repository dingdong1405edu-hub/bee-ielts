import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * Learner side of the support chat.
 *  GET  → this learner's whole thread (ascending); marks admin replies as read.
 *  POST → learner sends a message to the Bee team.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const userId = session.user.id;

  const messages = await prisma.supportMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, fromAdmin: true, senderName: true, body: true, createdAt: true },
  });

  // Opening the thread marks the admin replies as seen.
  await prisma.supportMessage.updateMany({
    where: { userId, fromAdmin: true, readByUser: false },
    data: { readByUser: true },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
  });
}

const postSchema = z.object({ message: z.string().trim().min(1, "Tin nhắn trống").max(4000) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const userId = session.user.id;

  const parsed = postSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  // Light anti-spam: cap unanswered learner messages so a thread can't be flooded.
  const pending = await prisma.supportMessage.count({
    where: { userId, fromAdmin: false, readByAdmin: false },
  });
  if (pending >= 30) {
    return NextResponse.json({ error: "Bạn đã gửi khá nhiều tin. Vui lòng chờ Bee phản hồi nhé." }, { status: 429 });
  }

  const created = await prisma.supportMessage.create({
    data: {
      userId,
      fromAdmin: false,
      senderId: userId,
      senderName: session.user.name ?? null,
      body: parsed.data.message.trim(),
      readByUser: true,
    },
    select: { id: true, fromAdmin: true, senderName: true, body: true, createdAt: true },
  });

  return NextResponse.json({ message: { ...created, createdAt: created.createdAt.toISOString() } });
}
