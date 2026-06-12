"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Bell, Trash2, Pin, Eye, EyeOff, Megaphone, Tag, Info, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface AnnouncementRow {
  id: string;
  kind: string;
  title: string;
  body: string;
  code: string | null;
  active: boolean;
  pinned: boolean;
  createdAt: string;
}

type Kind = "update" | "discount" | "info";
const KINDS: { value: Kind; label: string; icon: React.ElementType; cls: string }[] = [
  { value: "update", label: "Cập nhật", icon: Megaphone, cls: "bg-sky-100 text-sky-700" },
  { value: "discount", label: "Mã giảm giá", icon: Tag, cls: "bg-rose-100 text-rose-700" },
  { value: "info", label: "Thông tin", icon: Info, cls: "bg-gold-100 text-gold-700" },
];
const kindMeta = (k: string) => KINDS.find((x) => x.value === k) ?? KINDS[2];

export function AnnouncementsAdminClient({ initial }: { initial: AnnouncementRow[] }) {
  const [rows, setRows] = useState(initial);
  const [kind, setKind] = useState<Kind>("info");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [code, setCode] = useState("");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const create = async () => {
    if (!title.trim() || !body.trim()) return toast.error("Cần tiêu đề và nội dung");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, title, body, code, pinned }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi");
      setRows((p) => [
        {
          id: data.id,
          kind,
          title: title.trim(),
          body: body.trim(),
          code: code.trim() || null,
          active: true,
          pinned,
          createdAt: new Date().toISOString(),
        },
        ...p,
      ]);
      setTitle("");
      setBody("");
      setCode("");
      setPinned(false);
      setKind("info");
      toast.success("Đã đăng thông báo 🔔");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setSaving(false);
    }
  };

  const patch = async (r: AnnouncementRow, data: Partial<Pick<AnnouncementRow, "active" | "pinned">>) => {
    setRows((p) => p.map((x) => (x.id === r.id ? { ...x, ...data } : x)));
    try {
      const res = await fetch(`/api/admin/announcements/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Cập nhật thất bại");
      setRows((p) => p.map((x) => (x.id === r.id ? r : x)));
    }
  };

  const remove = async (r: AnnouncementRow) => {
    if (!confirm("Xoá thông báo này?")) return;
    setBusyId(r.id);
    try {
      const res = await fetch(`/api/admin/announcements/${r.id}`, { method: "DELETE" });
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
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" /> Thông báo
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Đăng cập nhật, mã giảm giá hoặc thông tin hữu ích — hiện ở chuông trên trang chủ &amp; trong app.
        </p>
      </div>

      {/* Composer */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {KINDS.map((k) => {
              const Icon = k.icon;
              return (
                <button
                  key={k.value}
                  onClick={() => setKind(k.value)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold transition-all ${
                    kind === k.value ? `${k.cls} ring-2 ring-offset-1 ring-current` : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {k.label}
                </button>
              );
            })}
          </div>
          <Input placeholder="Tiêu đề" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />
          <Textarea placeholder="Nội dung thông báo..." value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[90px]" maxLength={4000} />
          {kind === "discount" && (
            <Input placeholder="Mã giảm giá (vd: BEE50) — không bắt buộc" value={code} onChange={(e) => setCode(e.target.value)} maxLength={60} />
          )}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="h-4 w-4" />
              <Pin className="h-3.5 w-3.5" /> Ghim lên đầu
            </label>
            <Button onClick={create} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />} Đăng thông báo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">Chưa có thông báo nào.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const meta = kindMeta(r.kind);
            const Icon = meta.icon;
            return (
              <Card key={r.id} className={r.active ? "" : "opacity-60"}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${meta.cls}`}>
                      <Icon className="h-3 w-3" /> {meta.label}
                    </span>
                    {r.pinned && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                        <Pin className="h-3 w-3" /> Ghim
                      </span>
                    )}
                    {!r.active && <span className="text-[10px] font-bold uppercase text-muted-foreground">Đã ẩn</span>}
                    <span className="ml-auto text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString("vi-VN")}</span>
                  </div>
                  <p className="font-bold">{r.title}</p>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">{r.body}</p>
                  {r.code && (
                    <p className="text-xs">
                      Mã: <code className="rounded bg-muted px-1.5 py-0.5 font-bold">{r.code}</code>
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 pt-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => patch(r, { active: !r.active })}>
                      {r.active ? <><EyeOff className="h-3.5 w-3.5" /> Ẩn</> : <><Eye className="h-3.5 w-3.5" /> Hiện</>}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => patch(r, { pinned: !r.pinned })}>
                      <Pin className="h-3.5 w-3.5" /> {r.pinned ? "Bỏ ghim" : "Ghim"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-auto h-7 text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
                      onClick={() => remove(r)}
                      disabled={busyId === r.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
