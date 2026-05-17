"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, PenLine } from "lucide-react";
import { formatDuration, wordCount, cn } from "@/lib/utils";

export function MockWriting({
  prompt,
  minWords,
  timeLimit,
  onDone,
}: {
  prompt: string;
  minWords: number;
  timeLimit: number;
  onDone: (essay: string) => void;
}) {
  const [essay, setEssay] = useState("");
  const [remaining, setRemaining] = useState(timeLimit);
  const wc = wordCount(essay);

  useEffect(() => {
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          onDone(essay);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="rounded-2xl border bg-rose-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PenLine className="h-6 w-6" />
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">Section 3/4 — Task 2</div>
            <div className="font-extrabold">Writing</div>
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
            <div className="whitespace-pre-wrap text-sm">{prompt}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Bài viết</h3>
              <span className={cn("text-sm font-bold", wc < minWords ? "text-destructive" : "text-success")}>
                {wc}/{minWords} từ
              </span>
            </div>
            <Textarea
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
              placeholder="Bắt đầu viết..."
              className="min-h-[450px] text-base"
            />
            <Button onClick={() => onDone(essay)} variant="brand" size="lg" className="w-full rounded-full">
              Nộp & sang Speaking →
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
