import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { moderateText, MODERATION_MESSAGE } from "@/lib/moderation";

const createSchema = z.object({
  postId: z.string().min(1),
  content: z.string().trim().min(1).max(500),
});
const deleteSchema = z.object({ id: z.string().min(1) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Nội dung không hợp lệ" }, { status: 400 });

  const mod = moderateText(parsed.data.content);
  if (!mod.ok) return NextResponse.json({ error: MODERATION_MESSAGE }, { status: 422 });

  const post = await prisma.post.findUnique({ where: { id: parsed.data.postId }, select: { id: true } });
  if (!post) return NextResponse.json({ error: "Bài viết không tồn tại" }, { status: 404 });

  await prisma.postComment.create({
    data: { postId: parsed.data.postId, userId: session.user.id, content: parsed.data.content },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = deleteSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });

  const comment = await prisma.postComment.findUnique({
    where: { id: parsed.data.id },
    select: { userId: true },
  });
  if (!comment || comment.userId !== session.user.id) {
    return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  }
  await prisma.postComment.delete({ where: { id: parsed.data.id } });
  return NextResponse.json({ ok: true });
}
