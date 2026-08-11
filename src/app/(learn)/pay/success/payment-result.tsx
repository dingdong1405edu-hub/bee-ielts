"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Crown, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PaymentQr, type QrPayload } from "@/components/learn/payment-qr";
import { usePaymentStatus, type PaymentStatusValue } from "@/components/learn/use-payment-status";

export interface PaymentSnapshot {
  orderCode: number;
  status: PaymentStatusValue;
  amount: number;
  description: string;
  premium: boolean;
  premiumUntil: string | null;
}

/**
 * Live result of a PayOS checkout, and the recovery route for the in-app QR:
 * if the order is still unpaid, the same QR is rendered again here — so closing
 * the checkout dialog (or reloading) never strands a customer with an order
 * they can't pay.
 *
 * The server reconciles the order once before rendering, so the common case
 * arrives already PAID; `usePaymentStatus` keeps watching otherwise.
 */
export function PaymentResult({
  initial,
  qr,
}: {
  initial: PaymentSnapshot;
  /** Transfer details, present only while the order is still payable. */
  qr: QrPayload | null;
}) {
  const router = useRouter();
  const { status, premium, premiumUntil, settled, checking, gaveUp, recheck } = usePaymentStatus(
    initial.orderCode,
    { status: initial.status, premium: initial.premium, premiumUntil: initial.premiumUntil },
  );

  // Refresh the server tree once the order lands so the nav/sidebar pick up the
  // new premium state. Needed even when the page arrived already-PAID: the
  // layout renders in parallel with the page, so it may have read the user row
  // a moment before the grant committed. `router.refresh()` is a soft refresh —
  // this ref survives it, so the guard can't loop.
  const refreshedRef = useRef(false);
  useEffect(() => {
    if (status === "PAID" && !refreshedRef.current) {
      refreshedRef.current = true;
      router.refresh();
    }
  }, [status, router]);

  const paid = status === "PAID";
  const failed = status === "CANCELLED" || status === "FAILED";
  const showQr = !settled && qr !== null;

  return (
    <div className="mx-auto max-w-md space-y-6 py-10 text-center">
      <div
        className={
          paid
            ? "mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-leaf text-white shadow-lg shadow-leaf/30"
            : failed
              ? "mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-foreground text-background shadow-lg"
              : "mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary"
        }
      >
        {paid ? (
          <CheckCircle2 className="h-8 w-8" />
        ) : failed ? (
          <XCircle className="h-8 w-8" />
        ) : (
          <Crown className="h-8 w-8" />
        )}
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {paid
            ? "Thanh toán thành công 🎉"
            : failed
              ? "Đơn hàng chưa hoàn tất"
              : showQr
                ? "Quét mã để thanh toán"
                : "Đang xác nhận thanh toán…"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {paid
            ? premium
              ? "Tài khoản của bạn đã được mở Premium."
              : "Đơn hàng đã được ghi nhận trên hệ thống."
            : failed
              ? "Đơn này đã bị huỷ hoặc hết hạn. Bạn có thể tạo lại đơn mới bất cứ lúc nào."
              : showQr
                ? "Đơn của bạn vẫn còn hiệu lực — quét mã dưới đây để hoàn tất."
                : gaveUp
                  ? "Chưa nhận được xác nhận từ PayOS. Nếu bạn đã chuyển khoản, bấm kiểm tra lại."
                  : "Đang đối soát với PayOS — thường mất vài giây. Bạn không cần làm gì thêm."}
        </p>
      </div>

      {paid && premium && premiumUntil && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border-2 border-primary/40 bg-primary/5 p-3 text-sm font-bold">
          <Crown className="h-4 w-4 text-primary" />
          Premium có hiệu lực đến {new Date(premiumUntil).toLocaleDateString("vi-VN")}
        </div>
      )}

      {showQr && (
        <div className="text-left">
          <PaymentQr payload={qr} waiting={!gaveUp} checking={checking} />
        </div>
      )}

      <Card>
        <CardContent className="space-y-2 p-5 text-left text-sm">
          <Row
            label="Mã đơn"
            value={<span className="font-mono font-bold">{initial.orderCode}</span>}
          />
          <Row
            label="Số tiền"
            value={<span className="font-bold">{initial.amount.toLocaleString("vi-VN")}đ</span>}
          />
          <Row
            label="Nội dung"
            value={<span className="line-clamp-2 text-right font-medium">{initial.description}</span>}
          />
          <Row
            label="Trạng thái"
            value={
              <span className="font-bold">
                {paid
                  ? "Đã thanh toán"
                  : failed
                    ? "Đã huỷ"
                    : gaveUp
                      ? "Chưa xác nhận"
                      : "Đang chờ chuyển khoản…"}
              </span>
            }
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        {paid ? (
          <Button asChild variant="brand" size="xl" className="w-full rounded-full">
            <Link href="/premium">Xem quyền lợi Premium</Link>
          </Button>
        ) : (
          <Button
            onClick={recheck}
            disabled={checking}
            variant="brand"
            size="xl"
            className="w-full rounded-full"
          >
            {checking && <Loader2 className="h-4 w-4 animate-spin" />}
            {checking ? "Đang kiểm tra…" : "Đã chuyển khoản? Kiểm tra lại"}
          </Button>
        )}
        <Button asChild variant="outline" size="xl" className="w-full rounded-full">
          <Link href="/dashboard">Về trang chính</Link>
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      {value}
    </div>
  );
}
