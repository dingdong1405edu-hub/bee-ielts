"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * One-click "create sample 4→5 Reading test" — idempotent. Skips creation if
 * the test already exists for that stage and just deep-links to it.
 */
export function SeedReadingButton({ exists }: { exists: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/band-climber/seed-reading", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Lỗi");
      if (data.created) {
        toast.success("Đã tạo đề Reading mẫu cho chặng 4→5");
      } else {
        toast.message("Đề mẫu đã có sẵn — chuyển sang trang sửa");
      }
      router.push(`/admin/reading/${data.testId}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi tạo đề mẫu");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" disabled={busy} onClick={run}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
      {exists ? "Mở đề Reading 4→5 mẫu" : "Tạo đề Reading 4→5 mẫu"}
    </Button>
  );
}
