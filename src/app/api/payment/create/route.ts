import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { describePayosFailure, isConfigured, resolveAppUrl } from "@/lib/payos";
import { createCheckout } from "@/lib/payment";

/**
 * Generic "pay any amount" checkout behind /pay. Grants nothing on settlement
 * (no `meta`) — the Premium purchase flow lives in /api/premium/checkout.
 */

// PayOS amount is in VND (integer). 2 000đ is our own floor.
const bodySchema = z.object({
  amount: z.number().int().min(2000).max(500_000_000),
  description: z.string().min(1).max(255),
  buyerName: z.string().max(120).optional(),
  buyerEmail: z.string().email().max(120).optional(),
  buyerPhone: z.string().max(40).optional(),
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "PayOS chưa cấu hình trên server (thiếu PAYOS_CLIENT_ID / PAYOS_API_KEY / PAYOS_CHECKSUM_KEY)" },
      { status: 503 },
    );
  }
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Số tiền hoặc mô tả không hợp lệ" }, { status: 400 });
  }
  const { amount, description, buyerName, buyerEmail, buyerPhone } = parsed.data;

  try {
    const { payment, checkoutUrl, qrCode } = await createCheckout({
      userId,
      amount,
      description,
      // PayOS rejects a description over 25 chars with code "20"; keep the full
      // text on our Payment row and show PayOS the short version.
      payosDescription: description.slice(0, 25),
      appUrl: resolveAppUrl(req),
      buyerName,
      buyerEmail,
      buyerPhone,
    });

    return NextResponse.json({ orderCode: payment.orderCode, checkoutUrl, qrCode });
  } catch (e) {
    const { message, detail } = describePayosFailure(e);
    console.error("[payos create] thất bại:", detail, e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
