import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { moderateText, MODERATION_MESSAGE } from "@/lib/moderation";

const createSchema = z.object({ content: z.string().trim().min(1).max(1000) });
const deleteSchema = z.object({ id: z.string().min(1) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Nội dung không hợp lệ" }, { status: 400 });

  const mod = moderateText(parsed.data.content);
  if (!mod.ok) return NextResponse.json({ error: MODERATION_MESSAGE }, { status: 422 });

  const post = await prisma.post.create({
    data: { userId: session.user.id, content: parsed.data.content },
  });
  return NextResponse.json({ ok: true, id: post.id });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = deleteSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });

  const post = await prisma.post.findUnique({ where: { id: parsed.data.id }, select: { userId: true } });
  if (!post || post.userId !== session.user.id) {
    return NextResponse.json({ error: "Không tìm thấy bài" }, { status: 404 });
  }
  await prisma.post.delete({ where: { id: parsed.data.id } });
  return NextResponse.json({ ok: true });
}
