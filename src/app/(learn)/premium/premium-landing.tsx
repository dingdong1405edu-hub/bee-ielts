"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Crown, TrendingUp, GraduationCap, Check, Loader2, Clock, Sparkles, XCircle, Mail, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PREMIUM_PLANS, formatVnd, type PremiumPlan } from "@/lib/premium-plans";

interface LatestRequest {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  message: string | null;
  createdAt: string;
  decidedAt: string | null;
}

export function PremiumLanding({
  role,
  isPremium,
  premiumUntil,
  premiumGrantedAt,
  latestRequest,
}: {
  role: string;
  isPremium: boolean;
  premiumUntil: string | null;
  premiumGrantedAt: string | null;
  latestRequest: LatestRequest | null;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const from = sp.get("from");
  const cancelled = sp.get("status") === "cancel";
  const [message, setMessage] = useState(latestRequest?.message ?? "");
  const [submitting, setSubmitting] = useState(false);
  // Which plan's checkout link is being created (null = none in flight).
  const [buyingPlan, setBuyingPlan] = useState<string | null>(null);
  const isOwner = role === "OWNER";
  const isAdmin = role === "ADMIN";
  const hasPending = latestRequest?.status === "PENDING";

  const buyPlan = async (plan: PremiumPlan) => {
    setBuyingPlan(plan.id);
    try {
      const res = await fetch("/api/premium/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error || "Không tạo được link thanh toán");
      }
      // Hand off to PayOS — they run the rest of the checkout.
      window.location.href = data.checkoutUrl as string;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi tạo link thanh toán");
      setBuyingPlan(null);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/premium/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gửi yêu cầu thất bại");
      toast.success("Đã gửi yêu cầu — owner sẽ duyệt sớm");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi không xác định");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-[#FF9600] via-[#FF4B6E] to-[#A560E8] p-7 md:p-10 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.2),transparent_50%)]" />
        <div className="relative flex items-start gap-4 flex-wrap">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/20 backdrop-blur border border-white/30">
            <Crown className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Bee IELTS Premium
            </h1>
            <p className="mt-2 text-white/90 max-w-xl">
              {isPremium
                ? "Tài khoản của bạn đang ở gói Premium — toàn quyền sử dụng mọi tính năng."
                : "Mở khoá toàn bộ chặng Vượt band + thi thử IELTS không giới hạn."}
            </p>
          </div>
        </div>
      </div>

      {/* Cancelled-checkout banner (PayOS cancelUrl → /premium?status=cancel) */}
      {cancelled && !isPremium && (
        <Card className="border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4 text-sm flex items-center gap-3">
            <XCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-amber-900 dark:text-amber-300">
              Bạn đã huỷ thanh toán. Có thể chọn lại gói bên dưới bất cứ lúc nào.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Context banner from gate redirect */}
      {!isPremium && from === "band-climber" && (
        <Card className="border-2 border-honey/40 bg-honey-tint dark:bg-honey/10">
          <CardContent className="p-4 text-sm flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-honey-deep shrink-0" />
            <p className="text-ink dark:text-honey">
              Phần <strong>Vượt band</strong> chỉ dành cho tài khoản Premium. Gửi yêu cầu bên dưới
              để được mở khoá.
            </p>
          </CardContent>
        </Card>
      )}
      {!isPremium && from === "mock-quota" && (
        <Card className="border-2 border-rose-300 bg-rose-50 dark:bg-rose-950/20">
          <CardContent className="p-4 text-sm flex items-center gap-3">
            <GraduationCap className="h-5 w-5 text-rose-600 shrink-0" />
            <p className="text-rose-900 dark:text-rose-300">
              Bạn đã dùng <strong>1 lượt thi thử miễn phí</strong> tuần này. Premium cho phép thi
              không giới hạn.
            </p>
          </CardContent>
        </Card>
      )}
      {!isPremium && from === "shadowing" && (
        <Card className="border-2 border-primary/40 bg-primary/5">
          <CardContent className="p-4 text-sm flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <p>
              Bài luyện <strong>Shadowing</strong> này dành cho tài khoản Premium. Nâng cấp bên dưới
              để mở khoá toàn bộ thư viện.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Benefits grid */}
      <Card>
        <CardContent className="p-5 md:p-6 space-y-3">
          <h2 className="font-extrabold tracking-tight flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Premium có gì?
          </h2>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            <BenefitRow
              icon={TrendingUp}
              title="Mở khoá Vượt band"
              detail="Toàn bộ chặng từ band 3 → 9, mini-quiz, lộ trình theo skill yếu."
            />
            <BenefitRow
              icon={GraduationCap}
              title="Thi thử không giới hạn"
              detail="Free chỉ 1 lượt/tuần — Premium thi bao nhiêu lượt cũng được."
            />
            <BenefitRow
              icon={Sparkles}
              title="AI chấm chi tiết"
              detail="Mọi bài Writing + Speaking đều được AI chấm 4 tiêu chí band score."
            />
            <BenefitRow
              icon={Crown}
              title="Hỗ trợ ưu tiên"
              detail="Hỏi đáp về band, lộ trình, từ vựng — owner phản hồi sớm."
            />
          </ul>
        </CardContent>
      </Card>

      {/* Self-serve PayOS purchase — kept ALONGSIDE the owner-request form below
          so users can either pay or ask the owner. Shown to free users and to
          timed-plan users who want to extend. */}
      {(!isPremium || premiumUntil) && (
        <BuyPremiumCard extend={isPremium} buyingPlan={buyingPlan} onBuy={buyPlan} />
      )}

      {/* State-dependent action card */}
      {isPremium ? (
        <Card className="border-2 border-sage-400 bg-gradient-to-br from-sage-50 to-teal-50 dark:from-sage-950/30 dark:to-teal-950/30">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-sage-600" />
              <h3 className="font-extrabold text-sage-900 dark:text-sage-200">
                {isOwner
                  ? "Bạn là OWNER — premium mặc định"
                  : isAdmin
                    ? "Bạn là ADMIN — premium mặc định"
                    : "Tài khoản của bạn đang ở gói Premium"}
              </h3>
            </div>
            <p className="text-sm text-sage-900/80 dark:text-sage-300/80">
              {premiumUntil
                ? `Gói Premium có hiệu lực đến ${new Date(premiumUntil).toLocaleDateString("vi-VN")}.`
                : premiumGrantedAt
                  ? `Cấp lúc ${new Date(premiumGrantedAt).toLocaleString("vi-VN")}.`
                  : "Bạn có toàn quyền dùng mọi tính năng."}
            </p>
            <div className="pt-2 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/band-climber">
                  <TrendingUp className="h-3.5 w-3.5" /> Vào Vượt band
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/mock">
                  <GraduationCap className="h-3.5 w-3.5" /> Thi thử
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : hasPending ? (
        <Card className="border-2 border-gold-300 bg-gold-50 dark:bg-gold-950/20">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gold-600 animate-pulse" />
              <h3 className="font-extrabold text-gold-900 dark:text-gold-200">
                Yêu cầu của bạn đang chờ owner duyệt
              </h3>
            </div>
            <p className="text-sm text-gold-900/80 dark:text-gold-300/80">
              Gửi lúc {new Date(latestRequest!.createdAt).toLocaleString("vi-VN")}. Owner sẽ duyệt
              sớm — bạn có thể cập nhật lời nhắn bên dưới và bấm gửi lại nếu cần.
            </p>
            <RequestForm
              message={message}
              setMessage={setMessage}
              submit={submit}
              submitting={submitting}
              ctaLabel="Cập nhật yêu cầu"
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-primary/30">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <h3 className="font-extrabold">Yêu cầu nâng cấp Premium</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Gửi một lời nhắn ngắn để owner biết bạn cần Premium cho mục đích gì (ôn IELTS,
              chuẩn bị thi tháng…). Tuỳ chọn — bỏ trống vẫn gửi được.
            </p>
            {latestRequest?.status === "REJECTED" && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/20 p-3 text-sm">
                <XCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-rose-900 dark:text-rose-300">
                    Yêu cầu trước đó đã bị từ chối
                  </p>
                  <p className="text-rose-900/80 dark:text-rose-300/80 text-xs mt-0.5">
                    Bạn vẫn có thể gửi lại — viết rõ hơn lý do để owner xem xét.
                  </p>
                </div>
              </div>
            )}
            <RequestForm
              message={message}
              setMessage={setMessage}
              submit={submit}
              submitting={submitting}
              ctaLabel="Gửi yêu cầu Premium"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BuyPremiumCard({
  extend,
  buyingPlan,
  onBuy,
}: {
  extend: boolean;
  buyingPlan: string | null;
  onBuy: (plan: PremiumPlan) => void;
}) {
  const anyBusy = buyingPlan !== null;
  return (
    <Card className="border-2 border-primary/30">
      <CardContent className="p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h3 className="font-extrabold">{extend ? "Gia hạn Premium" : "Mua Premium qua PayOS"}</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Thanh toán bằng QR / chuyển khoản qua PayOS — kích hoạt tự động ngay sau khi thành công.
        </p>
        <div className="grid gap-3 pt-1 sm:grid-cols-3">
          {PREMIUM_PLANS.map((plan) => {
            const busy = buyingPlan === plan.id;
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-2xl border-2 p-4 transition-colors",
                  plan.highlight ? "border-primary bg-primary/5" : "border-border bg-card",
                )}
              >
                {plan.badge && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {plan.badge}
                  </span>
                )}
                <div className="text-center">
                  <p className="font-extrabold">{plan.label}</p>
                  <p className="mt-1 text-2xl font-extrabold tracking-tight text-primary">
                    {formatVnd(plan.priceVnd)}
                  </p>
                </div>
                <Button
                  onClick={() => onBuy(plan)}
                  disabled={anyBusy}
                  variant={plan.highlight ? "brand" : "outline"}
                  className="mt-3 w-full rounded-xl"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-3.5 w-3.5" />}
                  {busy ? "Đang tạo link…" : extend ? "Gia hạn" : "Mua ngay"}
                </Button>
              </div>
            );
          })}
        </div>
        <p className="text-center text-[11px] text-muted-foreground">
          Bạn sẽ được chuyển sang trang thanh toán an toàn của PayOS.
        </p>
      </CardContent>
    </Card>
  );
}

function BenefitRow({
  icon: Icon,
  title,
  detail,
}: {
  icon: React.ElementType;
  title: string;
  detail: string;
}) {
  return (
    <li className="flex items-start gap-2.5 rounded-xl border bg-card p-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="font-bold leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
      </div>
    </li>
  );
}

function RequestForm({
  message,
  setMessage,
  submit,
  submitting,
  ctaLabel,
}: {
  message: string;
  setMessage: (v: string) => void;
  submit: () => void;
  submitting: boolean;
  ctaLabel: string;
}) {
  return (
    <div className="space-y-2">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value.slice(0, 800))}
        rows={4}
        placeholder="VD: Mình đang ôn thi IELTS tháng 8, cần Vượt band + thi thử nhiều lượt để theo dõi tiến bộ."
        className="resize-none"
        disabled={submitting}
      />
      <div className="flex items-center justify-between">
        <span className={cn("text-[11px] font-mono text-muted-foreground", message.length > 700 && "text-gold-600")}>
          {message.length}/800
        </span>
        <Button onClick={submit} disabled={submitting} className="rounded-xl">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-3.5 w-3.5" />}
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
