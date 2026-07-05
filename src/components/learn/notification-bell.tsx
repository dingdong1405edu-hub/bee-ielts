"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Megaphone, Tag, Info, X, Copy, Users, LifeBuoy, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { playNotifySfx } from "@/lib/quiz-sfx";

type Ann = {
  id: string;
  kind: string;
  title: string;
  body: string;
  code: string | null;
  createdAt: string;
  /** When set, the whole notification links here (official community posts). */
  href?: string;
};

// Shared with the landing bell (index.html): "new" = items created after the
// timestamp the visitor last opened the bell.
const SEEN_KEY = "bee_ann_seen";

function meta(k: string) {
  if (k === "class")
    return { label: "Lớp học", Icon: GraduationCap, cls: "bg-honey-tint text-honey-deep dark:bg-honey/20 dark:text-honey" };
  if (k === "support")
    return { label: "Hỗ trợ", Icon: LifeBuoy, cls: "bg-leaf/15 text-leaf-deep dark:bg-leaf/20 dark:text-leaf" };
  if (k === "post")
    return { label: "Cộng đồng", Icon: Users, cls: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" };
  if (k === "update")
    return { label: "Cập nhật", Icon: Megaphone, cls: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" };
  if (k === "discount")
    return { label: "Mã giảm giá", Icon: Tag, cls: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" };
  return { label: "Thông tin", Icon: Info, cls: "bg-gold-100 text-gold-700 dark:bg-gold-500/15 dark:text-gold-300" };
}

export function NotificationBell() {
  const [items, setItems] = useState<Ann[]>([]);
  const [open, setOpen] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    // Merge admin announcements + official "Bee" community posts + support
    // replies from the Bee team into one feed.
    Promise.all([
      fetch("/api/announcements").then((r) => r.json()).catch(() => ({ items: [] })),
      fetch("/api/community/official-posts").then((r) => r.json()).catch(() => ({ items: [] })),
      fetch("/api/support/notifications").then((r) => r.json()).catch(() => ({ items: [] })),
      fetch("/api/notifications").then((r) => r.json()).catch(() => ({ items: [] })),
    ])
      .then(([ann, posts, support, personal]) => {
        if (!alive) return;
        const merged: Ann[] = [
          ...(Array.isArray(ann.items) ? ann.items : []),
          ...(Array.isArray(posts.items) ? posts.items : []),
          ...(Array.isArray(support.items) ? support.items : []),
          ...(Array.isArray(personal.items) ? personal.items : []),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setItems(merged);
        const seen = Number(localStorage.getItem(SEEN_KEY) || 0);
        const unread = merged.filter((a) => new Date(a.createdAt).getTime() > seen).length;
        setNewCount(unread);
        // Gentle chime when there are new notifications (best-effort — the
        // browser may block audio until the first gesture on this page).
        if (unread > 0) playNotifySfx();
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = useCallback(() => {
    setOpen((o) => {
      const next = !o;
      if (next && items.length) {
        const latest = Math.max(...items.map((a) => new Date(a.createdAt).getTime()));
        try {
          localStorage.setItem(SEEN_KEY, String(latest));
        } catch {
          /* ignore */
        }
        setNewCount(0);
      }
      return next;
    });
  }, [items]);

  const copy = (code: string) => {
    navigator.clipboard?.writeText(code).then(() => toast.success(`Đã copy mã: ${code}`)).catch(() => {});
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        aria-label="Thông báo"
        className="relative grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell size={18} />
        {newCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white">
            {newCount > 9 ? "9+" : newCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="flex items-center gap-1.5 text-sm font-extrabold">
              <Bell className="h-4 w-4 text-primary" /> Thông báo
            </span>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[70vh] divide-y divide-border overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Chưa có thông báo nào.</p>
            ) : (
              items.map((a) => {
                const m = meta(a.kind);
                const Icon = m.Icon;
                const inner = (
                  <>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${m.cls}`}>
                        <Icon className="h-3 w-3" /> {m.label}
                      </span>
                      <span className="ml-auto text-[11px] text-muted-foreground">
                        {new Date(a.createdAt).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                    <p className="text-sm font-bold leading-snug">{a.title}</p>
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{a.body}</p>
                    {a.code && (
                      <button
                        onClick={() => copy(a.code!)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-extrabold text-rose-700 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300"
                      >
                        <Copy className="h-3 w-3" /> {a.code}
                      </button>
                    )}
                  </>
                );
                return a.href ? (
                  <Link
                    key={a.id}
                    href={a.href}
                    onClick={() => setOpen(false)}
                    className="block space-y-1.5 p-3.5 transition-colors hover:bg-muted/50"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={a.id} className="space-y-1.5 p-3.5">
                    {inner}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
