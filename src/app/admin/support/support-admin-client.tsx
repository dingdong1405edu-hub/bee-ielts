"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Send, Loader2, Inbox, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Thread {
  userId: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: string;
  lastBody: string;
  lastFromAdmin: boolean;
  lastAt: string;
  unread: number;
}
interface Msg {
  id: string;
  fromAdmin: boolean;
  senderName: string | null;
  body: string;
  createdAt: string;
}
interface ThreadUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function initials(name: string | null, email: string) {
  return (name || email).slice(0, 2).toUpperCase();
}

export function SupportAdminClient({ initialUserId }: { initialUserId: string | null }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(initialUserId);
  const [activeUser, setActiveUser] = useState<ThreadUser | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingConvo, setLoadingConvo] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  const loadThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/support/threads", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && Array.isArray(data.threads)) setThreads(data.threads);
    } catch {
      /* ignore */
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  const loadConvo = useCallback(
    async (userId: string, showSpinner = false) => {
      if (showSpinner) setLoadingConvo(true);
      try {
        const res = await fetch(`/api/admin/support/thread?userId=${encodeURIComponent(userId)}`, { cache: "no-store" });
        const data = await res.json();
        if (res.ok) {
          setActiveUser(data.user);
          setMessages((prev) => {
            if (prev.length !== data.messages.length) scrollToEnd();
            return data.messages;
          });
          // Opening clears this thread's unread badge locally.
          setThreads((ts) => ts.map((t) => (t.userId === userId ? { ...t, unread: 0 } : t)));
        } else {
          toast.error(data.error || "Không mở được hội thoại");
        }
      } catch {
        /* ignore */
      } finally {
        if (showSpinner) setLoadingConvo(false);
      }
    },
    [scrollToEnd],
  );

  useEffect(() => {
    loadThreads();
    const t = setInterval(loadThreads, 15_000);
    return () => clearInterval(t);
  }, [loadThreads]);

  // Open the initial / selected thread and poll it while open.
  useEffect(() => {
    if (!activeId) return;
    loadConvo(activeId, true);
    const t = setInterval(() => loadConvo(activeId, false), 12_000);
    return () => clearInterval(t);
  }, [activeId, loadConvo]);

  const send = async () => {
    const body = text.trim();
    if (!body || !activeId || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/support/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: activeId, message: body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gửi thất bại");
      setMessages((m) => [...m, data.message]);
      setText("");
      scrollToEnd();
      loadThreads();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gửi thất bại");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid h-[72vh] grid-cols-1 overflow-hidden rounded-2xl border bg-card md:grid-cols-[300px_1fr]">
      {/* Thread list */}
      <div className={cn("flex flex-col border-r md:flex", activeId ? "hidden md:flex" : "flex")}>
        <div className="border-b px-4 py-3 text-sm font-bold">Hộp thư ({threads.length})</div>
        <div className="flex-1 divide-y overflow-y-auto">
          {loadingThreads ? (
            <div className="grid place-items-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : threads.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Chưa có cuộc trò chuyện nào.</p>
          ) : (
            threads.map((t) => (
              <button
                key={t.userId}
                onClick={() => setActiveId(t.userId)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60",
                  activeId === t.userId && "bg-muted",
                )}
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-xs font-bold">
                  {t.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(t.name, t.email)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">{t.name || t.email.split("@")[0]}</span>
                    {t.unread > 0 && (
                      <span className="grid h-4 min-w-[16px] shrink-0 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white">
                        {t.unread}
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {t.lastFromAdmin ? "Bạn: " : ""}
                    {t.lastBody || "—"}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Conversation */}
      <div className={cn("flex flex-col", activeId ? "flex" : "hidden md:flex")}>
        {!activeId ? (
          <div className="grid flex-1 place-items-center text-center text-muted-foreground">
            <div className="space-y-2">
              <Inbox className="mx-auto h-8 w-8" />
              <p className="text-sm">Chọn một học viên để xem hội thoại.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b px-3 py-2.5">
              <button onClick={() => setActiveId(null)} className="md:hidden" aria-label="Quay lại">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{activeUser?.name || activeUser?.email?.split("@")[0] || "Học viên"}</div>
                <div className="truncate text-xs text-muted-foreground">{activeUser?.email}</div>
              </div>
            </div>

            <div ref={scrollerRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {loadingConvo ? (
                <div className="grid h-full place-items-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <p className="grid h-full place-items-center text-center text-sm text-muted-foreground">
                  Chưa có tin nhắn. Gửi lời chào để bắt đầu hỗ trợ học viên này.
                </p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={cn("flex flex-col", m.fromAdmin ? "items-end" : "items-start")}>
                    <div
                      className={cn(
                        "max-w-[82%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
                        m.fromAdmin ? "rounded-tr-sm gradient-brand text-white" : "rounded-tl-sm bg-muted text-foreground",
                      )}
                    >
                      {m.body}
                    </div>
                    <span className="mt-0.5 px-1 text-[10px] text-muted-foreground">{timeLabel(m.createdAt)}</span>
                  </div>
                ))
              )}
            </div>

            <div className="border-t bg-background/60 p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  maxLength={4000}
                  placeholder="Trả lời học viên… (Enter để gửi)"
                  className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border-2 bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
                <Button
                  variant="brand"
                  size="icon"
                  className="h-[42px] w-[42px] shrink-0 rounded-xl"
                  onClick={send}
                  disabled={sending || !text.trim()}
                  aria-label="Gửi"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
