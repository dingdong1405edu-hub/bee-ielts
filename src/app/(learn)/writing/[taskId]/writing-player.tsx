"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, PenLine, Loader2 } from "lucide-react";
import { formatDuration, wordCount, cn } from "@/lib/utils";
import { TipsCard } from "@/components/learn/tips-card";
import { ReviewReport, type WritingReviewData } from "@/components/learn/review-report";
import { WritingFeedback, type WritingResult } from "@/components/learn/writing-feedback";
import { TaskDiagram } from "@/components/learn/task-diagram";
import { Honeycomb, Leaf, MascotBubble, BeeMascot } from "@/components/brand";

export function WritingPlayer({
  taskId,
  taskType,
  prompt,
  imageUrl,
  diagramSvg,
  minWords,
}: {
  taskId: string;
  taskType: 1 | 2;
  prompt: string;
  imageUrl: string | null;
  diagramSvg?: string | null;
  minWords: number;
}) {
  const router = useRouter();
  const startedAtRef = useRef<number>(Date.now());
  const [essay, setEssay] = useState("");
  // Practise — đếm xuôi thời gian đã làm, không giới hạn thời gian.
  const [elapsed, setElapsed] = useState(0);
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState<WritingResult | null>(null);
  const wc = wordCount(essay);

  useEffect(() => {
    if (result) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [result]);

  useEffect(() => {
    const key = `writing-draft-${taskId}`;
    const cached = localStorage.getItem(key);
    if (cached) setEssay(cached);
  }, [taskId]);
  useEffect(() => {
    const key = `writing-draft-${taskId}`;
    const id = setTimeout(() => localStorage.setItem(key, essay), 400);
    return () => clearTimeout(id);
  }, [essay, taskId]);

  const submit = async () => {
    if (wc < minWords) {
      if (!confirm(`Bạn mới viết ${wc} từ (yêu cầu ≥ ${minWords}). Vẫn nộp?`)) return;
    }
    setGrading(true);
    try {
      const durationSec = Math.floor((Date.now() - startedAtRef.current) / 1000);
      const res = await fetch("/api/grade/writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, essay, durationSec }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Grading failed");
      setResult(data.result);
      localStorage.removeItem(`writing-draft-${taskId}`);
      toast.success(`Band ${data.result.overallBand}`);
    } catch (e) {
      console.error(e);
      toast.error("Chấm bài thất bại. Thử lại sau.");
    } finally {
      setGrading(false);
    }
  };

  if (result) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <button onClick={() => router.push("/writing")} className="text-sm text-muted-foreground hover:underline">
          ← Writing
        </button>
        <Card className="bg-gradient-to-br from-primary/10 to-accent">
          <CardContent className="p-6 text-center">
            <BeeMascot className="w-16 mx-auto mb-1" />
            <div className="text-sm text-muted-foreground">Overall Band Score</div>
            <div className="text-6xl font-bold text-primary mt-2">{result.overallBand.toFixed(1)}</div>
            <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">{result.summary}</p>
          </CardContent>
        </Card>

        <WritingFeedback result={result} taskLabel={`Task ${taskType}`} essay={essay} />

        <TipsCard skill="WRITING" score={result.overallBand} context={`Writing Task ${taskType} essay`} />

        <ReviewReport
          data={{
            kind: "WRITING",
            taskType,
            prompt,
            essay,
            result,
          } satisfies WritingReviewData}
        />

        <Button onClick={() => router.push("/writing")} className="w-full" size="lg">
          Làm task khác
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="relative overflow-hidden rounded-2xl">
        <Honeycomb className="pointer-events-none absolute inset-0 text-[#B6883F]/[0.05]" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <button onClick={() => router.push("/writing")} className="text-sm text-muted-foreground hover:underline">
              ← Writing
            </button>
            <h1 className="text-xl md:text-2xl font-bold mt-1 flex items-center gap-2">
              <PenLine className="h-6 w-6 text-rose-500" />
              Task {taskType}
              <Leaf className="h-4 w-4 text-leaf" />
            </h1>
          </div>
          <Badge variant="outline" className="text-base px-3 py-1">
            <Clock className="h-4 w-4 mr-1" /> Đã làm {formatDuration(elapsed)}
          </Badge>
        </div>
      </div>

      <MascotBubble tone="tip">Viết đủ ý, đúng band — mình cùng cố nhé!</MascotBubble>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* data-tour="prompt" lets the band-climb Bee 🐝 tour spotlight this
            card AND wrap matching admin-authored anchor words (`highlights`)
            with <mark class="bee-anchor"> directly inside the đề bài text. */}
        <Card data-tour="prompt">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold">Đề bài</h3>
            <div className="whitespace-pre-wrap text-sm">{prompt}</div>
            <TaskDiagram svg={diagramSvg} />
            {imageUrl && !diagramSvg && (
              <div className="rounded-md overflow-hidden border bg-muted/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Biểu đồ đề bài"
                  className="w-full max-h-[30rem] object-contain"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* data-tour="writing-area" — Bee can stop here on a separate step
            to explain how to use the textarea / word counter / submit flow. */}
        <Card data-tour="writing-area">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Bài viết của bạn</h3>
              <span className={cn("text-sm", wc < minWords ? "text-destructive" : "text-success")}>
                {wc} / {minWords} từ
              </span>
            </div>
            <Textarea
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
              placeholder="Bắt đầu viết..."
              className="min-h-[400px] text-base"
              disabled={grading}
            />
            <Button onClick={submit} disabled={grading || essay.trim().length === 0} className="w-full" size="lg">
              {grading && <Loader2 className="h-4 w-4 animate-spin" />}
              {grading ? "AI đang chấm..." : "Nộp bài cho AI chấm"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

