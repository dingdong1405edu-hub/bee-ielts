"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Whole days from today until the given YYYY-MM-DD date (can be negative). */
function daysUntil(dateStr: string): number {
  const exam = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((exam.getTime() - today.getTime()) / 86_400_000);
}

function formatVN(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const todayStr = () => new Date().toISOString().slice(0, 10);

/** Dashboard card: set an IELTS exam date and count down the days to it. */
export function ExamCountdown({ examDate }: { examDate: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(examDate ?? "");
  const [saving, setSaving] = useState(false);

  const save = async (date: string | null) => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/exam-date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Lỗi");
      toast.success(date ? "Đã lưu lịch thi" : "Đã xoá lịch thi");
      setEditing(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const showForm = editing || !examDate;
  const days = examDate ? daysUntil(examDate) : 0;

  return (
    <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-sky-500/15 via-indigo-500/10 to-violet-500/15 p-6 md:p-7">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-sky-500/20 blur-2xl" />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-500/30">
            <CalendarDays className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-muted-foreground">Lịch thi IELTS của bạn</div>
            {examDate && !editing ? (
              <>
                <div className="mt-0.5 flex items-baseline gap-2">
                  {days > 0 ? (
                    <>
                      <span className="text-4xl md:text-5xl font-extrabold gradient-brand-text">{days}</span>
                      <span className="text-lg font-bold text-foreground">ngày nữa</span>
                    </>
                  ) : days === 0 ? (
                    <span className="text-3xl md:text-4xl font-extrabold gradient-brand-text">
                      Hôm nay là ngày thi! 🎯
                    </span>
                  ) : (
                    <span className="text-2xl md:text-3xl font-extrabold text-muted-foreground">
                      Kỳ thi đã qua {-days} ngày
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground capitalize">{formatVN(examDate)}</div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground mt-0.5">
                Chọn ngày bạn dự định thi để theo dõi thời gian còn lại.
              </div>
            )}
          </div>
        </div>

        {showForm ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={draft}
              min={todayStr()}
              onChange={(e) => setDraft(e.target.value)}
              className="h-10 rounded-xl border bg-background px-3 text-sm"
            />
            <Button
              onClick={() => draft && save(draft)}
              disabled={saving || !draft}
              className="rounded-xl"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Lưu
            </Button>
            {examDate && (
              <Button variant="ghost" onClick={() => setEditing(false)} className="rounded-xl">
                Huỷ
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => {
                setDraft(examDate ?? "");
                setEditing(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5" /> Đổi ngày
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-muted-foreground"
              disabled={saving}
              onClick={() => save(null)}
            >
              <X className="h-3.5 w-3.5" /> Xoá
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
