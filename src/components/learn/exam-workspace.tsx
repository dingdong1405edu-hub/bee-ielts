"use client";

/**
 * ExamWorkspace — a student works through an assignment (đề giáo viên giao).
 *
 * - Fetches GET /api/assignments/:id and renders the question list (MCQ radios /
 *   fill-in inputs), styled like the practice ("ôn luyện") screens.
 * - Countdown timer from the server-provided limit (config.durationMin and/or
 *   deadline). No limit → "vĩnh viễn" (no timer). Hitting 0 calls autoSubmit().
 * - Anti-cheat (only when the teacher set config.antiCheat): listens for
 *   `visibilitychange` + window `blur`; each time the student leaves the tab it
 *   bumps cheat_count, toasts a warning, and records a timestamped event that is
 *   sent to the server so the teacher AND parents can review it.
 * - Submit posts { answers[], cheatLogs } to POST /api/submissions.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Clock, Loader2, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ExamQuestion {
  id: string;
  type: string;
  prompt: string;
  options: string[] | null;
  displayNumber?: number | null;
  formGroup?: string | null;
}
interface ExamConfig {
  durationMin?: number;
  antiCheat?: boolean;
  showAnswersAfter?: boolean;
}
interface CheatEvent {
  type: string;
  at: string;
}
interface DoneState {
  scorePercent: number;
  correctCount: number | null;
  total: number | null;
  cheatCount: number;
}

function fmt(sec: number): string {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${m}:${pad(ss)}`;
}

export function ExamWorkspace({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ title: string; className: string; questionCount: number } | null>(null);
  const [config, setConfig] = useState<ExamConfig>({});
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState<number | null>(null); // seconds; null = unlimited
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<DoneState | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [cheatCount, setCheatCount] = useState(0);

  // Refs so timer/anti-cheat callbacks read fresh values without re-subscribing.
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const cheatCountRef = useRef(0);
  const cheatEventsRef = useRef<CheatEvent[]>([]);
  const lastCheatAtRef = useRef(0);
  const submittedRef = useRef(false);
  const endAtRef = useRef<number | null>(null); // epoch ms when the exam ends

  // ---------------------------------------------------------------- fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/assignments/${assignmentId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Không tải được bài tập");
        if (cancelled) return;
        setMeta({
          title: data.assignment.title,
          className: data.assignment.className,
          questionCount: data.assignment.questionCount,
        });
        setConfig((data.assignment.config as ExamConfig) || {});
        setQuestions(data.questions || []);
        setIsManager(Boolean(data.isManager));

        if (data.alreadySubmitted) {
          setAlreadySubmitted(true);
          setDone({
            scorePercent: data.submission?.totalScore ?? 0,
            correctCount: null,
            total: data.assignment.questionCount,
            cheatCount: 0,
          });
          return;
        }

        // Build the absolute end time (adjusting server→client clock skew).
        const serverNow = new Date(data.serverNow).getTime();
        const skew = Date.now() - serverNow;
        const limits: number[] = [];
        if (data.assignment.deadline) {
          limits.push(new Date(data.assignment.deadline).getTime() + skew);
        }
        const durMin = (data.assignment.config as ExamConfig)?.durationMin;
        if (durMin && data.startedAt) {
          limits.push(new Date(data.startedAt).getTime() + durMin * 60_000 + skew);
        }
        if (limits.length > 0) {
          endAtRef.current = Math.min(...limits);
          setRemaining(Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000)));
        } else {
          endAtRef.current = null; // vĩnh viễn
          setRemaining(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Lỗi tải bài");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assignmentId]);

  // ---------------------------------------------------------------- submit
  const doSubmit = useCallback(
    async (auto: boolean) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      const payload = {
        assignmentId,
        answers: Object.entries(answersRef.current).map(([questionId, answer]) => ({
          questionId,
          answer,
        })),
        cheatLogs: { count: cheatCountRef.current, events: cheatEventsRef.current },
      };
      try {
        const res = await fetch("/api/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Nộp bài thất bại");
        setDone({
          scorePercent: data.scorePercent,
          correctCount: data.correctCount,
          total: data.total,
          cheatCount: data.cheatCount ?? cheatCountRef.current,
        });
        toast.success(auto ? "Hết giờ — đã tự động nộp bài." : "Đã nộp bài!");
      } catch (e) {
        submittedRef.current = false; // let them retry on a network error
        toast.error(e instanceof Error ? e.message : "Nộp bài thất bại");
      } finally {
        setSubmitting(false);
      }
    },
    [assignmentId],
  );

  const autoSubmit = useCallback(() => {
    void doSubmit(true);
  }, [doSubmit]);

  // ---------------------------------------------------------------- timer
  useEffect(() => {
    if (loading || done || alreadySubmitted || isManager) return;
    if (endAtRef.current === null) return; // unlimited — no countdown
    if (Date.now() >= endAtRef.current) {
      autoSubmit();
      return;
    }
    const t = setInterval(() => {
      const end = endAtRef.current;
      if (end === null) return;
      const left = Math.max(0, Math.round((end - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        clearInterval(t);
        autoSubmit();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [loading, done, alreadySubmitted, isManager, autoSubmit]);

  // ------------------------------------------------------------- anti-cheat
  const registerCheat = useCallback((type: string) => {
    const now = Date.now();
    // blur + visibilitychange often both fire on a tab switch — dedupe.
    if (now - lastCheatAtRef.current < 700) return;
    lastCheatAtRef.current = now;
    cheatCountRef.current += 1;
    setCheatCount(cheatCountRef.current);
    cheatEventsRef.current.push({ type, at: new Date().toISOString() });
    toast.warning(
      `Cảnh báo: bạn vừa rời khỏi bài thi (lần ${cheatCountRef.current}). Hành vi này được ghi lại và báo cho giáo viên & phụ huynh.`,
    );
  }, []);

  useEffect(() => {
    if (!config.antiCheat || loading || done || alreadySubmitted || isManager) return;
    const onVis = () => {
      if (document.hidden) registerCheat("hidden");
    };
    const onBlur = () => {
      if (!document.hidden) registerCheat("blur");
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
    };
  }, [config.antiCheat, loading, done, alreadySubmitted, isManager, registerCheat]);

  // ------------------------------------------------------------------ views
  if (loading) {
    return (
      <div className="min-h-[50vh] grid place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (error) {
    return (
      <Card className="max-w-lg mx-auto mt-8">
        <CardContent className="p-6 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <p className="font-semibold">{error}</p>
          <Button variant="outline" onClick={() => router.back()}>
            Quay lại
          </Button>
        </CardContent>
      </Card>
    );
  }
  if (done) {
    return (
      <Card className="max-w-lg mx-auto mt-8 bg-accent">
        <CardContent className="p-6 text-center space-y-3">
          <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
          <h3 className="text-xl font-extrabold">
            {alreadySubmitted ? "Bạn đã nộp bài này" : "Đã nộp bài!"}
          </h3>
          <div className="text-4xl font-extrabold text-primary">{done.scorePercent}%</div>
          {done.correctCount !== null && done.total !== null && (
            <p className="text-muted-foreground">
              Đúng {done.correctCount}/{done.total} câu
            </p>
          )}
          {done.cheatCount > 0 && (
            <p className="text-sm font-semibold text-amber-600 inline-flex items-center gap-1">
              <ShieldAlert className="h-4 w-4" /> Số lần rời bài thi: {done.cheatCount}
            </p>
          )}
          <Button className="mt-2" onClick={() => router.push("/dashboard")}>
            Về trang chính
          </Button>
        </CardContent>
      </Card>
    );
  }

  const timeLow = remaining !== null && remaining <= 60;

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-24">
      {/* Sticky header: title + timer + cheat counter */}
      <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-background/90 backdrop-blur border-b flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground truncate">{meta?.className}</div>
          <h1 className="font-extrabold truncate">{meta?.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {config.antiCheat && (
            <Badge
              variant="outline"
              className={cn(
                "gap-1",
                cheatCount > 0 ? "border-amber-400 text-amber-600" : "text-muted-foreground",
              )}
            >
              <ShieldAlert className="h-3.5 w-3.5" /> Rời tab: {cheatCount}
            </Badge>
          )}
          <Badge
            className={cn(
              "gap-1 text-base px-3 py-1 tabular-nums",
              remaining === null
                ? "bg-muted text-foreground"
                : timeLow
                  ? "bg-destructive text-destructive-foreground animate-pulse"
                  : "bg-primary text-primary-foreground",
            )}
          >
            <Clock className="h-4 w-4" />
            {remaining === null ? "Không giới hạn" : fmt(remaining)}
          </Badge>
        </div>
      </div>

      {isManager && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          Bạn đang <strong>xem trước</strong> với vai trò giáo viên/admin — không tính giờ, không lưu bài.
        </div>
      )}

      {config.antiCheat && !isManager && (
        <div className="rounded-lg border border-amber-300 bg-amber-50/70 dark:bg-amber-500/10 dark:border-amber-500/30 p-3 text-sm flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <span>
            Bài thi có <strong>giám sát chống gian lận</strong>: mỗi lần bạn chuyển tab hoặc thu nhỏ
            trình duyệt sẽ bị ghi lại và báo cho giáo viên &amp; phụ huynh.
          </span>
        </div>
      )}

      {questions.map((q, i) => {
        const num = q.displayNumber ?? i + 1;
        const userAns = answers[q.id] ?? "";
        return (
          <Card key={q.id}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start gap-2">
                <span className="font-semibold text-primary">{num}.</span>
                <p className="font-medium flex-1 whitespace-pre-wrap">{q.prompt}</p>
              </div>

              {q.options && q.options.length > 0 ? (
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <label
                      key={opt}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors hover:bg-accent",
                        userAns === opt && "border-primary bg-accent",
                      )}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={opt}
                        checked={userAns === opt}
                        onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <Input
                  placeholder="Câu trả lời..."
                  value={userAns}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                />
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Submit bar */}
      <div className="fixed bottom-0 inset-x-0 z-20 border-t bg-background/95 backdrop-blur p-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            Đã trả lời {Object.keys(answers).filter((k) => answers[k]?.trim()).length}/{questions.length}
          </span>
          <Button
            onClick={() => doSubmit(false)}
            disabled={submitting || isManager}
            variant="brand"
            className="rounded-full min-w-[140px]"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Nộp bài"}
          </Button>
        </div>
      </div>
    </div>
  );
}
