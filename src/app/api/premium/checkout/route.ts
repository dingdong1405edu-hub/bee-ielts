import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { describePayosFailure, isConfigured, resolveAppUrl } from "@/lib/payos";
import { createCheckout } from "@/lib/payment";
import { getPlan } from "@/lib/premium-plans";

/**
 * Create a PayOS checkout for a Premium plan. The client only sends `planId`;
 * the amount + duration are looked up server-side from PREMIUM_PLANS so they
 * can't be tampered with. The order is tagged `meta.kind = "premium"` so
 * settlement knows to grant premium for `meta.months` once PayOS confirms.
 */
const bodySchema = z.object({ planId: z.string().min(1).max(40) });

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "PayOS chưa cấu hình trên server (thiếu PAYOS_CLIENT_ID / PAYOS_API_KEY / PAYOS_CHECKSUM_KEY)" },
      { status: 503 },
    );
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Bạn cần đăng nhập để mua Premium" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Gói không hợp lệ" }, { status: 400 });
  }
  const plan = getPlan(parsed.data.planId);
  if (!plan) {
    return NextResponse.json({ error: "Không tìm thấy gói Premium" }, { status: 400 });
  }

  try {
    const { payment, checkoutUrl, qrCode } = await createCheckout({
      userId,
      amount: plan.priceVnd,
      description: `Bee IELTS Premium ${plan.label}`,
      // PayOS rejects a description over 25 chars with code "20".
      payosDescription: `Premium ${plan.label}`.slice(0, 25),
      meta: { kind: "premium", planId: plan.id, months: plan.months },
      appUrl: resolveAppUrl(req),
      buyerName: session.user.name ?? undefined,
      buyerEmail: session.user.email ?? undefined,
    });

    return NextResponse.json({ orderCode: payment.orderCode, checkoutUrl, qrCode });
  } catch (e) {
    const { message, detail } = describePayosFailure(e);
    console.error("[premium checkout] thất bại:", detail, e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
