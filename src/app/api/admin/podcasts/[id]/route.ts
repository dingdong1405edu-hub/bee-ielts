/**
 * PATCH  /api/admin/podcasts/[id] — update episode fields (CEFR level +
 *                                   published toggle).
 * DELETE /api/admin/podcasts/[id] — remove a podcast episode.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminOrOwner } from "@/lib/premium";

const patchSchema = z.object({
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).nullable().optional(),
  published: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const me = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, role: true },
      })
    : null;
  if (!me || !isAdminOrOwner(me)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const data: {
    level?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | null;
    published?: boolean;
  } = {};
  if (parsed.data.level !== undefined) data.level = parsed.data.level;
  if (parsed.data.published !== undefined) data.published = parsed.data.published;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Không có gì để cập nhật" }, { status: 400 });
  }
  await prisma.podcastEpisode.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const me = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, role: true },
      })
    : null;
  if (!me || !isAdminOrOwner(me)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.podcastEpisode.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
