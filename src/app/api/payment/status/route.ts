import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseOrderCode, reconcileOrder } from "@/lib/payment";
import { effectivePremium } from "@/lib/premium";

/**
 * Poll target for the /pay/success page: "is order N paid yet?".
 *
 * Every call reconciles the order against the PayOS API, so this endpoint is
 * what makes the upgrade automatic even when the webhook never arrives —
 * the customer coming back from the checkout page IS the trigger.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const orderCode = parseOrderCode(new URL(req.url).searchParams.get("orderCode"));
  if (orderCode === null) {
    return NextResponse.json({ error: "Mã đơn không hợp lệ" }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const owned = await prisma.payment.findUnique({
    where: { orderCode },
    select: { userId: true },
  });
  if (!owned) {
    return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
  }
  // An order tied to an account is only visible to that account. Orders from
  // the anonymous /pay form (userId = null) grant nothing, so they stay open.
  if (owned.userId && owned.userId !== userId) {
    return NextResponse.json({ error: "Đơn hàng không thuộc tài khoản này" }, { status: 403 });
  }

  const payment = await reconcileOrder(orderCode);
  if (!payment) {
    return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
  }

  // Report the resulting entitlement so the UI can say "Premium đã mở" without
  // waiting for a session round-trip.
  let premium = false;
  let premiumUntil: string | null = null;
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isPremium: true, premiumUntil: true },
    });
    if (user) {
      premium = effectivePremium(user);
      premiumUntil = user.premiumUntil?.toISOString() ?? null;
    }
  }

  return NextResponse.json({
    orderCode: payment.orderCode,
    status: payment.status,
    amount: payment.amount,
    description: payment.description,
    paidAt: payment.paidAt?.toISOString() ?? null,
    premium,
    premiumUntil,
  });
}
