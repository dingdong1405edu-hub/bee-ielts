import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminOrOwner } from "@/lib/premium";

/**
 * One support thread, admin side.
 *  GET  ?userId= → the learner's info + full thread; marks learner messages read.
 *  POST { userId, message } → admin replies (or starts a thread proactively).
 */
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized", status: 401 as const };
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, name: true },
  });
  if (!isAdminOrOwner(me)) return { error: "Forbidden", status: 403 as const };
  return { me };
}

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Thiếu userId" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, avatarUrl: true, role: true, createdAt: true },
  });
  if (!user) return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 });

  const messages = await prisma.supportMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, fromAdmin: true, senderName: true, body: true, createdAt: true },
  });

  // Opening the thread marks the learner's messages as read by the admin team.
  await prisma.supportMessage.updateMany({
    where: { userId, fromAdmin: false, readByAdmin: false },
    data: { readByAdmin: true },
  });

  return NextResponse.json({
    user: { ...user, createdAt: user.createdAt.toISOString() },
    messages: messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
  });
}

const postSchema = z.object({
  userId: z.string().min(1),
  message: z.string().trim().min(1, "Tin nhắn trống").max(4000),
});

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const parsed = postSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }, { status: 400 });
  }
  const { userId, message } = parsed.data;

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 });

  const created = await prisma.supportMessage.create({
    data: {
      userId,
      fromAdmin: true,
      senderId: gate.me!.id,
      // Show the team identity to the learner, not the individual admin name.
      senderName: "Đội ngũ Bee",
      body: message.trim(),
      readByAdmin: true,
    },
    select: { id: true, fromAdmin: true, senderName: true, body: true, createdAt: true },
  });

  return NextResponse.json({ message: { ...created, createdAt: created.createdAt.toISOString() } });
}
