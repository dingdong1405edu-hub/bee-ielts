"use client";

/**
 * HomeworkWriting — student does a WRITING assignment: read the đề bài (+ ảnh),
 * write an essay with a live word counter, submit → AI grades → the result is
 * shown with the SAME components as the profile Writing review (WritingFeedback
 * + AnnotatedEssay), so what the teacher sees later is identical.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, PenLine } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AssignmentLocked } from "@/components/learn/assignment-locked";
import { WritingFeedback, type WritingResult } from "@/components/learn/writing-feedback";
import { AnnotatedEssay } from "@/components/learn/annotated-essay";

interface WritingConfig {
  taskType?: number;
  prompt?: string;
  imageUrl?: string;
  minWords?: number;
}

export function HomeworkWriting({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ title: string; className: string } | null>(null);
  const [cfg, setCfg] = useState<WritingConfig>({});
  const [locked, setLocked] = useState<{ openAt: string | null } | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [essay, setEssay] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ band: number; result: WritingResult; essay: string } | null>(null);
  const [attempts, setAttempts] = useState({ allowed: 1, count: 0 });
  const startedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/assignments/${assignmentId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Không tải được bài");
        if (!alive) return;
        setMeta({ title: data.assignment.title, className: data.assignment.className });
        setCfg((data.assignment.config?.writing as WritingConfig) ?? {});
        setIsManager(Boolean(data.isManager));
        setAttempts({ allowed: data.assignment.attemptsAllowed ?? 1, count: data.submission?.attemptCount ?? 0 });
        if (data.locked) setLocked({ openAt: data.assignment.openAt });
        else if (data.alreadySubmitted && data.submission) {
          const raw = (data.submission.answers ?? {}) as { essay?: string };
          setDone({
            band: data.submission.totalScore ?? 0,
            result: (data.submission.feedback as WritingResult) ?? ({} as WritingResult),
            essay: raw.essay ?? "",
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
    };
  }, [assignmentId]);

  const wordCount = essay.trim() ? essay.trim().split(/\s+/).filter(Boolean).length : 0;
  const minWords = cfg.minWords ?? (cfg.taskType === 1 ? 150 : 250);

  const submit = useCallback(async () => {
    if (startedRef.current) return;
    if (wordCount < 30) return toast.error("Hãy viết ít nhất 30 từ trước khi nộp.");
    startedRef.current = true;
    setSubmitting(true);
    try {
      const res = await fetch("/api/submissions/writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId, essay }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nộp bài thất bại");
      setDone({ band: data.band, result: data.result, essay });
      setAttempts((a) => ({ allowed: data.attemptsAllowed ?? a.allowed, count: data.attemptCount ?? a.count + 1 }));
      toast.success("Đã nộp — AI đã chấm xong!");
    } catch (e) {
      startedRef.current = false;
      toast.error(e instanceof Error ? e.message : "Nộp bài thất bại");
    } finally {
      setSubmitting(false);
    }
  }, [assignmentId, essay, wordCount]);

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
            <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">Band IELTS</div>
            <div className="text-5xl font-extrabold gradient-brand-text">{done.band.toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card><CardContent className="space-y-2 p-5">
          <h3 className="font-bold">Bài viết của bạn</h3>
          <AnnotatedEssay essay={done.essay} annotations={done.result?.annotations ?? []} showCorrections />
        </CardContent></Card>
        {done.result && Object.keys(done.result).length > 0 && (
          <WritingFeedback result={done.result} taskLabel={`Task ${cfg.taskType ?? ""}`} />
        )}
        <div className="flex flex-wrap justify-center gap-2">
          {(attempts.allowed === 0 || attempts.count < attempts.allowed) && (
            <Button
              variant="brand"
              onClick={() => { setDone(null); setEssay(""); startedRef.current = false; }}
            >
              Làm lại ({attempts.allowed === 0 ? "không giới hạn" : `còn ${Math.max(0, attempts.allowed - attempts.count)} lượt`})
            </Button>
          )}
          <Button onClick={() => router.push("/classes")} variant="outline">Về lớp học</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-24">
      <header className="flex items-center gap-2">
        <PenLine className="h-5 w-5 text-honey-deep" />
        <div>
          <h1 className="text-xl font-extrabold">{meta?.title}</h1>
          <p className="text-xs text-muted-foreground">{meta?.className} · Task {cfg.taskType ?? 2}</p>
        </div>
      </header>

      <Card><CardContent className="space-y-3 p-5">
        <h3 className="font-bold">Đề bài</h3>
        <p className="whitespace-pre-wrap text-sm">{cfg.prompt}</p>
        {cfg.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cfg.imageUrl} alt="Đề bài" className="max-h-80 w-full rounded-lg border bg-muted/30 object-contain" />
        )}
      </CardContent></Card>

      {isManager ? (
        <Card><CardContent className="p-4 text-sm text-muted-foreground">
          Bạn đang xem trước với vai trò giáo viên — học sinh sẽ viết bài ở đây.
        </CardContent></Card>
      ) : (
        <>
          <Card><CardContent className="space-y-2 p-4">
            <Textarea value={essay} onChange={(e) => setEssay(e.target.value)} rows={14} placeholder="Viết bài của bạn ở đây…" className="text-[15px] leading-relaxed" />
            <div className="flex items-center justify-between text-xs">
              <span className={wordCount >= minWords ? "font-semibold text-leaf" : "text-muted-foreground"}>
                {wordCount} từ {minWords ? `/ tối thiểu ${minWords}` : ""}
              </span>
            </div>
          </CardContent></Card>

          <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-3 backdrop-blur">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">AI sẽ chấm band + nhận xét ngay khi nộp.</span>
              <Button onClick={submit} disabled={submitting} variant="brand" className="min-w-[140px] rounded-full">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Nộp bài"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
