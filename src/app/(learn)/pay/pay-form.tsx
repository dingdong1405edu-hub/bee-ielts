"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000];

function formatVnd(n: number): string {
  return n.toLocaleString("vi-VN") + "đ";
}

export function PayForm() {
  const [amount, setAmount] = useState<number>(100_000);
  const [description, setDescription] = useState("Bee IELTS — nâng cấp Premium");
  const [busy, setBusy] = useState(false);

  const handleAmount = (raw: string) => {
    const n = parseInt(raw.replace(/[^0-9]/g, ""), 10);
    setAmount(Number.isFinite(n) ? n : 0);
  };

  const submit = async () => {
    if (amount < 2000) {
      toast.error("Số tiền tối thiểu là 2.000đ");
      return;
    }
    if (!description.trim()) {
      toast.error("Nhập mô tả cho đơn hàng");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, description: description.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error || "Không tạo được link");
      }
      // Hand off to PayOS — they handle the rest of the flow.
      window.location.href = data.checkoutUrl as string;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi tạo link thanh toán");
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div>
          <Label>Số tiền (VND)</Label>
          <Input
            inputMode="numeric"
            value={amount ? amount.toLocaleString("vi-VN") : ""}
            onChange={(e) => handleAmount(e.target.value)}
            placeholder="VD: 100.000"
            disabled={busy}
            className="text-lg font-bold"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK_AMOUNTS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(v)}
                disabled={busy}
                className="rounded-full border px-3 py-1 text-xs font-semibold hover:bg-accent transition-colors disabled:opacity-50"
              >
                {formatVnd(v)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Mô tả đơn</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="VD: Bee IELTS Premium — 1 tháng"
            disabled={busy}
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            PayOS chỉ hiện 25 ký tự đầu trên màn checkout; bản đầy đủ vẫn lưu trên hệ thống.
          </p>
        </div>

        <Button onClick={submit} disabled={busy} variant="brand" size="xl" className="w-full rounded-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy ? "Đang tạo link…" : "Sang PayOS"}
          {!busy && <ArrowRight className="h-4 w-4" />}
        </Button>

        <p className="text-[11px] text-center text-muted-foreground">
          Bạn sẽ được chuyển sang trang thanh toán an toàn của PayOS.
        </p>
      </CardContent>
    </Card>
  );
}
