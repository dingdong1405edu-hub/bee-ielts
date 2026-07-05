"use client";

/**
 * HomeworkSpeaking — student does a SPEAKING assignment: read each question,
 * record an answer (MediaRecorder), which is transcribed via Deepgram
 * (/api/speaking/transcribe). On submit the combined transcript is AI-graded
 * (/api/submissions/speaking) and the result renders with SpeakingReviewBody —
 * identical to the profile review and to what the teacher sees. Audio is not
 * stored (matches the profile review, which is transcript + band only).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, Mic, Square } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AssignmentLocked } from "@/components/learn/assignment-locked";
import { SpeakingReviewBody, type SpeakingFeedback } from "@/components/learn/speaking-review-body";

interface SpeakingConfig {
  part?: number;
  topic?: string;
  questions?: string[];
}

export function HomeworkSpeaking({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ title: string; className: string } | null>(null);
  const [cfg, setCfg] = useState<SpeakingConfig>({});
  const [locked, setLocked] = useState<{ openAt: string | null } | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [recIndex, setRecIndex] = useState(-1);
  const [busyIndex, setBusyIndex] = useState(-1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ band: number; result: SpeakingFeedback; transcripts: { label: string; text: string }[] } | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const submittedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/assignments/${assignmentId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Không tải được bài");
        if (!alive) return;
        setMeta({ title: data.assignment.title, className: data.assignment.className });
        setCfg((data.assignment.config?.speaking as SpeakingConfig) ?? {});
        setIsManager(Boolean(data.isManager));
        if (data.locked) setLocked({ openAt: data.assignment.openAt });
        else if (data.alreadySubmitted && data.submission) {
          const q = ((data.assignment.config?.speaking as SpeakingConfig)?.questions ?? []) as string[];
          const text = data.submission.transcript ?? "";
          setDone({
            band: data.submission.totalScore ?? 0,
            result: (data.submission.feedback as SpeakingFeedback) ?? {},
            transcripts: text ? [{ label: q.length ? `Part ${(data.assignment.config?.speaking as SpeakingConfig)?.part ?? ""}` : "", text }] : [],
          });
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Lỗi tải bài");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [assignmentId]);

  const ensureMic = useCallback(async () => {
    if (streamRef.current) return streamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    return stream;
  }, []);

  const transcribe = useCallback(async (i: number, blob: Blob) => {
    setBusyIndex(i);
    try {
      const res = await fetch("/api/speaking/transcribe", {
        method: "POST",
        headers: { "Content-Type": blob.type || "audio/webm" },
        body: blob,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không nhận dạng được giọng nói");
      const text = (data.transcript ?? "").trim();
      if (!text) toast.error("Không nghe rõ — hãy nói to và rõ hơn, ghi âm lại nhé.");
      setAnswers((a) => ({ ...a, [i]: text }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi nhận dạng giọng nói");
    } finally {
      setBusyIndex(-1);
    }
  }, []);

  const startRec = useCallback(async (i: number) => {
    try {
      const stream = await ensureMic();
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      recorderRef.current = mr;
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        void transcribe(i, blob);
      };
      mr.start();
      setRecIndex(i);
    } catch {
      toast.error("Không truy cập được micro. Hãy cho phép quyền micro rồi thử lại.");
    }
  }, [ensureMic, transcribe]);

  const stopRec = useCallback(() => {
    recorderRef.current?.state === "recording" && recorderRef.current.stop();
    setRecIndex(-1);
  }, []);

  const questions = cfg.questions ?? [];
  const answeredCount = questions.filter((_, i) => (answers[i] ?? "").trim()).length;

  const submit = useCallback(async () => {
    if (submittedRef.current) return;
    const transcript = questions.map((_, i) => (answers[i] ?? "").trim()).filter(Boolean).join("\n");
    if (transcript.trim().length < 20) return toast.error("Hãy ghi âm trả lời ít nhất một câu trước khi nộp.");
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const res = await fetch("/api/submissions/speaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId, transcript }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nộp bài thất bại");
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setDone({ band: data.band, result: data.result, transcripts: [{ label: `Part ${cfg.part ?? ""}`.trim(), text: transcript }] });
      toast.success("Đã nộp — AI đã chấm xong!");
    } catch (e) {
      submittedRef.current = false;
      toast.error(e instanceof Error ? e.message : "Nộp bài thất bại");
    } finally {
      setSubmitting(false);
    }
  }, [assignmentId, answers, questions, cfg.part]);

  if (loading) return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error) return (
    <Card className="mx-auto mt-8 max-w-lg"><CardContent className="space-y-3 p-6 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-destructive" /><p className="font-semibold">{error}</p>
      <Button variant="outline" onClick={() => router.back()}>Quay lại</Button>
    </CardContent></Card>
  );
  if (locked) return <AssignmentLocked title={meta?.title ?? ""} className={meta?.className ?? ""} openAt={locked.openAt} />;

  if (done) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-accent">
          <CardContent className="p-6 text-center">
            <CheckCircle2 className="mx-auto h-9 w-9 text-success" />
            <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">Đã nộp — Band</div>
            <div className="text-4xl font-extrabold gradient-brand-text">{done.band.toFixed(1)}</div>
          </CardContent>
        </Card>
        <SpeakingReviewBody score={done.band} feedback={done.result} transcripts={done.transcripts} />
        <div className="flex justify-center">
          <Button onClick={() => router.push("/classes")} variant="outline">Về lớp học</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-24">
      <header className="flex items-center gap-2">
        <Mic className="h-5 w-5 text-rose-500" />
        <div>
          <h1 className="text-xl font-extrabold">{meta?.title}</h1>
          <p className="text-xs text-muted-foreground">{meta?.className} · Part {cfg.part ?? 1}{cfg.topic ? ` · ${cfg.topic}` : ""}</p>
        </div>
      </header>

      {isManager && (
        <Card><CardContent className="p-4 text-sm text-muted-foreground">
          Bạn đang xem trước với vai trò giáo viên — học sinh sẽ ghi âm trả lời từng câu.
        </CardContent></Card>
      )}

      {questions.map((q, i) => {
        const recording = recIndex === i;
        const busy = busyIndex === i;
        const ans = answers[i] ?? "";
        return (
          <Card key={i}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start gap-2.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sage-600 text-sm font-extrabold text-white">{i + 1}</span>
                <p className="flex-1 pt-0.5 text-[15px] font-medium">{q}</p>
              </div>
              {!isManager && (
                <div className="flex items-center gap-2 pl-9">
                  {recording ? (
                    <Button onClick={stopRec} size="sm" variant="destructive" className="rounded-full">
                      <Square className="h-3.5 w-3.5" /> Dừng
                    </Button>
                  ) : (
                    <Button onClick={() => startRec(i)} size="sm" variant="outline" disabled={busy || recIndex !== -1} className="rounded-full">
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mic className="h-3.5 w-3.5" />}
                      {ans ? "Ghi lại" : "Ghi âm"}
                    </Button>
                  )}
                  {recording && <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive"><span className="h-2 w-2 animate-pulse rounded-full bg-destructive" /> Đang ghi…</span>}
                  {busy && <span className="text-xs text-muted-foreground">Đang nhận dạng…</span>}
                </div>
              )}
              {ans && (
                <div className={cn("ml-9 rounded-lg border bg-muted/20 p-2.5 text-sm", "text-muted-foreground")}>{ans}</div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {!isManager && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-3 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Đã trả lời {answeredCount}/{questions.length}</span>
            <Button onClick={submit} disabled={submitting || recIndex !== -1} variant="brand" className="min-w-[140px] rounded-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Nộp bài"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
