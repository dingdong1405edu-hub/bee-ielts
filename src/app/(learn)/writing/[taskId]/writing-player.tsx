"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, PenLine, Loader2, Sparkles } from "lucide-react";
import { formatDuration, wordCount, cn } from "@/lib/utils";
import { TipsCard } from "@/components/learn/tips-card";

type WritingResult = {
  overallBand: number;
  criteria: {
    taskAchievement: { band: number; feedback: string };
    coherenceCohesion: { band: number; feedback: string };
    lexicalResource: { band: number; feedback: string };
    grammaticalRange: { band: number; feedback: string };
  };
  annotations: { excerpt: string; issue: string; suggestion: string }[];
  improvedVersion: string;
  summary: string;
};

export function WritingPlayer({
  taskId,
  taskType,
  prompt,
  imageUrl,
  minWords,
  timeLimit,
}: {
  taskId: string;
  taskType: 1 | 2;
  prompt: string;
  imageUrl: string | null;
  minWords: number;
  timeLimit: number;
}) {
  const router = useRouter();
  const startedAtRef = useRef<number>(Date.now());
  const [essay, setEssay] = useState("");
  const [remaining, setRemaining] = useState(timeLimit);
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState<WritingResult | null>(null);
  const wc = wordCount(essay);

  useEffect(() => {
    if (result) return;
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
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
            <div className="text-sm text-muted-foreground">Overall Band Score</div>
            <div className="text-6xl font-bold text-primary mt-2">{result.overallBand.toFixed(1)}</div>
            <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">{result.summary}</p>
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-2 gap-3">
          {Object.entries(result.criteria).map(([k, v]) => (
            <Card key={k}>
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">{labelOf(k)}</span>
                  <span className="text-lg font-bold text-primary">{v.band.toFixed(1)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{v.feedback}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {result.annotations.length > 0 && (
          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Góp ý chi tiết
              </h3>
              {result.annotations.map((a, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-1.5 text-sm">
                  <div className="italic text-muted-foreground">"{a.excerpt}"</div>
                  <div><strong className="text-destructive">Issue:</strong> {a.issue}</div>
                  <div><strong className="text-success">Suggestion:</strong> {a.suggestion}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {result.improvedVersion && (
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-2">Bản viết tham khảo</h3>
              <div className="whitespace-pre-wrap text-sm text-muted-foreground">{result.improvedVersion}</div>
            </CardContent>
          </Card>
        )}

        <TipsCard skill="WRITING" score={result.overallBand} context={`Writing Task ${taskType} essay`} />

        <Button onClick={() => router.push("/writing")} className="w-full" size="lg">
          Làm task khác
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <button onClick={() => router.push("/writing")} className="text-sm text-muted-foreground hover:underline">
            ← Writing
          </button>
          <h1 className="text-xl md:text-2xl font-bold mt-1 flex items-center gap-2">
            <PenLine className="h-6 w-6 text-rose-500" />
            Task {taskType}
          </h1>
        </div>
        <Badge variant={remaining < 120 ? "destructive" : "outline"} className="text-base px-3 py-1">
          <Clock className="h-4 w-4 mr-1" /> {formatDuration(remaining)}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold">Đề bài</h3>
            <div className="whitespace-pre-wrap text-sm">{prompt}</div>
            {imageUrl && (
              <div className="relative w-full aspect-video rounded-md overflow-hidden border">
                <Image src={imageUrl} alt="task" fill className="object-contain" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
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
              className="min-h-[400px] font-serif text-base"
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

function labelOf(k: string) {
  switch (k) {
    case "taskAchievement": return "Task Achievement";
    case "coherenceCohesion": return "Coherence & Cohesion";
    case "lexicalResource": return "Lexical Resource";
    case "grammaticalRange": return "Grammatical Range & Accuracy";
    default: return k;
  }
}
