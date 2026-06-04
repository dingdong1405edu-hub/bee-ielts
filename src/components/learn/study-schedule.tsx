"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
  Check,
  Wand2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Skill = "READING" | "LISTENING" | "WRITING" | "SPEAKING" | "VOCAB" | "GRAMMAR";

type Entry = {
  id: string;
  date: string; // ISO
  title: string;
  skill: Skill | null;
  note: string | null;
  done: boolean;
  auto?: boolean;
};

/** Recommended sessions per week for a target band (mirrors the generator API). */
function recommendedDays(band: number): number {
  if (band >= 8) return 6;
  if (band >= 7) return 5;
  if (band >= 6) return 4;
  return 3;
}

/** Default available-weekday selection for a given session count (Mon-start indices). */
function defaultWeekdays(count: number): number[] {
  const presets: Record<number, number[]> = {
    3: [0, 2, 4],
    4: [0, 2, 4, 5],
    5: [0, 1, 2, 3, 5],
    6: [0, 1, 2, 3, 4, 5],
  };
  return presets[count] ?? [0, 2, 4, 5];
}

const SKILLS: { value: Skill; label: string; dot: string; chip: string }[] = [
  { value: "READING", label: "Reading", dot: "bg-emerald-500", chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  { value: "LISTENING", label: "Listening", dot: "bg-amber-500", chip: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  { value: "WRITING", label: "Writing", dot: "bg-rose-500", chip: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
  { value: "SPEAKING", label: "Speaking", dot: "bg-indigo-500", chip: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" },
  { value: "VOCAB", label: "Vocab", dot: "bg-fuchsia-500", chip: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400" },
  { value: "GRAMMAR", label: "Grammar", dot: "bg-cyan-500", chip: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400" },
];

function skillMeta(skill: Skill | null) {
  return SKILLS.find((s) => s.value === skill);
}

const VN_WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const VN_MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayISO(): string {
  return toISO(new Date());
}

/** Mon-start index 0..6 for any date. */
function mondayIndex(d: Date): number {
  const js = d.getDay(); // 0 Sun .. 6 Sat
  return (js + 6) % 7;
}

/** Build 6x7 grid of dates anchored on the Monday before the 1st of the given month. */
function buildMonthGrid(year: number, monthIdx: number): Date[] {
  const first = new Date(year, monthIdx, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - mondayIndex(first));
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

export function StudySchedule({
  examDate,
  targetBand = 6.0,
}: {
  examDate: string | null;
  targetBand?: number;
}) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [refreshKey, setRefreshKey] = useState(0);
  const [showGenerator, setShowGenerator] = useState(false);

  const days = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);
  const rangeFrom = useMemo(() => toISO(days[0]), [days]);
  const rangeTo = useMemo(() => toISO(days[days.length - 1]), [days]);

  // Fetch entries for the visible window.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/study-plan?from=${rangeFrom}&to=${rangeTo}`)
      .then((r) => r.json())
      .then((data: { entries?: Entry[] }) => {
        if (!alive) return;
        setEntries(data.entries ?? []);
      })
      .catch(() => {
        if (alive) toast.error("Không tải được lịch học");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [rangeFrom, rangeTo, refreshKey]);

  const byDate = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of entries) {
      const key = e.date.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return map;
  }, [entries]);

  const todayKey = todayISO();
  const selectedEntries = byDate.get(selectedDate) ?? [];

  const goPrev = () =>
    setCursor((c) =>
      c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 },
    );
  const goNext = () =>
    setCursor((c) =>
      c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 },
    );
  const goToday = () => {
    setCursor({ year: today.getFullYear(), month: today.getMonth() });
    setSelectedDate(todayKey);
  };

  const addEntry = async (payload: { title: string; skill: Skill | null; note: string }) => {
    const res = await fetch("/api/study-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: selectedDate,
        title: payload.title,
        skill: payload.skill,
        note: payload.note || null,
      }),
    });
    if (!res.ok) {
      toast.error((await res.json()).error || "Thêm thất bại");
      return false;
    }
    const { entry } = (await res.json()) as { entry: Entry };
    setEntries((prev) => [...prev, entry]);
    toast.success("Đã thêm vào lịch");
    return true;
  };

  const toggleDone = async (entry: Entry) => {
    const next = !entry.done;
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, done: next } : e)));
    const res = await fetch(`/api/study-plan/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: next }),
    });
    if (!res.ok) {
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, done: entry.done } : e)));
      toast.error("Cập nhật thất bại");
    }
  };

  const deleteEntry = async (entry: Entry) => {
    const snapshot = entries;
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    const res = await fetch(`/api/study-plan/${entry.id}`, { method: "DELETE" });
    if (!res.ok) {
      setEntries(snapshot);
      toast.error("Xoá thất bại");
    } else {
      toast.success("Đã xoá");
    }
  };

  const generatePlan = async (
    availableWeekdays: number[],
    focusNotes: string,
  ) => {
    const res = await fetch("/api/study-plan/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availableWeekdays, focusNotes }),
    });
    if (!res.ok) {
      toast.error((await res.json().catch(() => ({}))).error || "Tạo lộ trình thất bại");
      return;
    }
    const data = (await res.json()) as { count: number; advice: string };
    toast.success(`Đã tạo lộ trình ${data.count} buổi học`, { description: data.advice, duration: 8000 });
    setShowGenerator(false);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="rounded-3xl border bg-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 md:p-6 border-b bg-gradient-to-br from-indigo-500/5 via-violet-500/5 to-fuchsia-500/5">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/30">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-extrabold tracking-tight">Lịch học của bạn</div>
            <div className="text-xs text-muted-foreground">Lên lịch các ngày quan trọng & kỹ năng cần luyện</div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={goPrev} aria-label="Tháng trước">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[120px] text-center text-sm font-bold">
            {VN_MONTHS[cursor.month]} {cursor.year}
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={goNext} aria-label="Tháng sau">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="ml-2 rounded-xl" onClick={goToday}>
            Hôm nay
          </Button>
          <Button
            size="sm"
            className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white"
            onClick={() => setShowGenerator((s) => !s)}
          >
            <Wand2 className="h-3.5 w-3.5" /> AI tạo lộ trình
          </Button>
        </div>
      </div>

      {showGenerator && (
        <RoadmapGenerator
          targetBand={targetBand}
          examDate={examDate}
          onGenerate={generatePlan}
          onClose={() => setShowGenerator(false)}
        />
      )}

      <div className="grid grid-cols-7 border-b bg-muted/30 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {VN_WEEKDAYS.map((w) => (
          <div key={w} className="py-2">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const key = toISO(d);
          const inMonth = d.getMonth() === cursor.month;
          const isToday = key === todayKey;
          const isExam = examDate === key;
          const isSelected = selectedDate === key;
          const dayEntries = byDate.get(key) ?? [];
          return (
            <button
              key={key + i}
              type="button"
              onClick={() => setSelectedDate(key)}
              className={cn(
                "group relative min-h-[78px] md:min-h-[92px] border-b border-r p-1.5 md:p-2 text-left transition-colors",
                "hover:bg-accent/40",
                (i + 1) % 7 === 0 && "border-r-0",
                i >= 35 && "border-b-0",
                !inMonth && "bg-muted/20 text-muted-foreground/50",
                isSelected && "bg-primary/5 ring-2 ring-inset ring-primary/40",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                    isToday && "bg-primary text-primary-foreground",
                    isExam && !isToday && "bg-gradient-to-br from-sky-500 to-indigo-500 text-white",
                  )}
                >
                  {d.getDate()}
                </span>
                {isExam && (
                  <span className="hidden md:inline text-[10px] font-bold text-sky-600 dark:text-sky-400">
                    Thi
                  </span>
                )}
              </div>
              <div className="mt-1 space-y-0.5">
                {dayEntries.slice(0, 2).map((e) => {
                  const meta = skillMeta(e.skill);
                  return (
                    <div
                      key={e.id}
                      className={cn(
                        "flex items-center gap-1 truncate rounded-md px-1 py-0.5 text-[10px] md:text-[11px] font-semibold",
                        meta?.chip ?? "bg-muted text-muted-foreground",
                        e.done && "line-through opacity-60",
                      )}
                    >
                      <span className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", meta?.dot ?? "bg-muted-foreground")} />
                      <span className="truncate">{e.title}</span>
                    </div>
                  );
                })}
                {dayEntries.length > 2 && (
                  <div className="px-1 text-[10px] font-bold text-muted-foreground">
                    +{dayEntries.length - 2} nữa
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <DayPanel
        date={selectedDate}
        entries={selectedEntries}
        loading={loading}
        onAdd={addEntry}
        onToggleDone={toggleDone}
        onDelete={deleteEntry}
      />
    </div>
  );
}

/** Panel to pick free weekdays and auto-generate a band-targeted study roadmap. */
function RoadmapGenerator({
  targetBand,
  examDate,
  onGenerate,
  onClose,
}: {
  targetBand: number;
  examDate: string | null;
  onGenerate: (weekdays: number[], focusNotes: string) => Promise<void>;
  onClose: () => void;
}) {
  const recommended = recommendedDays(targetBand);
  const [picked, setPicked] = useState<number[]>(() => defaultWeekdays(recommended));
  // Free-text focus notes — the user describes what they want to prioritise
  // (weak skills, specific question types, time constraints, etc.). Capped
  // at 800 chars so the AI prompt stays within sensible bounds.
  const [focusNotes, setFocusNotes] = useState("");
  const [generating, setGenerating] = useState(false);

  const toggle = (idx: number) =>
    setPicked((p) => (p.includes(idx) ? p.filter((x) => x !== idx) : [...p, idx].sort()));

  const run = async () => {
    if (picked.length === 0) {
      toast.error("Chọn ít nhất 1 ngày học trong tuần");
      return;
    }
    setGenerating(true);
    await onGenerate(picked, focusNotes.trim());
    setGenerating(false);
  };

  const examLabel = examDate
    ? new Date(`${examDate}T00:00:00`).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;

  return (
    <div className="border-b bg-gradient-to-br from-indigo-500/5 to-violet-500/5 p-4 md:p-5 space-y-3">
      <div className="flex items-start gap-2">
        <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm">
          <span className="font-bold">AI tạo lộ trình học cho bạn.</span>{" "}
          <span className="text-muted-foreground">
            AI dựa trên mục tiêu band <b className="text-foreground">{targetBand.toFixed(1)}</b>
            {examLabel ? <> · ngày thi <b className="text-foreground">{examLabel}</b></> : <> · chưa đặt ngày thi (lộ trình 8 tuần)</>}
            {" "}và kết quả luyện tập gần đây để ưu tiên kỹ năng yếu. Gợi ý <b className="text-foreground">{recommended} buổi/tuần</b>. Chọn các ngày bạn rảnh học:
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {VN_WEEKDAYS.map((w, idx) => {
          const active = picked.includes(idx);
          return (
            <button
              key={w}
              type="button"
              onClick={() => toggle(idx)}
              className={cn(
                "h-9 min-w-[44px] rounded-xl border-2 px-2 text-sm font-bold transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background hover:border-primary/40",
              )}
            >
              {w}
            </button>
          );
        })}
      </div>

      {/* Free-form focus notes — the AI weights these heavily when picking
          which skills appear in the weekly template. Optional: leaving it
          blank falls back to skillScores-driven prioritisation. */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground/80 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Bạn muốn AI tập trung vào điều gì? <span className="text-muted-foreground font-normal">(tuỳ chọn)</span>
        </label>
        <textarea
          value={focusNotes}
          onChange={(e) => setFocusNotes(e.target.value.slice(0, 800))}
          placeholder={
            "VD: Mình yếu phần Listening Part 3 + 4, muốn luyện nhiều dạng MCQ. Writing Task 2 hay bí ý — cần ôn cấu trúc bài Opinion. Reading thì ổn rồi, chỉ cần duy trì 1-2 buổi/tuần."
          }
          rows={4}
          className="w-full rounded-xl border bg-background px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          disabled={generating}
        />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>AI sẽ ưu tiên những gì bạn ghi ở đây hơn cả điểm yếu phân tích từ dữ liệu luyện tập.</span>
          <span className={cn("font-mono", focusNotes.length > 700 && "text-amber-600")}>
            {focusNotes.length}/800
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        AI sẽ thiết kế lộ trình kèm gợi ý phương pháp cho từng buổi. 2 tuần cuối trước ngày thi chuyển sang thi
        thử. Lộ trình tự động cũ sẽ được thay mới — các task bạn tự thêm vẫn được giữ nguyên.
      </p>

      <div className="flex items-center gap-2">
        <Button size="sm" className="rounded-xl" onClick={run} disabled={generating}>
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
          {generating ? "AI đang tạo lộ trình…" : `AI tạo lộ trình (${picked.length} buổi/tuần)`}
        </Button>
        <Button size="sm" variant="ghost" className="rounded-xl" onClick={onClose} disabled={generating}>
          Huỷ
        </Button>
      </div>
    </div>
  );
}

function DayPanel({
  date,
  entries,
  loading,
  onAdd,
  onToggleDone,
  onDelete,
}: {
  date: string;
  entries: Entry[];
  loading: boolean;
  onAdd: (p: { title: string; skill: Skill | null; note: string }) => Promise<boolean>;
  onToggleDone: (e: Entry) => void;
  onDelete: (e: Entry) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [skill, setSkill] = useState<Skill | "">("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setAdding(false);
    setTitle("");
    setSkill("");
    setNote("");
  };

  const submit = async () => {
    if (!title.trim()) {
      toast.error("Nhập tiêu đề task");
      return;
    }
    setSaving(true);
    const ok = await onAdd({ title: title.trim(), skill: (skill || null) as Skill | null, note });
    setSaving(false);
    if (ok) reset();
  };

  const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="text-sm font-bold capitalize">{dateLabel}</div>
        {!adding && (
          <Button size="sm" className="rounded-xl" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5" /> Thêm task
          </Button>
        )}
      </div>

      {adding && (
        <div className="mb-4 rounded-2xl border bg-muted/30 p-3 md:p-4 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Vd: Làm Reading Test 3, Học 20 từ mới…"
            className="h-10 w-full rounded-xl border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            autoFocus
          />
          <div className="flex flex-wrap gap-2">
            <select
              value={skill}
              onChange={(e) => setSkill(e.target.value as Skill | "")}
              className="h-9 rounded-xl border bg-background px-3 text-sm"
            >
              <option value="">Không gắn kỹ năng</option>
              {SKILLS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú (tuỳ chọn)…"
            rows={2}
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" className="rounded-xl" onClick={submit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Lưu
            </Button>
            <Button size="sm" variant="ghost" className="rounded-xl" onClick={reset} disabled={saving}>
              Huỷ
            </Button>
          </div>
        </div>
      )}

      {loading && entries.length === 0 ? (
        <div className="text-sm text-muted-foreground py-2 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-6 text-center text-sm text-muted-foreground">
          Chưa có task nào. Bấm <span className="font-semibold text-foreground">"Thêm task"</span> để lên kế hoạch.
        </div>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => {
            const meta = skillMeta(e.skill);
            return (
              <li
                key={e.id}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border bg-card p-3 transition-colors",
                  e.done && "bg-muted/30",
                )}
              >
                <button
                  type="button"
                  onClick={() => onToggleDone(e)}
                  className={cn(
                    "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition-colors",
                    e.done ? "border-success bg-success text-success-foreground" : "border-muted-foreground/40 hover:border-primary",
                  )}
                  aria-label={e.done ? "Bỏ đánh dấu hoàn thành" : "Đánh dấu hoàn thành"}
                >
                  {e.done && <Check className="h-3 w-3" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("text-sm font-semibold", e.done && "line-through text-muted-foreground")}>
                      {e.title}
                    </span>
                    {meta && (
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", meta.chip)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} /> {meta.label}
                      </span>
                    )}
                  </div>
                  {e.note && (
                    <p className={cn("mt-0.5 text-xs text-muted-foreground whitespace-pre-wrap", e.done && "line-through")}>
                      {e.note}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(e)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  aria-label="Xoá task"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

    </div>
  );
}
