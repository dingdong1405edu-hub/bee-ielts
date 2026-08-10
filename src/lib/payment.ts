import { Prisma, type Payment, type PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PAYOS_CODE, getPayos, isConfigured, newOrderCode, payosCode } from "@/lib/payos";
import { addMonths } from "@/lib/premium-plans";

/**
 * Order fulfilment for PayOS checkouts.
 *
 * Two independent paths can settle the same order, and both funnel through
 * `settlePaidOrder()` so premium is granted EXACTLY once:
 *
 *   1. the webhook  (POST /api/payment/webhook) — instant, needs the URL to be
 *      registered on the PayOS dashboard;
 *   2. reconciliation (GET /api/payment/status, and the /pay/success page) —
 *      asks PayOS directly what happened to the order. This is the safety net
 *      that keeps auto-upgrade working when the webhook is not registered,
 *      is misconfigured, or PayOS's delivery fails.
 */

/** What a paid order is worth. Written server-side at checkout only. */
export interface PremiumOrderMeta {
  kind: "premium";
  planId: string;
  months: number;
}

export type SettleResult =
  | "granted" // flipped PENDING → PAID and handed out the reward
  | "already" // someone else already settled it (webhook vs. poll race)
  | "unknown" // no Payment row for this orderCode
  | "underpaid"; // PayOS reports less money than we charged

/**
 * Insert the PENDING Payment row BEFORE calling PayOS.
 *
 * The old order (PayOS first, DB second) meant any DB failure left a live
 * checkout link with no row behind it — the customer could pay and the webhook
 * would log "no Payment for orderCode" and grant nothing. Reserving the row
 * first makes the unique index on `orderCode` the arbiter, and retries walk to
 * a fresh code instead of dropping the order.
 */
export async function createPendingPayment(input: {
  userId: string | null;
  amount: number;
  description: string;
  meta?: PremiumOrderMeta | null;
}): Promise<Payment> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const orderCode = newOrderCode(attempt);
    try {
      return await prisma.payment.create({
        data: {
          orderCode,
          amount: input.amount,
          description: input.description,
          userId: input.userId,
          meta: input.meta ? (input.meta as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
        },
      });
    } catch (e) {
      // P2002 = unique constraint (orderCode already taken) → try another code.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        lastError = e;
        continue;
      }
      throw e;
    }
  }
  throw lastError ?? new Error("Không sinh được mã đơn hàng duy nhất");
}

/** Store the PayOS checkout link on the reserved row (best-effort: the order is
 *  already valid without it — it's only used for support/debugging). */
export async function attachCheckoutUrl(id: string, checkoutUrl: string): Promise<void> {
  await prisma.payment
    .update({ where: { id }, data: { checkoutUrl } })
    .catch((e) => console.error("[payment] lưu checkoutUrl thất bại:", e));
}

/** The PayOS call blew up — retire the reserved row so it stops showing as pending. */
export async function abandonPayment(id: string): Promise<void> {
  await prisma.payment
    .updateMany({ where: { id, status: "PENDING" }, data: { status: "FAILED" } })
    .catch((e) => console.error("[payment] abandon failed:", e));
}

export interface CheckoutInput {
  userId: string | null;
  amount: number;
  /** Full text kept on our Payment row (no length limit). */
  description: string;
  /** ≤25 chars — PayOS rejects anything longer with code "20". */
  payosDescription: string;
  meta?: PremiumOrderMeta | null;
  /** Absolute base URL for return/cancel links — see resolveAppUrl(). */
  appUrl: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
}

/**
 * Reserve an order and create its PayOS checkout link — the whole two-system
 * dance in one place, so both checkout routes behave identically.
 *
 * Retries on PayOS code "231" (đơn thanh toán đã tồn tại): our order-code
 * window wraps every ~23 days and Railway re-seeds the DB on each deploy, so a
 * code PayOS already knows is possible. Burning it and taking a fresh one turns
 * a dead-end error into an invisible retry. Any other PayOS failure is thrown
 * for the caller to describe.
 */
export async function createCheckout(
  input: CheckoutInput,
): Promise<{ payment: Payment; checkoutUrl: string; qrCode: string }> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const payment = await createPendingPayment({
      userId: input.userId,
      amount: input.amount,
      description: input.description,
      meta: input.meta,
    });

    try {
      const link = await getPayos().paymentRequests.create({
        orderCode: payment.orderCode,
        amount: input.amount,
        description: input.payosDescription,
        cancelUrl: `${input.appUrl}/pay/cancel?orderCode=${payment.orderCode}`,
        returnUrl: `${input.appUrl}/pay/success?orderCode=${payment.orderCode}`,
        items: [{ name: input.payosDescription, quantity: 1, price: input.amount }],
        buyerName: input.buyerName,
        buyerEmail: input.buyerEmail,
        buyerPhone: input.buyerPhone,
      });
      await attachCheckoutUrl(payment.id, link.checkoutUrl);
      return { payment, checkoutUrl: link.checkoutUrl, qrCode: link.qrCode };
    } catch (e) {
      // Retire the reserved row either way: it holds the order code, so the
      // next attempt is guaranteed a different one.
      await abandonPayment(payment.id);
      if (payosCode(e) === PAYOS_CODE.DUPLICATE_ORDER) {
        console.warn("[payment] PayOS đã có orderCode", payment.orderCode, "— thử mã khác");
        lastError = e;
        continue;
      }
      throw e;
    }
  }

  throw lastError ?? new Error("Không tạo được link thanh toán");
}

/**
 * Flip an order to PAID and hand out its reward — idempotently.
 *
 * The flip and the grant run in ONE transaction: `updateMany` only matches rows
 * that aren't already PAID, so a duplicate webhook (or a webhook racing the
 * status poll) does nothing. And because the grant shares the transaction, a
 * failure mid-grant rolls the flip back too, leaving the order settleable on
 * the next retry instead of stranding a paid customer on the free tier.
 */
export async function settlePaidOrder(
  orderCode: number,
  opts: { paidAmount?: number; raw?: unknown } = {},
): Promise<SettleResult> {
  const existing = await prisma.payment.findUnique({ where: { orderCode } });
  if (!existing) return "unknown";

  // Defensive: never grant on a short payment. Amounts are server-set at
  // checkout, so this should be unreachable.
  if (typeof opts.paidAmount === "number" && opts.paidAmount > 0 && opts.paidAmount < existing.amount) {
    console.warn("[payment] amount mismatch — refusing grant", {
      orderCode,
      charged: existing.amount,
      paid: opts.paidAmount,
    });
    return "underpaid";
  }

  return prisma.$transaction(async (tx) => {
    const flip = await tx.payment.updateMany({
      where: { orderCode, status: { not: "PAID" } },
      data: {
        status: "PAID",
        paidAt: new Date(),
        ...(opts.raw !== undefined ? { rawWebhook: opts.raw as Prisma.InputJsonValue } : {}),
      },
    });
    if (flip.count === 0) return "already";
    await grantOrderReward(tx, existing);
    return "granted";
  });
}

/**
 * Dispatch whatever a paid order is worth. The intent lives in `Payment.meta`
 * (written server-side at checkout), so a client can never ask for more than it
 * paid for. Today the only product is a timed Premium upgrade.
 */
async function grantOrderReward(tx: Prisma.TransactionClient, payment: Payment): Promise<void> {
  const meta = payment.meta as { kind?: string; months?: number } | null;
  if (!meta || meta.kind !== "premium" || !payment.userId || typeof meta.months !== "number") {
    return;
  }
  if (meta.months <= 0 || meta.months > 120) {
    console.warn("[payment] implausible months in meta — skipping grant", meta);
    return;
  }

  const user = await tx.user.findUnique({
    where: { id: payment.userId },
    select: { role: true, premiumUntil: true },
  });
  if (!user) return;
  // OWNER/ADMIN are premium by role — record the payment, don't touch them.
  // Every other role (LEARNER, STUDENT, TEACHER, PARENT) buys premium normally.
  if (user.role === "OWNER" || user.role === "ADMIN") return;

  // Stack the new months on top of any remaining time.
  const now = new Date();
  const base =
    user.premiumUntil && user.premiumUntil.getTime() > now.getTime() ? user.premiumUntil : now;

  await tx.user.update({
    where: { id: payment.userId },
    data: {
      isPremium: true,
      premiumUntil: addMonths(base, meta.months),
      premiumGrantedAt: now,
      premiumGrantedBy: "payos",
    },
  });
}

/** PayOS link status → our PaymentStatus enum (which has no UNDERPAID/EXPIRED). */
const TERMINAL_FAILURES = new Set(["CANCELLED", "EXPIRED", "FAILED"]);

/**
 * Ask PayOS what actually happened to an order and bring our row in line.
 * Safe to call repeatedly — settling is idempotent and a still-pending order
 * is simply left alone. Returns the freshest Payment row (null if unknown).
 */
export async function reconcileOrder(orderCode: number): Promise<Payment | null> {
  const payment = await prisma.payment.findUnique({ where: { orderCode } });
  if (!payment) return null;
  // PAID is terminal; nothing to ask PayOS about.
  if (payment.status === "PAID" || !isConfigured()) return payment;

  let link;
  try {
    link = await getPayos().paymentRequests.get(orderCode);
  } catch (e) {
    // Network/PayOS hiccup — keep the row as-is, the caller polls again.
    console.error("[payment] reconcile lookup failed:", orderCode, e);
    return payment;
  }

  if (link.status === "PAID") {
    await settlePaidOrder(orderCode, { paidAmount: link.amountPaid, raw: { source: "reconcile", link } });
  } else if (TERMINAL_FAILURES.has(link.status)) {
    await prisma.payment.updateMany({
      where: { orderCode, status: "PENDING" },
      data: { status: link.status === "FAILED" ? "FAILED" : "CANCELLED" },
    });
  }

  return prisma.payment.findUnique({ where: { orderCode } });
}

/** Narrow a query-string order code to a value our Int column can hold. */
export function parseOrderCode(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0 || n > 2_147_483_647) return null;
  return n;
}

export type { PaymentStatus };
