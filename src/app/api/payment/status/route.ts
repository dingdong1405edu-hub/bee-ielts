import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseOrderCode, reconcileOrder } from "@/lib/payment";
import { effectivePremium } from "@/lib/premium";

/**
 * Poll target for the in-app QR screen and /pay/success: "is order N paid yet?".
 *
 * Two depths, because the QR screen can sit open for many minutes:
 *   - default  → read our own row only. The webhook usually settles the order
 *     within a second of the transfer, so this catches nearly every payment at
 *     zero cost to PayOS.
 *   - ?deep=1  → also reconcile against the PayOS API. This is the path that
 *     keeps the upgrade automatic when the webhook is unregistered or fails, so
 *     the client fires it on a slower cadence and on manual re-check.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderCode = parseOrderCode(url.searchParams.get("orderCode"));
  if (orderCode === null) {
    return NextResponse.json({ error: "Mã đơn không hợp lệ" }, { status: 400 });
  }
  const deep = url.searchParams.get("deep") === "1";

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

  const payment = deep
    ? await reconcileOrder(orderCode)
    : await prisma.payment.findUnique({ where: { orderCode } });
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
