"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Send, Loader2, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Msg {
  id: string;
  fromAdmin: boolean;
  senderName: string | null;
  body: string;
  createdAt: string;
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function SupportChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  const load = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setLoading(true);
      try {
        const res = await fetch("/api/support", { cache: "no-store" });
        const data = await res.json();
        if (res.ok && Array.isArray(data.messages)) {
          setMessages((prev) => {
            if (prev.length !== data.messages.length) scrollToEnd();
            return data.messages;
          });
        }
      } catch {
        /* offline — keep what we have */
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [scrollToEnd],
  );

  useEffect(() => {
    load(true);
    // Poll for admin replies while the page is open.
    const t = setInterval(() => load(false), 12_000);
    return () => clearInterval(t);
  }, [load]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gửi thất bại");
      setMessages((m) => [...m, data.message]);
      setText("");
      scrollToEnd();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gửi thất bại");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[68vh] flex-col overflow-hidden rounded-2xl border bg-card">
      {/* Conversation */}
      <div ref={scrollerRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {loading ? (
          <div className="grid h-full place-items-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div className="max-w-xs space-y-2">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl gradient-brand text-white shadow-md">
                <LifeBuoy className="h-6 w-6" />
              </div>
              <p className="font-bold">Chào bạn 👋</p>
              <p className="text-sm text-muted-foreground">
                Có thắc mắc hay cần hỗ trợ? Gửi tin nhắn cho đội ngũ Bee, bọn mình sẽ phản hồi sớm nhất.
              </p>
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={cn("flex flex-col", m.fromAdmin ? "items-start" : "items-end")}>
              {m.fromAdmin && (
                <span className="mb-0.5 ml-1 text-[11px] font-bold text-primary">
                  {m.senderName || "Đội ngũ Bee"}
                </span>
              )}
              <div
                className={cn(
                  "max-w-[82%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
                  m.fromAdmin
                    ? "rounded-tl-sm bg-muted text-foreground"
                    : "rounded-tr-sm gradient-brand text-white",
                )}
              >
                {m.body}
              </div>
              <span className="mt-0.5 px-1 text-[10px] text-muted-foreground">{timeLabel(m.createdAt)}</span>
            </div>
          ))
        )}
      </div>

      {/* Composer */}
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
            placeholder="Nhập tin nhắn… (Enter để gửi, Shift+Enter xuống dòng)"
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
    </div>
  );
}
