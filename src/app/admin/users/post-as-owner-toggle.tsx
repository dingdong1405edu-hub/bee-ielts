"use client";
import { useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** OWNER-only toggle (rendered next to ADMIN rows): allow this admin to post
 *  in the community under the Bee identity. */
export function PostAsOwnerToggle({ userId, initial }: { userId: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    const next = !on;
    try {
      const res = await fetch("/api/admin/users/post-as-owner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, allow: next }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Lỗi");
      setOn(next);
      toast.success(next ? "Đã cho phép đăng dưới danh nghĩa Bee 🐝" : "Đã thu hồi quyền");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      title="Cho phép admin này đăng bài cộng đồng dưới danh nghĩa Bee (Owner)"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold transition-colors disabled:opacity-50",
        on
          ? "border-sky-400 bg-sky-500/10 text-sky-600 dark:text-sky-400"
          : "border-border text-muted-foreground hover:bg-muted",
      )}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />}
      {on ? "Đăng as Bee: BẬT" : "Cho phép đăng as Bee"}
    </button>
  );
}
