import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { moderateText, MODERATION_MESSAGE } from "@/lib/moderation";
import { moderateImageGroq } from "@/lib/groq";

// Image is a base64 data URL (resized client-side). Cap ~1.2MB base64.
const MAX_IMAGE = 1_200_000;

const createSchema = z.object({
  content: z.string().trim().max(1000),
  imageUrl: z
    .string()
    .max(MAX_IMAGE)
    .refine((s) => s.startsWith("data:image/"), "Ảnh không hợp lệ")
    .optional(),
  /** Publish under the Bee (Owner) identity + notify everyone. Only honoured
   *  for the OWNER or an ADMIN the owner granted `canPostAsOwner`. */
  asOwner: z.boolean().optional(),
});
const deleteSchema = z.object({ id: z.string().min(1) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Nội dung không hợp lệ" }, { status: 400 });

  const { content, imageUrl } = parsed.data;
  if (!content.trim() && !imageUrl) {
    return NextResponse.json({ error: "Bài viết cần có nội dung hoặc ảnh" }, { status: 400 });
  }

  // Text moderation
  if (content.trim()) {
    const mod = moderateText(content);
    if (!mod.ok) return NextResponse.json({ error: MODERATION_MESSAGE }, { status: 422 });
  }

  // Image moderation — AI vision check. If it can't verify, reject to stay safe.
  if (imageUrl) {
    try {
      const result = await moderateImageGroq(imageUrl);
      if (!result.safe) {
        return NextResponse.json(
          { error: "Ảnh chứa nội dung nhạy cảm hoặc không phù hợp và đã bị chặn." },
          { status: 422 },
        );
      }
    } catch (e) {
      console.error("[community image moderation]", e);
      return NextResponse.json(
        { error: "Không kiểm duyệt được ảnh lúc này. Vui lòng thử lại sau." },
        { status: 503 },
      );
    }
  }

  // Resolve "post as Bee" — only the OWNER, or an ADMIN the owner authorised,
  // may publish under the Bee identity (and trigger the broadcast notification).
  let asOwner = false;
  if (parsed.data.asOwner) {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, canPostAsOwner: true },
    });
    asOwner = me?.role === "OWNER" || (me?.role === "ADMIN" && me?.canPostAsOwner === true);
  }

  const post = await prisma.post.create({
    data: { userId: session.user.id, content, imageUrl: imageUrl ?? null, asOwner },
  });
  return NextResponse.json({ ok: true, id: post.id });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = deleteSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });

  const post = await prisma.post.findUnique({ where: { id: parsed.data.id }, select: { userId: true } });
  if (!post) return NextResponse.json({ error: "Không tìm thấy bài" }, { status: 404 });
  // Author can delete their own; the OWNER can moderate any post.
  if (post.userId !== session.user.id) {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (me?.role !== "OWNER") {
      return NextResponse.json({ error: "Không có quyền xoá bài này" }, { status: 403 });
    }
  }
  await prisma.post.delete({ where: { id: parsed.data.id } });
  return NextResponse.json({ ok: true });
}

export const maxDuration = 30;
