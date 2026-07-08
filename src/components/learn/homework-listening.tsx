"use client";

/**
 * HomeworkListening — a student does a teacher's manual LISTENING assignment in
 * the SAME UI as the learner Listening practice: the audio strip + inline
 * questions of the native ListeningShell (MCQ radios, fill-in pills, matching
 * dropdowns, form-completion blocks). ExamWorkspace's PDF + answer sheet is NOT
 * used here.
 *
 * Owns the exam lifecycle — answers, the countdown + auto-submit, anti-cheat,
 * attempts/retake, openAt lock and submit — mirroring HomeworkReading.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AssignmentLocked } from "@/components/learn/assignment-locked";
import { ListeningShell, type ListeningPart, type ShellQType } from "@/components/learn/listening-shell";

interface RawQuestion {
  id: string;
  type: string;
  prompt: string;
  options: string[] | null;
  displayNumber?: number | null;
  formGroup?: string | null;
}
interface CheatEvent {
  type: string;
  at: string;
}
interface DoneState {
  band: number;
  correctCount: number | null;
  total: number | null;
  scorePercent: number | null;
  cheatCount: number;
}

export function HomeworkListening({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ title: string; className: string } | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [listenTitle, setListenTitle] = useState("");
  const [instructions, setInstructions] = useState<string | null>(null);
  const [contentImageUrl, setContentImageUrl] = useState<string | null>(null);
  const [questions, setQuestions] = useState<RawQuestion[]>([]);
  const [antiCheat, setAntiCheat] = useState(false);
  const [locked, setLocked] = useState<{ openAt: string | null } | null>(null);
  const [isManager, setIsManager] = useState(false);

  const [phase, setPhase] = useState<"doing" | "done">("doing");
  const [attemptNo, setAttemptNo] = useState(0); // remounts the shell on retake
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState<number | null>(null); // seconds; null = unlimited
  const [elapsed, setElapsed] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<DoneState | null>(null);
  const [attempts, setAttempts] = useState({ allowed: 1, count: 0 });
  const [cheatCount, setCheatCount] = useState(0);

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const endAtRef = useRef<number | null>(null); // epoch ms when this attempt ends (null = unlimited)
  const durationMinRef = useRef<number | null>(null);
  const deadlineMsRef = useRef<number | null>(null);
  const cheatCountRef = useRef(0);
  const cheatEventsRef = useRef<CheatEvent[]>([]);
  const lastCheatAtRef = useRef(0);
  const submittedRef = useRef(false);

  // ---------------------------------------------------------------- submit
  const doSubmit = useCallback(async () => {
    if (submittedRef.current || isManager) return;
    submittedRef.current = true;
    setSubmitting(true);
    const current = answersRef.current;
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          answers: Object.entries(current).map(([questionId, answer]) => ({ questionId, answer })),
          cheatLogs: { count: cheatCountRef.current, events: cheatEventsRef.current },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nộp bài thất bại");
      setAttempts((a) => ({ allowed: data.attemptsAllowed ?? a.allowed, count: data.attemptCount ?? a.count + 1 }));
      setDone({
        band: data.band,
        correctCount: data.correctCount ?? null,
        total: data.total ?? null,
        scorePercent: data.scorePercent ?? null,
        cheatCount: data.cheatCount ?? cheatCountRef.current,
      });
      setPhase("done");
      if (typeof window !== "undefined") window.scrollTo({ top: 0 });
      toast.success("Đã nộp bài!");
    } catch (e) {
      submittedRef.current = false;
      toast.error(e instanceof Error ? e.message : "Nộp bài thất bại");
    } finally {
      setSubmitting(false);
    }
  }, [assignmentId, isManager]);

  // ---------------------------------------------------------------- fetch
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/assignments/${assignmentId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Không tải được bài");
        if (!alive) return;

        const cfg = (data.assignment.config ?? {}) as {
          durationMin?: number;
          antiCheat?: boolean;
          listening?: { audioUrl?: string; title?: string; instructions?: string; contentImageUrl?: string };
        };
        setMeta({ title: data.assignment.title, className: data.assignment.className });
        const l = cfg.listening ?? {};
        setAudioUrl(l.audioUrl ?? "");
        setListenTitle(l.title ?? "");
        setInstructions(l.instructions ?? null);
        setContentImageUrl(l.contentImageUrl ?? null);
        setQuestions(Array.isArray(data.questions) ? (data.questions as RawQuestion[]) : []);
        setAntiCheat(Boolean(cfg.antiCheat));
        setIsManager(Boolean(data.isManager));
        setAttempts({ allowed: data.assignment.attemptsAllowed ?? 1, count: data.submission?.attemptCount ?? 0 });

        if (data.locked) {
          setLocked({ openAt: data.assignment.openAt ?? null });
          return;
        }

        const skew = Date.now() - new Date(data.serverNow).getTime();
        durationMinRef.current = cfg.durationMin && cfg.durationMin > 0 ? cfg.durationMin : null;
        deadlineMsRef.current = data.assignment.deadline ? new Date(data.assignment.deadline).getTime() + skew : null;

        if (data.alreadySubmitted && data.submission) {
          setDone({ band: data.submission.totalScore ?? 0, correctCount: null, total: null, scorePercent: null, cheatCount: 0 });
          setPhase("done");
          return;
        }

        const startMs = data.startedAt ? new Date(data.startedAt).getTime() + skew : Date.now();
        const limits: number[] = [];
        if (durationMinRef.current) limits.push(startMs + durationMinRef.current * 60_000);
        if (deadlineMsRef.current) limits.push(deadlineMsRef.current);
        endAtRef.current = limits.length ? Math.min(...limits) : null;
        setRemaining(endAtRef.current === null ? null : Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000)));
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Lỗi tải bài");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [assignmentId]);

  // ---------------------------------------------------------------- timer
  useEffect(() => {
    if (loading || phase !== "doing" || locked || isManager) return;
    const tick = () => {
      setElapsed((s) => s + 1);
      const end = endAtRef.current;
      if (end === null) { setRemaining(null); return; }
      const left = Math.max(0, Math.round((end - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        clearInterval(t);
        toast.warning("Hết giờ — đã tự động nộp bài.");
        void doSubmit();
      }
    };
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [loading, phase, locked, isManager, attemptNo, doSubmit]);

  // ------------------------------------------------------------- anti-cheat
  const registerCheat = useCallback((type: string) => {
    const now = Date.now();
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
    if (!antiCheat || loading || phase === "done" || locked || isManager) return;
    const onVis = () => { if (document.hidden) registerCheat("hidden"); };
    const onBlur = () => { if (!document.hidden) registerCheat("blur"); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
    };
  }, [antiCheat, loading, phase, locked, isManager, registerCheat]);

  // ------------------------------------------------------------- retake
  const canRetake = attempts.allowed === 0 || attempts.count < attempts.allowed;
  const retakeLabel = attempts.allowed === 0 ? "không giới hạn" : `còn ${Math.max(0, attempts.allowed - attempts.count)} lượt`;
  const retake = useCallback(() => {
    submittedRef.current = false;
    cheatCountRef.current = 0;
    cheatEventsRef.current = [];
    setCheatCount(0);
    setDone(null);
    setAnswers({});
    setElapsed(0);
    const limits: number[] = [];
    if (durationMinRef.current) limits.push(Date.now() + durationMinRef.current * 60_000);
    if (deadlineMsRef.current) limits.push(deadlineMsRef.current);
    endAtRef.current = limits.length ? Math.min(...limits) : null;
    setRemaining(endAtRef.current === null ? null : Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000)));
    setAttemptNo((n) => n + 1);
    setPhase("doing");
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }, []);

  // ------------------------------------------------------------------ views
  if (loading) {
    return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (error) {
    return (
      <Card className="mx-auto mt-8 max-w-lg"><CardContent className="space-y-3 p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-destructive" /><p className="font-semibold">{error}</p>
        <Button variant="outline" onClick={() => router.back()}>Quay lại</Button>
      </CardContent></Card>
    );
  }
  if (locked) {
    return <AssignmentLocked title={meta?.title ?? ""} className={meta?.className ?? ""} openAt={locked.openAt} />;
  }

  if (phase === "done" && done) {
    return (
      <div className="mx-auto mt-6 max-w-lg">
        <Card className="bg-accent"><CardContent className="space-y-3 p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
          <h3 className="text-xl font-extrabold">Đã nộp bài!</h3>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Band IELTS ước tính</div>
          <div className="text-5xl font-extrabold text-primary">{done.band.toFixed(1)}</div>
          {done.correctCount !== null && done.total !== null && (
            <p className="text-muted-foreground">
              Đúng {done.correctCount}/{done.total} câu{done.scorePercent !== null ? ` (${done.scorePercent}%)` : ""}
            </p>
          )}
          {done.cheatCount > 0 && (
            <p className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600">
              <ShieldAlert className="h-4 w-4" /> Số lần rời bài thi: {done.cheatCount}
            </p>
          )}
          {attempts.count > 0 && (
            <p className="text-xs text-muted-foreground">Lượt làm: {attempts.count}{attempts.allowed > 0 ? `/${attempts.allowed}` : ""}</p>
          )}
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {canRetake && !isManager && (
              <Button variant="brand" className="rounded-full" onClick={retake}>Làm lại ({retakeLabel})</Button>
            )}
            <Button variant="outline" className="rounded-full" onClick={() => router.push("/classes")}>Về lớp học</Button>
          </div>
        </CardContent></Card>
      </div>
    );
  }

  // ---- doing: the native Listening exam (one ListeningShell part) ----
  const part: ListeningPart = {
    id: `${assignmentId}-l0`,
    index: 1,
    startNum: 1,
    title: listenTitle || meta?.title || "Listening",
    audioUrl,
    transcript: null,
    contentImageUrl,
    instructions,
    questions: questions.map((q) => ({
      id: q.id,
      type: q.type as ShellQType,
      prompt: q.prompt,
      options: q.options,
      correctAnswer: "", // key withheld pre-submit; unused by the inputs
      formGroup: q.formGroup ?? null,
      displayNumber: q.displayNumber ?? null,
    })),
  };

  return (
    <ListeningShell
      key={attemptNo}
      title={meta?.title ?? "Listening"}
      parts={[part]}
      activeIdx={0}
      onActiveIdxChange={() => {}}
      answers={answers}
      onChangeAnswer={(id, value) => setAnswers((a) => ({ ...a, [id]: value }))}
      onSubmit={() => void doSubmit()}
      submitted={submitting || isManager}
      remainingSec={remaining}
      elapsedSec={elapsed}
    />
  );
}
