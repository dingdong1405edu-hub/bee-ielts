import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canGrantPremium } from "@/lib/premium";

/**
 * OWNER grants premium to a learner. Also accepts an optional `requestId`
 * so the queue UI can approve a specific PremiumRequest row in the same
 * transaction — keeps "user is now premium" + "request marked APPROVED"
 * atomic.
 */
const schema = z.object({
  userId: z.string().min(1),
  requestId: z.string().min(1).optional(),
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
    return NextResponse.json({ error: "Chỉ OWNER có quyền cấp Premium" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
  const { userId, requestId } = parsed.data;
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!target) return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 });

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: target.id },
      data: { isPremium: true, premiumGrantedAt: now, premiumGrantedBy: me.id },
    });
    if (requestId) {
      await tx.premiumRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED", decidedAt: now, decidedBy: me.id },
      });
    } else {
      // Auto-resolve any open PENDING request for this user so the queue
      // stays clean even if the owner granted directly from the user list.
      await tx.premiumRequest.updateMany({
        where: { userId: target.id, status: "PENDING" },
        data: { status: "APPROVED", decidedAt: now, decidedBy: me.id },
      });
    }
  });
  return NextResponse.json({ ok: true });
}
