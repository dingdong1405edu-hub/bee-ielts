import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// Avatar/cover are stored as base64 data URLs (resized client-side).
// Caps keep a single row sane: ~400KB of base64 ≈ 300KB image.
const MAX_DATA_URL = 600_000;

const schema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  bio: z.string().trim().max(200).optional(),
  avatarUrl: z
    .string()
    .max(MAX_DATA_URL)
    .refine((s) => s === "" || s.startsWith("data:image/"), "Invalid image")
    .optional(),
  coverUrl: z
    .string()
    .max(MAX_DATA_URL)
    .refine((s) => s === "" || s.startsWith("data:image/"), "Invalid image")
    .optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ hoặc ảnh quá lớn" }, { status: 400 });
  }

  const data: Record<string, string | null> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.bio !== undefined) data.bio = parsed.data.bio || null;
  if (parsed.data.avatarUrl !== undefined) data.avatarUrl = parsed.data.avatarUrl || null;
  if (parsed.data.coverUrl !== undefined) data.coverUrl = parsed.data.coverUrl || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Không có gì để cập nhật" }, { status: 400 });
  }

  await prisma.user.update({ where: { id: session.user.id }, data });
  return NextResponse.json({ ok: true });
}
