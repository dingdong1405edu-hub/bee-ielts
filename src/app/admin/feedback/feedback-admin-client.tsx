"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Inbox, Trash2, Check, MailOpen, MessageCircleHeart, LifeBuoy, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface FeedbackRow {
  id: string;
  kind: string;
  name: string | null;
  email: string | null;
  message: string;
  status: string;
  createdAt: string;
}

export function FeedbackAdminClient({ initial }: { initial: FeedbackRow[] }) {
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<"all" | "new">("new");
  const [busyId, setBusyId] = useState<string | null>(null);

  const newCount = useMemo(() => rows.filter((r) => r.status === "new").length, [rows]);
  const shown = filter === "new" ? rows.filter((r) => r.status === "new") : rows;

  const setStatus = async (r: FeedbackRow, status: "new" | "read") => {
    setRows((p) => p.map((x) => (x.id === r.id ? { ...x, status } : x)));
    try {
      const res = await fetch(`/api/admin/feedback/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Cập nhật thất bại");
      setRows((p) => p.map((x) => (x.id === r.id ? { ...x, status: r.status } : x)));
    }
  };

  const remove = async (r: FeedbackRow) => {
    if (!confirm("Xoá tin nhắn này?")) return;
    setBusyId(r.id);
    try {
      const res = await fetch(`/api/admin/feedback/${r.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRows((p) => p.filter((x) => x.id !== r.id));
      toast.success("Đã xoá");
    } catch {
      toast.error("Xoá thất bại");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Inbox className="h-6 w-6 text-primary" /> Góp ý / Hỗ trợ
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tin nhắn người dùng gửi từ trang chủ.
            {newCount > 0 && (
              <span className="ml-1 font-bold text-rose-600">{newCount} tin mới</span>
            )}
          </p>
        </div>
        <div className="inline-flex rounded-full border bg-card p-1 gap-1">
          {(["new", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-colors ${
                filter === f ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {f === "new" ? `Mới (${newCount})` : `Tất cả (${rows.length})`}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <MailOpen className="mx-auto h-10 w-10 mb-2 opacity-50" />
            {filter === "new" ? "Không có tin mới nào. 🎉" : "Chưa có tin nhắn nào."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {shown.map((r) => {
            const isSupport = r.kind === "support";
            return (
              <Card
                key={r.id}
                className={r.status === "new" ? "border-2 border-honey/50 bg-honey-tint/20" : ""}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                        isSupport
                          ? "bg-rose-100 text-rose-700"
                          : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      {isSupport ? <LifeBuoy className="h-3 w-3" /> : <MessageCircleHeart className="h-3 w-3" />}
                      {isSupport ? "Cần hỗ trợ" : "Góp ý"}
                    </span>
                    {r.status === "new" && (
                      <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-extrabold text-white uppercase tracking-wider">
                        Mới
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString("vi-VN")}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.message}</p>

                  <div className="flex items-center gap-3 flex-wrap pt-1 text-xs text-muted-foreground">
                    {r.name && <span className="font-bold text-foreground">{r.name}</span>}
                    {r.email && (
                      <a
                        href={`mailto:${r.email}`}
                        className="inline-flex items-center gap-1 hover:text-primary"
                      >
                        <Mail className="h-3.5 w-3.5" /> {r.email}
                      </a>
                    )}
                    <div className="ml-auto flex items-center gap-1.5">
                      {r.status === "new" ? (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setStatus(r, "read")}>
                          <Check className="h-3.5 w-3.5" /> Đã đọc
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setStatus(r, "new")}>
                          Đánh dấu mới
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
                        onClick={() => remove(r)}
                        disabled={busyId === r.id}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
