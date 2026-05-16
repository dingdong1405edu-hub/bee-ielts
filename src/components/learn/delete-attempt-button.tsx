"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Small trash button that deletes one attempt after a confirm.
 * Use inside attempt cards; stops click propagation so it works even
 * when the card itself is a link.
 */
export function DeleteAttemptButton({ attemptId, className }: { attemptId: string; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    if (!confirm("Xoá bài chữa này? Hành động không thể hoàn tác.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/user/attempt/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: attemptId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi");
      toast.success("Đã xoá");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xoá thất bại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={busy}
      aria-label="Xoá bài chữa"
      title="Xoá bài chữa"
      className={cn(
        "grid h-8 w-8 shrink-0 place-items-center rounded-lg border text-muted-foreground transition-colors hover:border-destructive hover:bg-destructive/10 hover:text-destructive",
        className,
      )}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  );
}
