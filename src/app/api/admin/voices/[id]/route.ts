import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAdminActivity } from "@/lib/admin-activity";

const patchSchema = z.object({
  voiceId: z.string().min(3).max(80).optional(),
  name: z.string().min(1).max(40).optional(),
  accent: z.string().min(1).max(40).optional(),
  gender: z.enum(["Nữ", "Nam"]).optional(),
  isDefault: z.boolean().optional(),
  enabled: z.boolean().optional(),
  order: z.number().int().optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN" && (session.user as { role?: string }).role !== "OWNER") {
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
    // Promoting a voice to default? Demote everything else first so we keep
    // the invariant that only one row has isDefault=true.
    if (parsed.data.isDefault === true) {
      await prisma.speakingVoice.updateMany({
        where: { isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }
    const voice = await prisma.speakingVoice.update({
      where: { id },
      data: parsed.data,
    });
    await logAdminActivity({
      action: "UPDATE",
      entityType: "SPEAKING_VOICE",
      entityId: voice.id,
      entityTitle: `${voice.name} (${voice.voiceId})`,
    });
    return NextResponse.json({ voice });
  } catch (e) {
    console.error("[admin/voices PATCH]", e);
    return NextResponse.json({ error: "Cập nhật thất bại" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  try {
    const existing = await prisma.speakingVoice.findUnique({
      where: { id },
      select: { name: true, voiceId: true },
    });
    await prisma.speakingVoice.delete({ where: { id } });
    if (existing) {
      await logAdminActivity({
        action: "DELETE",
        entityType: "SPEAKING_VOICE",
        entityId: id,
        entityTitle: `${existing.name} (${existing.voiceId})`,
        entityHref: null,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/voices DELETE]", e);
    return NextResponse.json({ error: "Xóa thất bại" }, { status: 500 });
  }
}
