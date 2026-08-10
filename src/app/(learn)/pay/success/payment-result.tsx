"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Crown, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface PaymentSnapshot {
  orderCode: number;
  status: "PENDING" | "PAID" | "CANCELLED" | "FAILED";
  amount: number;
  description: string;
  premium: boolean;
  premiumUntil: string | null;
}

/**
 * Live result of a PayOS checkout.
 *
 * The server already reconciled the order once before rendering, so the common
 * case lands here as PAID. When the bank leg is still settling we poll
 * /api/payment/status — every call re-asks PayOS — until the order resolves.
 * That keeps the upgrade automatic even if the webhook never fires.
 */
const POLL_MS = 3000;
const MAX_POLLS = 20; // ≈1 minute of patience before we stop bothering PayOS

export function PaymentResult({ initial }: { initial: PaymentSnapshot }) {
  const router = useRouter();
  const [snap, setSnap] = useState<PaymentSnapshot>(initial);
  const [polling, setPolling] = useState(initial.status === "PENDING");
  const pollsRef = useRef(0);
  // Refresh the server tree once when the order lands so the nav/sidebar pick up
  // the new premium state. Needed even when the page arrived already-PAID: the
  // layout renders in parallel with the page, so it may have read the user row
  // a moment before the grant committed. `router.refresh()` is a soft refresh —
  // this ref survives it, so the guard can't loop.
  const refreshedRef = useRef(false);

  const settled = snap.status !== "PENDING";

  const check = useCallback(async () => {
    try {
      const res = await fetch(`/api/payment/status?orderCode=${snap.orderCode}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as Partial<PaymentSnapshot>;
      if (!data.status) return;
      setSnap((prev) => ({ ...prev, ...data } as PaymentSnapshot));
    } catch {
      // Transient network error — the next tick retries.
    }
  }, [snap.orderCode]);

  useEffect(() => {
    if (!polling) return;
    const id = setInterval(() => {
      pollsRef.current += 1;
      if (pollsRef.current > MAX_POLLS) {
        setPolling(false);
        return;
      }
      void check();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [polling, check]);

  useEffect(() => {
    if (settled) setPolling(false);
    if (snap.status === "PAID" && !refreshedRef.current) {
      refreshedRef.current = true;
      router.refresh();
    }
  }, [settled, snap.status, router]);

  const paid = snap.status === "PAID";
  const failed = snap.status === "CANCELLED" || snap.status === "FAILED";

  return (
    <div className="mx-auto max-w-md space-y-6 py-12 text-center">
      <div
        className={
          paid
            ? "mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-sage-500 text-white shadow-lg shadow-sage-500/30"
            : failed
              ? "mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-foreground text-background shadow-lg"
              : "mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-muted text-muted-foreground"
        }
      >
        {paid ? (
          <CheckCircle2 className="h-8 w-8" />
        ) : failed ? (
          <XCircle className="h-8 w-8" />
        ) : (
          <Loader2 className="h-8 w-8 animate-spin" />
        )}
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {paid
            ? "Thanh toán thành công 🎉"
            : failed
              ? "Đơn hàng chưa hoàn tất"
              : "Đang xác nhận thanh toán…"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {paid
            ? snap.premium
              ? "Tài khoản của bạn đã được mở Premium."
              : "Đơn hàng đã được ghi nhận trên hệ thống."
            : failed
              ? "Đơn này đã bị huỷ hoặc hết hạn. Bạn có thể tạo lại đơn mới bất cứ lúc nào."
              : polling
                ? "Đang đối soát với PayOS — thường mất vài giây. Bạn không cần làm gì thêm."
                : "Chưa nhận được xác nhận từ PayOS. Nếu bạn đã chuyển khoản, hãy tải lại trang sau ít phút."}
        </p>
      </div>

      {paid && snap.premium && snap.premiumUntil && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border-2 border-primary/40 bg-primary/5 p-3 text-sm font-bold">
          <Crown className="h-4 w-4 text-primary" />
          Premium có hiệu lực đến {new Date(snap.premiumUntil).toLocaleDateString("vi-VN")}
        </div>
      )}

      <Card>
        <CardContent className="space-y-2 p-5 text-left text-sm">
          <Row label="Mã đơn" value={<span className="font-mono font-bold">{snap.orderCode}</span>} />
          <Row
            label="Số tiền"
            value={<span className="font-bold">{snap.amount.toLocaleString("vi-VN")}đ</span>}
          />
          <Row
            label="Nội dung"
            value={<span className="line-clamp-2 text-right font-medium">{snap.description}</span>}
          />
          <Row
            label="Trạng thái"
            value={
              <span className="font-bold">
                {paid
                  ? "Đã thanh toán"
                  : failed
                    ? "Đã huỷ"
                    : polling
                      ? "Đang chờ xác nhận…"
                      : "Chưa xác nhận"}
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
            onClick={() => {
              pollsRef.current = 0;
              setPolling(true);
              void check();
            }}
            disabled={polling}
            variant="brand"
            size="xl"
            className="w-full rounded-full"
          >
            {polling && <Loader2 className="h-4 w-4 animate-spin" />}
            {polling ? "Đang kiểm tra…" : "Kiểm tra lại"}
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
