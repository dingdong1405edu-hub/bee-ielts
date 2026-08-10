import { NextResponse } from "next/server";
import type { Webhook } from "@payos/node";
import { isConfigured, getPayos } from "@/lib/payos";
import { settlePaidOrder } from "@/lib/payment";

/**
 * PayOS webhook receiver. PayOS POSTs the order outcome here — register this
 * URL on the PayOS dashboard (Channels → Webhook), or run:
 *   npx tsx scripts/payos-webhook.ts https://beeielts.com/api/payment/webhook
 *
 * The handler verifies the HMAC signature with the checksum key, then hands the
 * order to `settlePaidOrder()`, which flips the row to PAID and grants premium
 * exactly once. The /pay/success page reconciles the same order against the
 * PayOS API, so a missing or failed webhook only delays the upgrade — it can no
 * longer lose it.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Reserved order code PayOS uses for its "confirm webhook" test ping. */
const TEST_ORDER_CODE = 123;

interface RawWebhook {
  code?: string;
  desc?: string;
  success?: boolean;
  data?: { orderCode?: number; amount?: number; code?: string } | null;
  signature?: string;
}

export async function POST(req: Request) {
  const raw = (await req.json().catch(() => null)) as RawWebhook | null;
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "Body rỗng" }, { status: 400 });
  }

  // PayOS validates the endpoint before it will save the URL, and it only
  // accepts a 2xx. Its probe carries either the reserved orderCode 123 or no
  // usable body at all — acknowledge both BEFORE any signature/config check so
  // registration can never fail on a technicality. Nothing is written here.
  if (!raw.data || !raw.signature || raw.data.orderCode === TEST_ORDER_CODE) {
    return NextResponse.json({ success: true, test: true });
  }

  if (!isConfigured()) {
    console.error("[payos webhook] PayOS env chưa cấu hình — bỏ qua webhook");
    return NextResponse.json({ error: "PayOS chưa cấu hình" }, { status: 503 });
  }

  let data;
  try {
    data = await getPayos().webhooks.verify(raw as unknown as Webhook);
  } catch (e) {
    console.error("[payos webhook] signature verify failed:", e);
    return NextResponse.json({ error: "Chữ ký không hợp lệ" }, { status: 401 });
  }

  // PayOS marks a successful transfer with code "00" on the inner data object;
  // the envelope repeats it. Accept either so a payload shape change can't
  // silently turn every paid order into a failure.
  const paid = data.code === "00" || (raw.code === "00" && raw.success === true);

  if (!paid) {
    console.warn("[payos webhook] non-success payload", {
      orderCode: data.orderCode,
      code: data.code,
      desc: data.desc,
    });
    // PayOS only calls us on settled transfers, so a non-"00" payload is an
    // anomaly, not a cancellation — record it without touching the status, and
    // let /api/payment/status reconcile the truth against the PayOS API.
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const result = await settlePaidOrder(data.orderCode, { paidAmount: data.amount, raw });
    if (result === "unknown") {
      console.warn("[payos webhook] no Payment row for orderCode", data.orderCode);
    }
    // 200 on a verified payload — a non-2xx makes PayOS retry, and we have
    // already recorded everything we can.
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    // DB unreachable mid-settlement. Answer 5xx *on purpose*: PayOS retries,
    // and the /pay/success reconcile is the second net under this.
    console.error("[payos webhook] settle failed for orderCode", data.orderCode, e);
    return NextResponse.json({ error: "Lỗi xử lý đơn" }, { status: 500 });
  }
}
