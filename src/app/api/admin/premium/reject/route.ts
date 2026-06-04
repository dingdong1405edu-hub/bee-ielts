import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canGrantPremium } from "@/lib/premium";

/**
 * OWNER rejects a PremiumRequest. Doesn't touch the user — just marks the
 * row as REJECTED so the learner sees their request was decided + can
 * resubmit with a clearer message.
 */
const schema = z.object({
  requestId: z.string().min(1),
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
    return NextResponse.json({ error: "Chỉ OWNER có quyền từ chối yêu cầu" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
  const row = await prisma.premiumRequest.findUnique({
    where: { id: parsed.data.requestId },
  });
  if (!row) return NextResponse.json({ error: "Không tìm thấy yêu cầu" }, { status: 404 });
  if (row.status !== "PENDING") {
    return NextResponse.json({ error: "Yêu cầu đã được xử lý" }, { status: 409 });
  }
  await prisma.premiumRequest.update({
    where: { id: row.id },
    data: { status: "REJECTED", decidedAt: new Date(), decidedBy: me.id },
  });
  return NextResponse.json({ ok: true });
}
