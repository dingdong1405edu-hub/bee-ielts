/**
 * POST /api/admin/api-keys/test — live-ping a provider to check whether a key is
 * still valid / not expired (OWNER only). Body: { provider, key? }. If `key` is
 * given it tests THAT key (before saving); otherwise it tests the currently
 * resolved key (DB override or env).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isOwner } from "@/lib/admin";
import { isProvider, testApiKey } from "@/lib/api-keys";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const schema = z.object({ provider: z.string(), key: z.string().optional() });

export async function POST(req: Request) {
  const session = await auth();
  const me = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, email: true } })
    : null;
  if (!me || (me.role !== "OWNER" && !isOwner(me.email)))
    return NextResponse.json({ error: "Chỉ chủ sở hữu (OWNER)" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success || !isProvider(parsed.data.provider))
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  const result = await testApiKey(parsed.data.provider, parsed.data.key?.trim() || undefined);
  return NextResponse.json(result);
}
