"use client";
/**
 * Public feedback / support page reached from the landing "Có góp ý cho Bee?"
 * pill. Anyone can send a message — it lands in the admin inbox
 * (/admin/feedback). No auth required.
 */
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Send, MessageCircleHeart, LifeBuoy, ArrowLeft, CheckCircle2 } from "lucide-react";

type Kind = "feedback" | "support";

export default function FeedbackPage() {
  const [kind, setKind] = useState<Kind>("feedback");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 5) {
      toast.error("Bạn viết nội dung dài hơn một chút nhé.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, name, email, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gửi thất bại");
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-honey-tint via-cream to-leaf-tint/40 px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-xl">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-honey-deep"
        >
          <ArrowLeft className="h-4 w-4" /> Về trang chủ
        </Link>

        <div className="rounded-3xl border-2 border-honey/30 bg-paper p-6 shadow-xl shadow-honey/10 sm:p-8">
          {done ? (
            <div className="py-10 text-center">
              <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-leaf/15 text-leaf">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <h1 className="font-display text-2xl font-extrabold">Đã gửi tới Bee! 🐝</h1>
              <p className="mx-auto mt-2 max-w-sm text-ink-soft">
                Cảm ơn bạn rất nhiều. Admin sẽ đọc và phản hồi sớm nhất có thể
                {email.trim() ? ` qua email ${email.trim()}` : ""}.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={() => {
                    setDone(false);
                    setMessage("");
                  }}
                  className="rounded-full border-2 border-honey/40 px-5 py-2.5 text-sm font-bold hover:bg-honey-tint"
                >
                  Gửi tin khác
                </button>
                <Link
                  href="/"
                  className="rounded-full gradient-brand px-5 py-2.5 text-sm font-bold text-white shadow-md hover:opacity-90"
                >
                  Về trang chủ
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl gradient-brand text-2xl shadow-md">
                  🐝
                </div>
                <div>
                  <h1 className="font-display text-2xl font-extrabold leading-tight">
                    Nhắn cho Bee
                  </h1>
                  <p className="text-sm text-ink-soft">
                    Góp ý hoặc cần hỗ trợ? Gửi tin — admin nhận ngay.
                  </p>
                </div>
              </div>

              {/* Kind toggle */}
              <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-honey-tint/60 p-1.5">
                <KindButton
                  active={kind === "feedback"}
                  onClick={() => setKind("feedback")}
                  icon={MessageCircleHeart}
                  label="Góp ý"
                />
                <KindButton
                  active={kind === "support"}
                  onClick={() => setKind("support")}
                  icon={LifeBuoy}
                  label="Cần hỗ trợ"
                />
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Tên của bạn (tuỳ chọn)">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Bạn tên gì?"
                      className="w-full rounded-xl border-2 border-honey/20 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-honey"
                    />
                  </Field>
                  <Field label="Email để Bee phản hồi (tuỳ chọn)">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full rounded-xl border-2 border-honey/20 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-honey"
                    />
                  </Field>
                </div>
                <Field
                  label={kind === "support" ? "Bạn cần hỗ trợ gì?" : "Bạn muốn góp ý điều gì?"}
                >
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    placeholder={
                      kind === "support"
                        ? "Mô tả vấn đề bạn gặp phải (lỗi, không vào được bài, thanh toán...)"
                        : "Chia sẻ cảm nhận, ý tưởng, tính năng bạn mong muốn..."
                    }
                    className="w-full resize-y rounded-xl border-2 border-honey/20 bg-white px-3.5 py-3 text-sm leading-relaxed outline-none focus:border-honey"
                  />
                </Field>

                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl gradient-brand px-6 py-3.5 font-extrabold text-white shadow-lg shadow-honey/20 transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  {busy ? "Đang gửi..." : "Gửi cho Bee"}
                </button>
                <p className="text-center text-xs text-ink-faint">
                  Tin nhắn gửi trực tiếp tới admin BeeEnglish.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function KindButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold transition-all ${
        active
          ? "bg-white text-honey-deep shadow-sm ring-1 ring-honey/30"
          : "text-ink-soft hover:text-ink"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-ink">{label}</span>
      {children}
    </label>
  );
}
