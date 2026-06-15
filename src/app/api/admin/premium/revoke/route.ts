import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canGrantPremium } from "@/lib/premium";

/**
 * OWNER revokes premium from a LEARNER. ADMIN/OWNER accounts cannot be
 * "demoted" via this endpoint — their premium comes from role, not the
 * isPremium flag. To strip premium from an admin, change their role
 * instead via the existing /admin/access workflow.
 */
const schema = z.object({
  userId: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  const me = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, role: true },
      })
    : null;
  if (!me || !canGrantPremium(me)) {
    return NextResponse.json({ error: "Chỉ OWNER có quyền thu hồi Premium" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, role: true },
  });
  if (!target) return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 });
  if (target.role !== "LEARNER") {
    return NextResponse.json(
      { error: "ADMIN/OWNER không thể thu hồi qua đây — đổi role ở /admin/access" },
      { status: 400 },
    );
  }
  await prisma.user.update({
    where: { id: target.id },
    // Clear premiumUntil too: otherwise a leftover paid-plan date keeps the
    // user "premium" on premiumUntil-aware reads (the /premium page) and would
    // be stacked onto a later re-purchase by the webhook.
    data: { isPremium: false, premiumUntil: null, premiumGrantedAt: null, premiumGrantedBy: null },
  });
  return NextResponse.json({ ok: true });
}
