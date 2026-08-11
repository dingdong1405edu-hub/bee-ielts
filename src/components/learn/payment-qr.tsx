"use client";
import { useState } from "react";
import { Check, Copy, ExternalLink, Loader2, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";
// TYPE-ONLY import — it is erased at compile time, so nothing from the server
// module (which pulls in Prisma and the PayOS SDK) reaches the browser bundle.
// Keep the `type` keyword: dropping it would ship the whole server module.
import type { QrPayload } from "@/lib/payment";

export type { QrPayload };

/**
 * In-app bank-transfer screen: the VietQR code plus the same details in text,
 * so a customer can either scan it or type the transfer by hand.
 *
 * `qrSvg` is rendered on the server (see src/lib/qr.ts) from the VietQR payload
 * PayOS returns — no QR library reaches the browser and no third-party image
 * host ever sees the account number.
 */
export function PaymentQr({
  payload,
  waiting,
  checking,
}: {
  payload: QrPayload;
  /** Show the "đang chờ chuyển khoản" pulse (false once the order settles). */
  waiting: boolean;
  /** A deep re-check against PayOS is in flight. */
  checking: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* QR */}
      <div className="mx-auto w-full max-w-[260px]">
        <div className="relative rounded-2xl border-2 border-primary/30 bg-white p-3 shadow-sm">
          <div
            className="aspect-square w-full [&>svg]:h-full [&>svg]:w-full"
            // Server-generated markup from the `qrcode` package — never user input.
            dangerouslySetInnerHTML={{ __html: payload.qrSvg }}
          />
        </div>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
          <ScanLine className="h-3.5 w-3.5" />
          Mở app ngân hàng → quét mã này
        </p>
      </div>

      {waiting && (
        <div className="flex items-center justify-center gap-2 rounded-full bg-primary/10 px-3 py-2 text-xs font-bold text-primary">
          {checking ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          )}
          Đang chờ chuyển khoản — trang này tự cập nhật
        </div>
      )}

      {/* Chi tiết để chuyển tay */}
      <div className="divide-y rounded-2xl border bg-card">
        <Row label="Ngân hàng" value={payload.bankName} />
        <Row label="Số tài khoản" value={payload.accountNumber} copy mono />
        <Row label="Chủ tài khoản" value={payload.accountName} />
        <Row
          label="Số tiền"
          value={payload.amount.toLocaleString("vi-VN") + "đ"}
          copyValue={String(payload.amount)}
          copy
          strong
        />
        <Row label="Nội dung" value={payload.transferContent} copy mono highlight />
      </div>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        Giữ nguyên <strong className="text-foreground">nội dung chuyển khoản</strong> — hệ thống dựa
        vào đó để nhận diện đơn của bạn. Chuyển xong Premium mở tự động, không cần báo ai.
      </p>

      <p className="text-center text-[11px] text-muted-foreground">
        Gặp trục trặc?{" "}
        <a
          href={payload.checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2"
        >
          Mở trang thanh toán PayOS
          <ExternalLink className="h-3 w-3" />
        </a>
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  copy,
  copyValue,
  mono,
  strong,
  highlight,
}: {
  label: string;
  value: string;
  copy?: boolean;
  /** Copy this instead of the displayed text (e.g. raw amount without "đ"). */
  copyValue?: string;
  mono?: boolean;
  strong?: boolean;
  highlight?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyValue ?? value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (insecure context / permissions) — the value is
      // visible on screen, so silently leaving it to the user is fine.
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className={cn(
            "truncate text-right text-sm",
            mono && "font-mono",
            strong ? "text-base font-extrabold text-primary" : "font-semibold",
            highlight && "rounded bg-primary/10 px-1.5 py-0.5 text-primary",
          )}
        >
          {value}
        </span>
        {copy && (
          <button
            type="button"
            onClick={onCopy}
            aria-label={`Sao chép ${label}`}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-leaf" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}
