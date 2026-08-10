import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { parseOrderCode, reconcileOrder } from "@/lib/payment";
import { effectivePremium } from "@/lib/premium";
import { PaymentResult, type PaymentSnapshot } from "./payment-result";

export const dynamic = "force-dynamic";

/**
 * PayOS return URL after checkout. Landing here is itself a settlement trigger:
 * we ask PayOS whether the order is paid and, if so, flip the row + grant
 * premium before rendering. The webhook does the same job faster when it is
 * registered — whichever wins, `settlePaidOrder()` makes sure the grant happens
 * exactly once.
 */
export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderCode?: string }>;
}) {
  const { orderCode: rawCode } = await searchParams;
  const orderCode = parseOrderCode(rawCode);
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const payment = orderCode !== null ? await reconcileOrder(orderCode) : null;

  // Unknown code, or someone else's order — say so instead of leaking details.
  if (!payment || (payment.userId && payment.userId !== userId)) {
    return (
      <div className="mx-auto max-w-md space-y-6 py-12 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight">Không tìm thấy đơn hàng</h1>
          <p className="text-sm text-muted-foreground">
            Liên kết thanh toán không hợp lệ hoặc đơn không thuộc tài khoản này.
          </p>
        </div>
        <Button asChild variant="brand" size="xl" className="w-full rounded-full">
          <Link href="/premium">Về trang Premium</Link>
        </Button>
      </div>
    );
  }

  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, isPremium: true, premiumUntil: true },
      })
    : null;

  const initial: PaymentSnapshot = {
    orderCode: payment.orderCode,
    status: payment.status,
    amount: payment.amount,
    description: payment.description,
    premium: user ? effectivePremium(user) : false,
    premiumUntil: user?.premiumUntil?.toISOString() ?? null,
  };

  return <PaymentResult initial={initial} />;
}
