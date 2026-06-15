import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPayos, isConfigured } from "@/lib/payos";
import { addMonths } from "@/lib/premium-plans";

/**
 * PayOS webhook receiver. PayOS POSTs the order outcome here — register this
 * URL on the PayOS dashboard (Channels → Webhook).
 *   <NEXT_PUBLIC_APP_URL>/api/payment/webhook
 *
 * The handler verifies the HMAC signature using the checksum key, flips the
 * matching Payment row's status, and — exactly once — grants whatever the
 * order was for (today: a timed Premium upgrade).
 */
export async function POST(req: Request) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "PayOS chưa cấu hình" }, { status: 503 });
  }

  const raw = await req.json().catch(() => null);
  if (!raw) return NextResponse.json({ error: "Body rỗng" }, { status: 400 });

  let data;
  try {
    data = await getPayos().webhooks.verify(raw);
  } catch (e) {
    console.error("[payos webhook] signature verify failed:", e);
    return NextResponse.json({ error: "Chữ ký không hợp lệ" }, { status: 401 });
  }

  // PayOS sends a one-time test ping with orderCode=123 when you save the
  // webhook URL on the dashboard — acknowledge it without touching the DB.
  if (data.orderCode === 123) {
    return NextResponse.json({ ok: true, test: true });
  }

  const existing = await prisma.payment.findUnique({
    where: { orderCode: data.orderCode },
  });
  if (!existing) {
    console.warn("[payos webhook] no Payment for orderCode", data.orderCode);
    return NextResponse.json({ ok: true, ignored: true });
  }

  // PayOS returns code "00" on a successful transfer.
  const paid = data.code === "00";

  if (!paid) {
    // Guard the same way as the success path: PAID/CANCELLED are terminal, so
    // a late/out-of-order failure webhook can never flip a settled order back
    // to FAILED (which would corrupt the ledger while the user stays premium).
    await prisma.payment.updateMany({
      where: { orderCode: data.orderCode, status: { notIn: ["PAID", "CANCELLED"] } },
      data: { status: "FAILED", paidAt: null, rawWebhook: raw as object },
    });
    return NextResponse.json({ ok: true });
  }

  // Flip PENDING → PAID atomically. updateMany only matches rows that aren't
  // already PAID, so a retried/duplicate webhook can't run the grant twice.
  const flip = await prisma.payment.updateMany({
    where: { orderCode: data.orderCode, status: { not: "PAID" } },
    data: { status: "PAID", paidAt: new Date(), rawWebhook: raw as object },
  });

  if (flip.count > 0) {
    await grantOrderReward(existing, data);
  }

  return NextResponse.json({ ok: true });
}

/**
 * Dispatch whatever a paid order is worth. The order's intent lives in
 * Payment.meta (written server-side at checkout), so a client can never ask
 * for more than it paid for. Today the only product is a Premium upgrade.
 */
async function grantOrderReward(
  existing: { userId: string | null; amount: number; meta: unknown },
  data: { amount?: number },
): Promise<void> {
  const meta = existing.meta as { kind?: string; months?: number } | null;
  if (!meta || meta.kind !== "premium" || !existing.userId || typeof meta.months !== "number") {
    return;
  }
  // Defensive: refuse to grant if PayOS reports an amount short of what we
  // charged (the amount itself is server-set, so this should never happen).
  if (typeof data.amount === "number" && data.amount < existing.amount) {
    console.warn("[payos webhook] amount mismatch — refusing premium grant", {
      charged: existing.amount,
      paid: data.amount,
    });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: existing.userId },
    select: { role: true, premiumUntil: true },
  });
  if (!user) return;
  // OWNER/ADMIN are already premium — record the payment, but don't touch them.
  if (user.role !== "LEARNER") return;

  // Stack the new months on top of any remaining time.
  const now = new Date();
  const base =
    user.premiumUntil && user.premiumUntil.getTime() > now.getTime()
      ? user.premiumUntil
      : now;
  const premiumUntil = addMonths(base, meta.months);

  await prisma.user.update({
    where: { id: existing.userId },
    data: {
      isPremium: true,
      premiumUntil,
      premiumGrantedAt: now,
      premiumGrantedBy: "payos",
    },
  });
}
