"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Delete button for admin pages. Asks for confirmation, calls the DELETE
 * endpoint, then either refreshes the current route (list pages) or
 * navigates to `redirectTo` (edit pages, where the record is now gone).
 *
 * Pass `size="default"` + `label` for the larger button used in form footers.
 */
export function DeleteTestButton({
  endpoint,
  name,
  kind = "đề",
  redirectTo,
  size = "sm",
  label = "Xoá",
}: {
  endpoint: string;
  name: string;
  kind?: string;
  redirectTo?: string;
  size?: "sm" | "default";
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  const onDelete = async () => {
    if (!window.confirm(`Xoá ${kind} "${name}"?\nToàn bộ bài này sẽ bị xoá vĩnh viễn, không thể hoàn tác.`)) return;
    setLoading(true);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Xoá thất bại");
      toast.success("Đã xoá");
      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xoá thất bại");
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={onDelete}
      disabled={loading}
      className="text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
    >
      {loading ? <Loader2 className={`${iconClass} animate-spin`} /> : <Trash2 className={iconClass} />}
      {label}
    </Button>
  );
}
