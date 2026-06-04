"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ticket, Plus, Crown, Sparkles, Heart, Trash2, Loader2, Power } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type RewardKind = "PREMIUM" | "XP" | "HEARTS";

export interface CouponRow {
  id: string;
  code: string;
  description: string | null;
  rewardKind: RewardKind;
  rewardValue: number;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export function CouponsAdminClient({ initial }: { initial: CouponRow[] }) {
  const router = useRouter();
  const [coupons, setCoupons] = useState<CouponRow[]>(initial);

  // Form state
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [rewardKind, setRewardKind] = useState<RewardKind>("PREMIUM");
  const [rewardValue, setRewardValue] = useState<string>("0");
  const [maxUses, setMaxUses] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Pick a sensible default rewardValue when admin switches reward kind.
  const switchKind = (k: RewardKind) => {
    setRewardKind(k);
    if (k === "PREMIUM") setRewardValue("0");
    else if (k === "XP") setRewardValue("100");
    else if (k === "HEARTS") setRewardValue("5");
  };

  const create = async () => {
    if (!code.trim()) {
      toast.error("Nhập mã");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          description: description.trim() || undefined,
          rewardKind,
          rewardValue: parseInt(rewardValue || "0", 10) || 0,
          maxUses: maxUses ? parseInt(maxUses, 10) : null,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Tạo mã thất bại");
      toast.success(`Đã tạo mã ${data.coupon.code}`);
      setCoupons((prev) => [data.coupon, ...prev]);
      // Reset form (keep rewardKind as user just used it).
      setCode("");
      setDescription("");
      setMaxUses("");
      setExpiresAt("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (c: CouponRow) => {
    setBusyId(c.id);
    try {
      const res = await fetch(`/api/admin/coupons/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !c.active }),
      });
      if (!res.ok) throw new Error("Cập nhật thất bại");
      setCoupons((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x)),
      );
      toast.success(c.active ? "Đã vô hiệu hoá" : "Đã kích hoạt lại");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (c: CouponRow) => {
    if (!confirm(`Xoá mã ${c.code}?\nLịch sử redemption của user sẽ mất luôn.`)) return;
    setBusyId(c.id);
    try {
      const res = await fetch(`/api/admin/coupons/${c.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Xoá thất bại");
      setCoupons((prev) => prev.filter((x) => x.id !== c.id));
      toast.success("Đã xoá");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <Ticket className="h-6 w-6 text-violet-500" /> Coupons
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tạo mã khuyến mãi để học viên nhận Premium / XP / hearts. Mỗi user chỉ đổi được mỗi mã 1
          lần. Có thể giới hạn số lần dùng tổng + ngày hết hạn.
        </p>
      </div>

      {/* Create form */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="font-extrabold flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> Tạo mã mới
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Mã (chữ HOA, số, _ -)</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="VD: WELCOME2026"
                maxLength={64}
                className="font-mono tracking-wider"
              />
            </div>
            <div>
              <Label>Mô tả (admin xem, không hiện cho user)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="VD: Khuyến mãi học viên mới"
                maxLength={200}
              />
            </div>
          </div>

          <div>
            <Label>Loại phần thưởng</Label>
            <div className="grid gap-2 sm:grid-cols-3 mt-1">
              <RewardOption
                active={rewardKind === "PREMIUM"}
                onClick={() => switchKind("PREMIUM")}
                icon={Crown}
                title="Premium"
                hint="Mở khoá Vượt band + thi không giới hạn"
                colorClass="from-amber-500 to-orange-500"
              />
              <RewardOption
                active={rewardKind === "XP"}
                onClick={() => switchKind("XP")}
                icon={Sparkles}
                title="XP"
                hint="Cộng XP vào tài khoản"
                colorClass="from-violet-500 to-fuchsia-500"
              />
              <RewardOption
                active={rewardKind === "HEARTS"}
                onClick={() => switchKind("HEARTS")}
                icon={Heart}
                title="Hearts"
                hint="Hồi tim (tối đa 5)"
                colorClass="from-rose-500 to-pink-500"
              />
            </div>
          </div>

          {rewardKind !== "PREMIUM" && (
            <div>
              <Label>{rewardKind === "XP" ? "Số XP cộng" : "Số heart hồi"}</Label>
              <Input
                inputMode="numeric"
                value={rewardValue}
                onChange={(e) => setRewardValue(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                placeholder={rewardKind === "XP" ? "VD: 100" : "VD: 5"}
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Số lần dùng tối đa (để trống = không giới hạn)</Label>
              <Input
                inputMode="numeric"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                placeholder="VD: 100"
              />
            </div>
            <div>
              <Label>Hết hạn (để trống = không hết hạn)</Label>
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={create} disabled={creating} className="rounded-xl">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Tạo mã
          </Button>
        </CardContent>
      </Card>

      {/* List */}
      <section className="space-y-2">
        <h2 className="font-extrabold">Tất cả mã ({coupons.length})</h2>
        {coupons.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground text-center">
              Chưa tạo mã nào.
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-2xl border divide-y bg-card overflow-hidden">
            {coupons.map((c) => {
              const expired = c.expiresAt && new Date(c.expiresAt).getTime() < Date.now();
              const exhausted = c.maxUses != null && c.usedCount >= c.maxUses;
              const dead = expired || exhausted || !c.active;
              return (
                <div
                  key={c.id}
                  className={cn(
                    "p-4 flex items-start gap-3 text-sm",
                    dead && "bg-muted/40",
                  )}
                >
                  <div
                    className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white",
                      c.rewardKind === "PREMIUM" && "bg-gradient-to-br from-amber-500 to-orange-500",
                      c.rewardKind === "XP" && "bg-gradient-to-br from-violet-500 to-fuchsia-500",
                      c.rewardKind === "HEARTS" && "bg-gradient-to-br from-rose-500 to-pink-500",
                      dead && "opacity-50",
                    )}
                  >
                    {c.rewardKind === "PREMIUM" && <Crown className="h-4 w-4" />}
                    {c.rewardKind === "XP" && <Sparkles className="h-4 w-4" />}
                    {c.rewardKind === "HEARTS" && <Heart className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold tracking-wider">{c.code}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {c.rewardKind === "PREMIUM"
                          ? "Premium"
                          : c.rewardKind === "XP"
                            ? `+${c.rewardValue} XP`
                            : `+${c.rewardValue} hearts`}
                      </Badge>
                      {!c.active && <Badge className="text-[10px] bg-zinc-500">Tắt</Badge>}
                      {expired && <Badge className="text-[10px] bg-rose-600">Hết hạn</Badge>}
                      {exhausted && <Badge className="text-[10px] bg-orange-600">Hết lượt</Badge>}
                    </div>
                    {c.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Dùng {c.usedCount}
                      {c.maxUses != null ? `/${c.maxUses}` : ""} ·{" "}
                      {c.expiresAt
                        ? `Hết hạn ${new Date(c.expiresAt).toLocaleString("vi-VN")}`
                        : "Không hết hạn"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActive(c)}
                      disabled={busyId === c.id}
                      title={c.active ? "Vô hiệu hoá" : "Kích hoạt lại"}
                    >
                      {busyId === c.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Power className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => remove(c)}
                      disabled={busyId === c.id}
                      className="border-rose-300 text-rose-700 hover:bg-rose-50"
                      title="Xoá"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function RewardOption({
  active,
  onClick,
  icon: Icon,
  title,
  hint,
  colorClass,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  title: string;
  hint: string;
  colorClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border-2 p-3 text-left transition-all",
        active
          ? "border-primary bg-primary/5 shadow-md"
          : "border-input hover:border-primary/40",
      )}
    >
      <div className={cn("grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br text-white", colorClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2 font-bold text-sm">{title}</p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </button>
  );
}
