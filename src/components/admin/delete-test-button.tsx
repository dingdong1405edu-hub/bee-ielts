"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Delete button for admin list rows. Asks for confirmation, calls the
 * DELETE endpoint, then refreshes the route so the row disappears.
 */
export function DeleteTestButton({
  endpoint,
  name,
  kind = "đề",
}: {
  endpoint: string;
  name: string;
  kind?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onDelete = async () => {
    if (!window.confirm(`Xoá ${kind} "${name}"?\nHành động này không thể hoàn tác.`)) return;
    setLoading(true);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Xoá thất bại");
      toast.success("Đã xoá");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xoá thất bại");
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onDelete}
      disabled={loading}
      className="text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      Xoá
    </Button>
  );
}
