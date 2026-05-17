"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, PenLine } from "lucide-react";
import { formatDuration, wordCount, cn } from "@/lib/utils";
import { TaskDiagram } from "@/components/learn/task-diagram";

interface Task1 {
  id: string;
  prompt: string;
  minWords: number;
  diagramSvg: string | null;
}
interface Task2 {
  id: string;
  prompt: string;
  minWords: number;
}

/**
 * Mock Writing — both IELTS parts in one 60-minute block.
 * The learner writes Task 1, moves to Task 2, then submits. A single
 * countdown covers both tasks (real IELTS gives 60 minutes total).
 */
export function MockWriting({
  task1,
  task2,
  timeLimit,
  onDone,
}: {
  task1: Task1;
  task2: Task2;
  timeLimit: number;
  onDone: (essays: { essay1: string; essay2: string }) => void;
}) {
  const [part, setPart] = useState<1 | 2>(1);
  const [essay1, setEssay1] = useState("");
  const [essay2, setEssay2] = useState("");
  const [remaining, setRemaining] = useState(timeLimit);
  // Refs so the auto-submit on timeout always sees the latest text.
  const e1 = useRef("");
  const e2 = useRef("");
  e1.current = essay1;
  e2.current = essay2;

  useEffect(() => {
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          onDone({ essay1: e1.current, essay2: e2.current });
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isT1 = part === 1;
  const cur = isT1 ? task1 : task2;
  const essay = isT1 ? essay1 : essay2;
  const setEssay = isT1 ? setEssay1 : setEssay2;
  const wc = wordCount(essay);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="rounded-2xl border bg-rose-600 text-white p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <PenLine className="h-6 w-6" />
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">
              Section 3/4 — Writing · Task {part}/2
            </div>
            <div className="font-extrabold">
              {isT1 ? "Task 1 (biểu đồ — 150 từ)" : "Task 2 (essay — 250 từ)"}
            </div>
          </div>
        </div>
        <Badge variant="outline" className="bg-white/15 border-white/30 text-white text-base px-3 py-1">
          <Clock className="h-4 w-4 mr-1" /> {formatDuration(remaining)}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold">Đề bài</h3>
            <div className="whitespace-pre-wrap text-sm">{cur.prompt}</div>
            {isT1 && <TaskDiagram svg={task1.diagramSvg} />}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Bài viết</h3>
              <span className={cn("text-sm font-bold", wc < cur.minWords ? "text-destructive" : "text-success")}>
                {wc}/{cur.minWords} từ
              </span>
            </div>
            <Textarea
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
              placeholder="Bắt đầu viết..."
              className="min-h-[420px] text-base"
            />
            {isT1 ? (
              <Button onClick={() => setPart(2)} variant="brand" size="lg" className="w-full rounded-full">
                Sang Task 2 →
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={() => setPart(1)} variant="outline" size="lg" className="rounded-full">
                  ← Task 1
                </Button>
                <Button
                  onClick={() => onDone({ essay1, essay2 })}
                  variant="brand"
                  size="lg"
                  className="flex-1 rounded-full"
                >
                  Nộp & sang Speaking →
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
