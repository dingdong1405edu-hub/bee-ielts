"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SeedDefaultsButton({ hasAny }: { hasAny: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/band-climber/seed", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Lỗi");
      if (data.created > 0) {
        toast.success(`Đã tạo ${data.created} chặng (bỏ qua ${data.skipped} đã có)`);
      } else {
        toast.message("Tất cả 3 chặng mặc định đã có sẵn");
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi tạo mặc định");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" disabled={busy} onClick={run}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {hasAny ? "Bổ sung chặng mặc định" : "Tạo 3 chặng mặc định"}
    </Button>
  );
}
