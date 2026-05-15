"use client";
import { useState } from "react";
import { CheckCircle2, XCircle, Loader2, Sparkles, BookOpen, Languages, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface SolutionPassage {
  id: string;
  title: string;
  passage: string;
  questions: {
    id: string;
    type: string;
    prompt: string;
    options: string[] | null;
    correctAnswer: string;
  }[];
}

type Explanation = { quote: string; translation: string; reasoning: string };

export function ReadingSolutions({
  passages,
  answers,
}: {
  passages: SolutionPassage[];
  answers: Record<string, string>;
}) {
  const [activePart, setActivePart] = useState(0);
  // cache: questionId -> explanation OR "loading" OR "error"
  const [cache, setCache] = useState<Record<string, Explanation | "loading" | "error">>({});

  const current = passages[activePart];

  const fetchExplain = async (qId: string) => {
    const q = current.questions.find((x) => x.id === qId);
    if (!q) return;
    setCache((c) => ({ ...c, [qId]: "loading" }));
    try {
      const res = await fetch("/api/reading/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passage: current.passage,
          questionPrompt: q.prompt,
          questionType: q.type,
          options: q.options,
          correctAnswer: q.correctAnswer,
          userAnswer: answers[q.id] || "",
        }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as Explanation;
      setCache((c) => ({ ...c, [qId]: data }));
    } catch {
      setCache((c) => ({ ...c, [qId]: "error" }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Part tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {passages.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setActivePart(i)}
            className={cn(
              "rounded-xl px-3 py-1.5 text-sm font-bold border-2 transition-colors",
              activePart === i ? "border-primary bg-accent/30 text-primary" : "border-border hover:border-primary/30",
            )}
          >
            Part {i + 1}
          </button>
        ))}
      </div>

      {/* Passage card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-5 w-5 text-primary" />
            <h3 className="font-extrabold">{current.title}</h3>
          </div>
          <div className="text-[14px] leading-relaxed whitespace-pre-wrap text-foreground max-h-72 overflow-y-auto rounded-lg border bg-muted/20 p-3">
            {current.passage}
          </div>
        </CardContent>
      </Card>

      {/* Questions with on-demand explanations */}
      <div className="space-y-3">
        {current.questions.map((q, i) => {
          const ua = answers[q.id] || "";
          const ok = ua.trim().toLowerCase() === q.correctAnswer.toLowerCase();
          const ex = cache[q.id];
          return (
            <Card key={q.id} className={cn("border-2", ok ? "border-success/40" : "border-destructive/40")}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-600 text-white text-xs font-extrabold">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium leading-relaxed">{q.prompt}</span>
                  {ok ? <CheckCircle2 className="h-5 w-5 text-success shrink-0" /> : <XCircle className="h-5 w-5 text-destructive shrink-0" />}
                </div>

                <div className="ml-8 text-sm grid sm:grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Của bạn</div>
                    <div className={cn("font-semibold", ok ? "text-success" : "text-destructive line-through")}>
                      {ua || "(trống)"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Đáp án đúng</div>
                    <div className="font-semibold text-success">{q.correctAnswer}</div>
                  </div>
                </div>

                {/* Explanation section */}
                <div className="ml-8">
                  {!ex && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full text-xs"
                      onClick={() => fetchExplain(q.id)}
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                      Xem lời giải chi tiết
                    </Button>
                  )}
                  {ex === "loading" && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Đang tạo lời giải...
                    </div>
                  )}
                  {ex === "error" && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-destructive">Lỗi tạo lời giải.</span>
                      <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => fetchExplain(q.id)}>
                        Thử lại
                      </Button>
                    </div>
                  )}
                  {typeof ex === "object" && ex !== null && (
                    <div className="mt-1 space-y-2 rounded-lg border bg-primary/5 p-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                          <BookOpen className="h-3.5 w-3.5" /> Đoạn trong bài
                        </div>
                        <blockquote className="mt-1 border-l-4 border-primary/40 pl-3 text-sm italic text-foreground">
                          {ex.quote}
                        </blockquote>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                          <Languages className="h-3.5 w-3.5" /> Bản dịch
                        </div>
                        <p className="mt-1 text-sm text-foreground/80">{ex.translation}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                          <Lightbulb className="h-3.5 w-3.5" /> Vì sao đáp án này
                        </div>
                        <p className="mt-1 text-sm text-foreground leading-relaxed">{ex.reasoning}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
