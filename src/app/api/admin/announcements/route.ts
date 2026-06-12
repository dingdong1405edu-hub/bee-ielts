/**
 * POST /api/admin/announcements — create an announcement (admin only).
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

const schema = z.object({
  kind: z.enum(["update", "discount", "info"]).default("info"),
  title: z.string().min(1, "Cần tiêu đề").max(160),
  body: z.string().min(1, "Cần nội dung").max(4000),
  code: z.string().max(60).optional().or(z.literal("")),
  pinned: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
      { status: 400 },
    );
  }
  const { kind, title, body, code, pinned } = parsed.data;
  const created = await prisma.announcement.create({
    data: { kind, title: title.trim(), body: body.trim(), code: code?.trim() || null, pinned },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: created.id });
}
