import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getPayos, isConfigured, newOrderCode } from "@/lib/payos";

// PayOS amount is in VND (integer). 2 000đ minimum is PayOS's lower bound.
const bodySchema = z.object({
  amount: z.number().int().min(2000).max(500_000_000),
  description: z.string().min(1).max(255),
  buyerName: z.string().max(120).optional(),
  buyerEmail: z.string().email().max(120).optional(),
  buyerPhone: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "PayOS chưa cấu hình trên server" }, { status: 503 });
  }
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Số tiền hoặc mô tả không hợp lệ" }, { status: 400 });
  }
  const { amount, description, buyerName, buyerEmail, buyerPhone } = parsed.data;

  const orderCode = newOrderCode();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  // PayOS caps `description` at 25 characters; keep the full text on our side
  // and pass a short version to PayOS so the checkout page renders cleanly.
  const payosDescription = description.slice(0, 25);

  try {
    const link = await getPayos().paymentRequests.create({
      orderCode,
      amount,
      description: payosDescription,
      cancelUrl: `${appUrl}/pay/cancel?orderCode=${orderCode}`,
      returnUrl: `${appUrl}/pay/success?orderCode=${orderCode}`,
      items: [{ name: payosDescription, quantity: 1, price: amount }],
      buyerName,
      buyerEmail,
      buyerPhone,
    });

    await prisma.payment.create({
      data: {
        orderCode,
        amount,
        description,
        userId,
        checkoutUrl: link.checkoutUrl,
      },
    });

    return NextResponse.json({
      orderCode,
      checkoutUrl: link.checkoutUrl,
      qrCode: link.qrCode,
    });
  } catch (e) {
    console.error("[payos create] failed:", e);
    return NextResponse.json(
      { error: "Không tạo được link thanh toán. Kiểm tra credentials PayOS." },
      { status: 502 },
    );
  }
}
