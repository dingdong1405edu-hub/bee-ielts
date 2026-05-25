import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * PayOS return URL after a successful checkout. The orderCode comes back in
 * the query string; we look up the Payment row to confirm it's actually
 * paid (the webhook is the source of truth — this page just informs).
 */
export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderCode?: string }>;
}) {
  const { orderCode } = await searchParams;
  const code = orderCode ? Number(orderCode) : NaN;
  const payment =
    Number.isFinite(code) && code > 0
      ? await prisma.payment.findUnique({ where: { orderCode: code } })
      : null;
  const confirmed = payment?.status === "PAID";

  return (
    <div className="max-w-md mx-auto py-12 space-y-6 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {confirmed ? "Thanh toán thành công 🎉" : "Đã nhận yêu cầu thanh toán"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {confirmed
            ? "Cảm ơn bạn — đơn hàng đã được ghi nhận trên hệ thống."
            : "Hệ thống đang đợi PayOS xác nhận. Trạng thái sẽ tự cập nhật trong vài giây."}
        </p>
      </div>
      {payment && (
        <Card>
          <CardContent className="p-5 space-y-2 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mã đơn</span>
              <span className="font-mono font-bold">{payment.orderCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Số tiền</span>
              <span className="font-bold">{payment.amount.toLocaleString("vi-VN")}đ</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nội dung</span>
              <span className="font-medium text-right line-clamp-2">{payment.description}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Trạng thái</span>
              <span className="font-bold">
                {payment.status === "PAID" ? "Đã thanh toán" : "Đang chờ xác nhận"}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
      <Button asChild variant="brand" size="xl" className="w-full rounded-full">
        <Link href="/dashboard">Về trang chính</Link>
      </Button>
    </div>
  );
}
