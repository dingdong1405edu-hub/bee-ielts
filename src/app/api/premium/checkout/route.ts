import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getPayos, isConfigured, newOrderCode } from "@/lib/payos";
import { getPlan } from "@/lib/premium-plans";

/**
 * Create a PayOS checkout for a Premium plan. The client only sends `planId`;
 * the amount + duration are looked up server-side from PREMIUM_PLANS so they
 * can't be tampered with. The order is tagged `meta.kind = "premium"` so the
 * webhook knows to grant premium (for `meta.months`) once PayOS confirms.
 */
const bodySchema = z.object({ planId: z.string().min(1).max(40) });

export async function POST(req: Request) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "PayOS chưa cấu hình trên server" }, { status: 503 });
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

  const orderCode = newOrderCode();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const fullDescription = `Bee IELTS Premium ${plan.label}`;
  // PayOS caps the checkout description at 25 chars — keep the full text on our
  // Payment row and pass a short version to PayOS.
  const payosDescription = `Premium ${plan.label}`.slice(0, 25);

  try {
    const link = await getPayos().paymentRequests.create({
      orderCode,
      amount: plan.priceVnd,
      description: payosDescription,
      cancelUrl: `${appUrl}/premium?status=cancel`,
      returnUrl: `${appUrl}/pay/success?orderCode=${orderCode}`,
      items: [{ name: payosDescription, quantity: 1, price: plan.priceVnd }],
      buyerName: session.user.name ?? undefined,
      buyerEmail: session.user.email ?? undefined,
    });

    await prisma.payment.create({
      data: {
        orderCode,
        amount: plan.priceVnd,
        description: fullDescription,
        userId,
        checkoutUrl: link.checkoutUrl,
        meta: { kind: "premium", planId: plan.id, months: plan.months },
      },
    });

    return NextResponse.json({
      orderCode,
      checkoutUrl: link.checkoutUrl,
      qrCode: link.qrCode,
    });
  } catch (e) {
    console.error("[premium checkout] failed:", e);
    return NextResponse.json(
      { error: "Không tạo được link thanh toán. Kiểm tra credentials PayOS." },
      { status: 502 },
    );
  }
}
