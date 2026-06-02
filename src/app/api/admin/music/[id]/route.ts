import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { MUSIC_SCOPES } from "@/lib/music-scopes";
import { logAdminActivity } from "@/lib/admin-activity";

const scopeValues = MUSIC_SCOPES.map((s) => s.value) as [string, ...string[]];

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  audioUrl: z.string().min(4).optional(),
  scopes: z.array(z.enum(scopeValues)).min(1).optional(),
  volume: z.number().min(0).max(1).optional(),
  enabled: z.boolean().optional(),
  order: z.number().int().optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad input" }, { status: 400 });
  }
  try {
    const track = await prisma.backgroundMusic.update({
      where: { id },
      data: parsed.data,
    });
    await logAdminActivity({
      action: "UPDATE",
      entityType: "BACKGROUND_MUSIC",
      entityId: track.id,
      entityTitle: track.name,
    });
    return NextResponse.json({ track });
  } catch (e) {
    console.error("[admin/music PATCH]", e);
    return NextResponse.json({ error: "Cập nhật thất bại" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  try {
    const existing = await prisma.backgroundMusic.findUnique({
      where: { id },
      select: { name: true },
    });
    await prisma.backgroundMusic.delete({ where: { id } });
    if (existing) {
      await logAdminActivity({
        action: "DELETE",
        entityType: "BACKGROUND_MUSIC",
        entityId: id,
        entityTitle: existing.name,
        entityHref: null,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/music DELETE]", e);
    return NextResponse.json({ error: "Xóa thất bại" }, { status: 500 });
  }
}
