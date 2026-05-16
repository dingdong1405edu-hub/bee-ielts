"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, PenLine, Loader2, Trophy } from "lucide-react";
import { formatDuration, wordCount, cn } from "@/lib/utils";
import { TipsCard } from "@/components/learn/tips-card";
import { WritingFeedback, type WritingResult } from "@/components/learn/writing-feedback";
import { TaskDiagram } from "@/components/learn/task-diagram";

type Result = WritingResult;

interface Props {
  task1: { id: string; prompt: string; imageUrl: string | null; diagramSvg?: string | null; minWords: number };
  task2: { id: string; prompt: string; minWords: number };
}

const TASK1_SEC = 20 * 60;
const TASK2_SEC = 40 * 60;

export function WritingSession({ task1, task2 }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<"task1" | "task2" | "grading" | "done">("task1");
  const [essay1, setEssay1] = useState("");
  const [essay2, setEssay2] = useState("");
  const [remaining, setRemaining] = useState(TASK1_SEC);
  const startedAtRef = useRef<number>(Date.now());
  const [result1, setResult1] = useState<Result | null>(null);
  const [result2, setResult2] = useState<Result | null>(null);

  useEffect(() => {
    const k1 = `writing-session-t1-${task1.id}`;
    const c1 = localStorage.getItem(k1);
    if (c1) setEssay1(c1);
    const k2 = `writing-session-t2-${task2.id}`;
    const c2 = localStorage.getItem(k2);
    if (c2) setEssay2(c2);
  }, [task1.id, task2.id]);

  useEffect(() => {
    if (stage === "task1") {
      const id = setTimeout(() => localStorage.setItem(`writing-session-t1-${task1.id}`, essay1), 400);
      return () => clearTimeout(id);
    }
    if (stage === "task2") {
      const id = setTimeout(() => localStorage.setItem(`writing-session-t2-${task2.id}`, essay2), 400);
      return () => clearTimeout(id);
    }
  }, [essay1, essay2, stage, task1.id, task2.id]);

  useEffect(() => {
    if (stage !== "task1" && stage !== "task2") return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          if (stage === "task1") {
            handleTask1Done();
          } else {
            handleTask2Done();
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const handleTask1Done = () => {
    setStage("task2");
    setRemaining(TASK2_SEC);
    startedAtRef.current = Date.now();
  };

  const handleTask2Done = async () => {
    setStage("grading");
    const duration2 = Math.floor((Date.now() - startedAtRef.current) / 1000);
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/grade/writing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId: task1.id, essay: essay1, durationSec: 20 * 60 }),
        }).then((r) => r.json()),
        fetch("/api/grade/writing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId: task2.id, essay: essay2, durationSec: duration2 }),
        }).then((r) => r.json()),
      ]);
      if (r1.result) setResult1(r1.result);
      if (r2.result) setResult2(r2.result);
      localStorage.removeItem(`writing-session-t1-${task1.id}`);
      localStorage.removeItem(`writing-session-t2-${task2.id}`);
      setStage("done");
    } catch (e) {
      console.error(e);
      toast.error("Chấm bài thất bại");
      setStage("done");
    }
  };

  if (stage === "grading") {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <h2 className="text-2xl font-extrabold">AI đang chấm cả 2 task...</h2>
          <p className="text-muted-foreground max-w-md">Đợi ~30 giây</p>
        </div>
      </div>
    );
  }

  if (stage === "done") {
    // Task 1 weighted 33%, Task 2 weighted 67% (IELTS official).
    // No result = essay not submitted / grading failed → band 0.0 (never fake 5.0).
    const b1 = result1?.overallBand ?? 0;
    const b2 = result2?.overallBand ?? 0;
    const overall = Math.round((b1 / 3 + (2 * b2) / 3) * 2) / 2;

    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="text-center space-y-2">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl gradient-brand text-white shadow-lg shadow-primary/30">
            <Trophy className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Hoàn thành Writing 🎉</h1>
        </div>

        <Card className="bg-gradient-to-br from-primary/10 to-accent border-2 border-primary/20">
          <CardContent className="p-8 text-center">
            <div className="text-sm text-muted-foreground">Writing Band (Task 1 × 1/3 + Task 2 × 2/3)</div>
            <div className="text-6xl font-extrabold gradient-brand-text mt-2">{overall.toFixed(1)}</div>
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <Badge>Task 1</Badge>
                <div className="text-3xl font-extrabold text-primary">{b1.toFixed(1)}</div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{result1?.summary || "Chưa có bài viết để chấm."}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <Badge>Task 2</Badge>
                <div className="text-3xl font-extrabold text-primary">{b2.toFixed(1)}</div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{result2?.summary || "Chưa có bài viết để chấm."}</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed AI feedback per task */}
        {result1 && <WritingFeedback result={result1} taskLabel="Task 1" />}
        {result2 && <WritingFeedback result={result2} taskLabel="Task 2" />}

        <TipsCard skill="WRITING" score={overall} context={`Writing session: Task 1 band ${b1.toFixed(1)}, Task 2 band ${b2.toFixed(1)}`} />

        <Button onClick={() => router.push("/writing")} variant="brand" size="xl" className="w-full rounded-full">
          Làm session mới
        </Button>
      </div>
    );
  }

  // Active task
  const isTask1 = stage === "task1";
  const currentTask = isTask1 ? task1 : task2;
  const currentEssay = isTask1 ? essay1 : essay2;
  const setCurrentEssay = isTask1 ? setEssay1 : setEssay2;
  const wc = wordCount(currentEssay);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="rounded-2xl border bg-rose-600 text-white p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <PenLine className="h-6 w-6" />
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">IELTS Writing — Task {isTask1 ? "1" : "2"} / 2</div>
            <div className="font-extrabold">{isTask1 ? "Task 1 (biểu đồ — 150 từ)" : "Task 2 (essay — 250 từ)"}</div>
          </div>
        </div>
        <Badge variant="outline" className="bg-white/15 border-white/30 text-white text-base px-3 py-1">
          <Clock className="h-4 w-4 mr-1" /> {formatDuration(remaining)}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-bold">Đề bài</h3>
            <div className="whitespace-pre-wrap text-sm">{currentTask.prompt}</div>
            {isTask1 && <TaskDiagram svg={task1.diagramSvg} />}
            {isTask1 && task1.imageUrl && !task1.diagramSvg && (
              <div className="relative w-full aspect-video rounded-md overflow-hidden border">
                <Image src={task1.imageUrl} alt="task" fill className="object-contain" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Bài viết</h3>
              <span className={cn("text-sm font-bold", wc < currentTask.minWords ? "text-destructive" : "text-success")}>
                {wc}/{currentTask.minWords} từ
              </span>
            </div>
            <Textarea
              value={currentEssay}
              onChange={(e) => setCurrentEssay(e.target.value)}
              placeholder="Bắt đầu viết..."
              className="min-h-[400px] font-serif text-base"
            />
            <Button
              onClick={isTask1 ? handleTask1Done : handleTask2Done}
              variant="brand"
              size="lg"
              className="w-full rounded-full"
            >
              {isTask1 ? "Sang Task 2 →" : "Nộp & chấm (cả 2 task)"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
