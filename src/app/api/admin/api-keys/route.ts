/**
 * GET  /api/admin/api-keys      — status of every AI provider key (OWNER only).
 * POST /api/admin/api-keys      — set OR clear a provider's DB override.
 *
 * Managing secrets is the most sensitive admin action, so it is OWNER-only
 * (not every ADMIN). The full key is NEVER returned to the client — only a
 * masked hint + where it resolves from.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isOwner } from "@/lib/admin";
import { isProvider, listKeyStatus, setApiKey, clearApiKey } from "@/lib/api-keys";

export const dynamic = "force-dynamic";

async function requireOwner() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, email: true },
  });
  if (!me || (me.role !== "OWNER" && !isOwner(me.email))) return null;
  return me;
}

export async function GET() {
  const me = await requireOwner();
  if (!me) return NextResponse.json({ error: "Chỉ chủ sở hữu (OWNER) mới xem được" }, { status: 403 });
  return NextResponse.json({ providers: await listKeyStatus() });
}

const bodySchema = z.object({
  provider: z.string(),
  action: z.enum(["set", "clear"]),
  value: z.string().optional(),
});

export async function POST(req: Request) {
  const me = await requireOwner();
  if (!me) return NextResponse.json({ error: "Chỉ chủ sở hữu (OWNER) mới đổi được" }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  const { provider, action, value } = parsed.data;
  if (!isProvider(provider)) return NextResponse.json({ error: "Nhà cung cấp không hợp lệ" }, { status: 400 });

  if (action === "set") {
    const v = (value ?? "").trim();
    if (v.length < 8) return NextResponse.json({ error: "Khoá quá ngắn hoặc trống" }, { status: 400 });
    await setApiKey(provider, v, me.id);
  } else {
    await clearApiKey(provider);
  }
  return NextResponse.json({ providers: await listKeyStatus() });
}
