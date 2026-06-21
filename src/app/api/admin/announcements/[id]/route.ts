/**
 * PATCH  /api/admin/announcements/[id] — toggle active/pinned (admin only).
 * DELETE /api/admin/announcements/[id] — remove an announcement.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminOrOwner } from "@/lib/premium";
import { logAdminActivity } from "@/lib/admin-activity";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  return me && isAdminOrOwner(me) ? me : null;
}

const patchSchema = z.object({
  active: z.boolean().optional(),
  pinned: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const updated = await prisma.announcement.update({
    where: { id },
    data: parsed.data,
    select: { title: true },
  });
  await logAdminActivity({
    action: "UPDATE",
    entityType: "ANNOUNCEMENT",
    entityId: id,
    entityTitle: updated.title,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await prisma.announcement.findUnique({
    where: { id },
    select: { title: true },
  });
  await prisma.announcement.delete({ where: { id } });
  await logAdminActivity({
    action: "DELETE",
    entityType: "ANNOUNCEMENT",
    entityId: id,
    entityTitle: existing?.title ?? id,
    entityHref: null,
  });
  return NextResponse.json({ ok: true });
}
