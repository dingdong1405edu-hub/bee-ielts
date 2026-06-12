/**
 * PATCH  /api/admin/feedback/[id] — mark a message read/new.
 * DELETE /api/admin/feedback/[id] — remove a message.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminOrOwner } from "@/lib/premium";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  return me && isAdminOrOwner(me) ? me : null;
}

const patchSchema = z.object({ status: z.enum(["new", "read"]) });

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
  await prisma.feedback.update({ where: { id }, data: { status: parsed.data.status } });
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
  await prisma.feedback.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
