import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPayos, isConfigured } from "@/lib/payos";

/**
 * PayOS webhook receiver. PayOS POSTs the order outcome here — register this
 * URL on the PayOS dashboard (Channels → Webhook).
 *   <NEXT_PUBLIC_APP_URL>/api/payment/webhook
 *
 * The handler verifies the HMAC signature using the checksum key, then
 * updates the matching Payment row's status. Any business logic that grants
 * the customer something (mark premium, credit hearts, …) belongs here.
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
  await prisma.payment.update({
    where: { orderCode: data.orderCode },
    data: {
      status: paid ? "PAID" : "FAILED",
      paidAt: paid ? new Date() : null,
      rawWebhook: raw as object,
    },
  });

  // TODO (when products are decided): on `paid`, grant the user whatever the
  // order is worth — premium flag, hearts top-up, mock test access, etc.
  // Look up `existing.userId` + `existing.description` to dispatch.

  return NextResponse.json({ ok: true });
}
