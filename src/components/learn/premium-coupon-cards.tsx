"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Crown, Ticket, Loader2, ArrowRight, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Two stacked cards rendered at the bottom of /dashboard:
 *  1. Premium upsell — links to /premium for the full request form, plus
 *     a quick-status indicator (already premium / pending request / fresh).
 *  2. Coupon redemption — single input + redeem button. Toast on success
 *     and refresh so XP/hearts/premium badge updates immediately.
 */
export function PremiumCouponCards({
  isPremium,
  hasPendingRequest,
}: {
  isPremium: boolean;
  hasPendingRequest: boolean;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const redeem = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      toast.error("Nhập mã coupon trước nhé");
      return;
    }
    setRedeeming(true);
    try {
      const res = await fetch("/api/coupons/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Mã không hợp lệ");
      toast.success(data.message || "Đã nhận thưởng!");
      setCode("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Đổi mã thất bại");
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Premium card */}
      <Card
        className={
          isPremium
            ? "border-2 border-sage-400 bg-gradient-to-br from-sage-50/60 to-teal-50/60 dark:from-sage-950/30 dark:to-teal-950/30"
            : "border-2 border-gold-300 bg-gradient-to-br from-gold-50/60 to-gold-200/60 dark:from-gold-950/30 dark:to-gold-900/30"
        }
      >
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div
              className={
                isPremium
                  ? "grid h-11 w-11 place-items-center rounded-2xl bg-sage-500 text-white shadow-md shadow-sage-500/30"
                  : "grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 text-white shadow-md shadow-gold-500/30"
              }
            >
              {isPremium ? <Check className="h-5 w-5" /> : <Crown className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold tracking-tight">
                {isPremium ? "Bạn đang là Premium" : "Nâng cấp Premium"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isPremium
                  ? "Toàn quyền dùng Vượt band + thi thử không giới hạn."
                  : hasPendingRequest
                    ? "Yêu cầu của bạn đang chờ owner duyệt."
                    : "Mở khoá Vượt band + thi thử không giới hạn."}
              </p>
            </div>
          </div>
          {!isPremium && (
            <Button asChild size="sm" className="w-full rounded-xl">
              <Link href="/premium">
                {hasPendingRequest ? "Xem trạng thái yêu cầu" : "Gửi yêu cầu Premium"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
          {isPremium && (
            <Button asChild size="sm" variant="outline" className="w-full rounded-xl">
              <Link href="/premium">Xem quyền lợi</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Coupon redemption card */}
      <Card className="border-2 border-leaf/40 bg-gradient-to-br from-leaf-tint/60 to-sage-50/60 dark:from-leaf/15 dark:to-sage-950/30">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-leaf to-sage-600 text-white shadow-md shadow-leaf/30">
              <Ticket className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold tracking-tight">Nhập mã coupon</h3>
              <p className="text-xs text-muted-foreground">
                Có mã code do admin cấp? Nhập vào đây để nhận thưởng (Premium / XP / hearts).
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="VD: WELCOME2026"
              className="font-mono tracking-wider uppercase"
              disabled={redeeming}
              onKeyDown={(e) => {
                if (e.key === "Enter") redeem();
              }}
              maxLength={64}
            />
            <Button
              size="sm"
              onClick={redeem}
              disabled={redeeming || !code.trim()}
              className="rounded-xl shrink-0"
            >
              {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Đổi"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
