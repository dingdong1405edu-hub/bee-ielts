import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { moderateText, MODERATION_MESSAGE } from "@/lib/moderation";

const createSchema = z.object({
  testId: z.string().min(1),
  content: z.string().trim().min(1).max(800),
});
const deleteSchema = z.object({ id: z.string().min(1) });

/** List comments for a reading test — newest first. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const testId = new URL(req.url).searchParams.get("testId");
  if (!testId) return NextResponse.json({ error: "Thiếu testId" }, { status: 400 });

  const comments = await prisma.readingComment.findMany({
    where: { readingId: testId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      content: true,
      createdAt: true,
      userId: true,
      user: { select: { name: true, email: true, avatarUrl: true } },
    },
  });
  return NextResponse.json({ comments, currentUserId: session.user.id });
}

/** Post a comment on a reading test (with profanity moderation). */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Nội dung không hợp lệ" }, { status: 400 });

  const mod = moderateText(parsed.data.content);
  if (!mod.ok) return NextResponse.json({ error: MODERATION_MESSAGE }, { status: 422 });

  const test = await prisma.readingTest.findUnique({
    where: { id: parsed.data.testId },
    select: { id: true },
  });
  if (!test) return NextResponse.json({ error: "Bài đọc không tồn tại" }, { status: 404 });

  await prisma.readingComment.create({
    data: { readingId: parsed.data.testId, userId: session.user.id, content: parsed.data.content },
  });
  return NextResponse.json({ ok: true });
}

/** Delete one's own comment. */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = deleteSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });

  const comment = await prisma.readingComment.findUnique({
    where: { id: parsed.data.id },
    select: { userId: true },
  });
  if (!comment || comment.userId !== session.user.id) {
    return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  }
  await prisma.readingComment.delete({ where: { id: parsed.data.id } });
  return NextResponse.json({ ok: true });
}
