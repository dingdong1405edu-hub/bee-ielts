import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const schema = z.object({ postId: z.string().min(1) });

/** Toggle a like on a post. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });

  const existing = await prisma.postLike.findUnique({
    where: { postId_userId: { postId: parsed.data.postId, userId: session.user.id } },
  });

  if (existing) {
    await prisma.postLike.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true, liked: false });
  }

  const post = await prisma.post.findUnique({ where: { id: parsed.data.postId }, select: { id: true } });
  if (!post) return NextResponse.json({ error: "Bài viết không tồn tại" }, { status: 404 });

  await prisma.postLike.create({ data: { postId: parsed.data.postId, userId: session.user.id } });
  return NextResponse.json({ ok: true, liked: true });
}
