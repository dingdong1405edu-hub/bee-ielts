import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { parseOrderCode, reconcileOrder } from "@/lib/payment";

export const dynamic = "force-dynamic";

/**
 * PayOS cancel URL when the customer abandons the checkout.
 *
 * We don't blind-write CANCELLED any more — we ask PayOS what the link's real
 * status is. That matters because this URL is also reachable by pressing Back:
 * an order the customer is still paying stays PENDING, and one that actually
 * went through is settled (and premium granted) right here.
 */
export default async function PaymentCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ orderCode?: string }>;
}) {
  const { orderCode: rawCode } = await searchParams;
  const orderCode = parseOrderCode(rawCode);
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const settled = orderCode !== null ? await reconcileOrder(orderCode) : null;
  // Only show order details to the account that owns the order.
  const payment = settled && (!settled.userId || settled.userId === userId) ? settled : null;
  const paid = payment?.status === "PAID";
  // Premium orders retry on /premium (where the plans live); the generic
  // "pay any amount" flow retries on /pay.
  const isPremiumOrder = (payment?.meta as { kind?: string } | null)?.kind === "premium";
  const retryHref = isPremiumOrder || !payment ? "/premium" : "/pay";

  return (
    <div className="mx-auto max-w-md space-y-6 py-12 text-center">
      <div
        className={
          paid
            ? "mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-sage-500 text-white shadow-lg shadow-sage-500/30"
            : "mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-foreground text-background shadow-lg"
        }
      >
        {paid ? <CheckCircle2 className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {paid ? "Đơn này đã thanh toán 🎉" : "Thanh toán đã huỷ"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {paid
            ? "Hệ thống ghi nhận đơn đã thanh toán thành công — quyền lợi đã được kích hoạt."
            : "Đơn của bạn chưa được thanh toán. Bạn có thể tạo đơn mới bất cứ lúc nào."}
        </p>
      </div>
      {payment && (
        <Card>
          <CardContent className="space-y-2 p-5 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mã đơn</span>
              <span className="font-mono font-bold">{payment.orderCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Số tiền</span>
              <span className="font-bold">{payment.amount.toLocaleString("vi-VN")}đ</span>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="flex gap-3">
        <Button asChild variant="outline" size="xl" className="flex-1 rounded-full">
          <Link href="/dashboard">Về trang chính</Link>
        </Button>
        <Button asChild variant="brand" size="xl" className="flex-1 rounded-full">
          <Link href={paid ? "/premium" : retryHref}>{paid ? "Xem Premium" : "Thử lại"}</Link>
        </Button>
      </div>
    </div>
  );
}
