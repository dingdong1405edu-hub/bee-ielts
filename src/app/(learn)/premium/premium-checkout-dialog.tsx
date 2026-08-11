"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Crown, Loader2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaymentQr, type QrPayload } from "@/components/learn/payment-qr";
import { usePaymentStatus } from "@/components/learn/use-payment-status";
import { formatVnd } from "@/lib/premium-plans";

/**
 * Buying Premium without ever leaving Bee IELTS: the VietQR code renders right
 * here and the order is watched live, so the moment the transfer lands the
 * dialog flips to the unlocked state. PayOS's hosted page stays available as a
 * fallback link inside <PaymentQr>.
 */
export function PremiumCheckoutDialog({
  open,
  onOpenChange,
  planLabel,
  payload,
  loading,
  error,
  onRetry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planLabel: string | null;
  payload: QrPayload | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {payload ? (
          <CheckoutWatcher payload={payload} planLabel={planLabel} onClose={() => onOpenChange(false)} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{error ? "Chưa tạo được đơn" : "Đang tạo đơn hàng…"}</DialogTitle>
              <DialogDescription>
                {error ?? `Gói Premium ${planLabel ?? ""}`.trim()}
              </DialogDescription>
            </DialogHeader>
            <div className="grid place-items-center py-8">
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : (
                <AlertCircle className="h-8 w-8 text-destructive" />
              )}
            </div>
            {error && (
              <Button onClick={onRetry} variant="brand" className="w-full rounded-xl">
                Thử lại
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Live half of the dialog. Split out because `usePaymentStatus` needs an order
 * code, which only exists once the checkout call has returned.
 */
function CheckoutWatcher({
  payload,
  planLabel,
  onClose,
}: {
  payload: QrPayload;
  planLabel: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const { status, premium, premiumUntil, settled, checking, gaveUp, recheck } = usePaymentStatus(
    payload.orderCode,
    { status: "PENDING", premium: false, premiumUntil: null },
  );
  // Pull the server tree once the order lands so the nav, sidebar and plan
  // cards all reflect the new premium state behind the dialog.
  const refreshedRef = useRef(false);

  useEffect(() => {
    if (status === "PAID" && !refreshedRef.current) {
      refreshedRef.current = true;
      router.refresh();
    }
  }, [status, router]);

  if (status === "PAID") {
    return (
      <>
        <DialogHeader>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-leaf text-white shadow-lg shadow-leaf/30">
            <Check className="h-7 w-7" />
          </div>
          <DialogTitle>Thanh toán thành công 🎉</DialogTitle>
          <DialogDescription>
            {premium
              ? premiumUntil
                ? `Premium đã mở, có hiệu lực đến ${new Date(premiumUntil).toLocaleDateString("vi-VN")}.`
                : "Premium đã được mở cho tài khoản của bạn."
              : "Đơn hàng đã được ghi nhận."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button asChild variant="brand" size="lg" className="w-full rounded-xl">
            <Link href="/band-climber">
              <TrendingUp className="h-4 w-4" /> Vào Vượt band
            </Link>
          </Button>
          <Button onClick={onClose} variant="outline" size="lg" className="w-full rounded-xl">
            Ở lại trang này
          </Button>
        </div>
      </>
    );
  }

  if (settled) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Đơn hàng đã đóng</DialogTitle>
          <DialogDescription>
            Đơn này đã bị huỷ hoặc hết hạn. Bạn có thể chọn lại gói và tạo đơn mới.
          </DialogDescription>
        </DialogHeader>
        <Button onClick={onClose} variant="brand" size="lg" className="w-full rounded-xl">
          Chọn lại gói
        </Button>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Crown className="h-6 w-6" />
        </div>
        <DialogTitle>Quét mã để thanh toán</DialogTitle>
        <DialogDescription>
          Premium {planLabel ?? ""} — {formatVnd(payload.amount)}
        </DialogDescription>
      </DialogHeader>

      <PaymentQr payload={payload} waiting={!gaveUp} checking={checking} />

      {gaveUp && (
        <Button onClick={recheck} variant="outline" size="lg" className="w-full rounded-xl">
          {checking && <Loader2 className="h-4 w-4 animate-spin" />}
          Đã chuyển khoản? Kiểm tra lại
        </Button>
      )}
    </>
  );
}
