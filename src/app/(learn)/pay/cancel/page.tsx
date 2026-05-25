import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** PayOS cancel/return URL when the customer abandons the checkout. */
export default async function PaymentCancelPage({
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

  // Mark abandoned orders as cancelled so they stop showing as pending.
  if (payment && payment.status === "PENDING") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "CANCELLED" },
    });
  }

  return (
    <div className="max-w-md mx-auto py-12 space-y-6 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-zinc-500 text-white shadow-lg">
        <XCircle className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Thanh toán đã huỷ</h1>
        <p className="text-muted-foreground text-sm">
          Đơn của bạn đã được huỷ. Bạn có thể quay lại trang thanh toán và thử lại bất cứ lúc nào.
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
          </CardContent>
        </Card>
      )}
      <div className="flex gap-3">
        <Button asChild variant="outline" size="xl" className="flex-1 rounded-full">
          <Link href="/dashboard">Về trang chính</Link>
        </Button>
        <Button asChild variant="brand" size="xl" className="flex-1 rounded-full">
          <Link href="/pay">Thử lại</Link>
        </Button>
      </div>
    </div>
  );
}
