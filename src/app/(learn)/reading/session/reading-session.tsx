"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen, CheckCircle2, XCircle, Trophy } from "lucide-react";
import { formatDuration, cn } from "@/lib/utils";
import { TipsCard } from "@/components/learn/tips-card";
import { ReviewReport, type ReadingReviewData } from "@/components/learn/review-report";

type Q = {
  id: string;
  type: "MCQ" | "FILL_BLANK" | "TRUE_FALSE" | "TRUE_FALSE_NOT_GIVEN" | "MATCHING" | "MATCHING_HEADINGS" | "MATCHING_INFO" | "MATCHING_FEATURES" | "MATCHING_SENTENCE_ENDINGS" | "SHORT_ANSWER";
  prompt: string;
  options: string[] | null;
  correctAnswer: string;
};

interface Passage {
  id: string;
  title: string;
  level: string;
  passage: string;
  questions: Q[];
}

const SESSION_SECONDS = 60 * 60;

export function ReadingSession({ passages }: { passages: Passage[] }) {
  const router = useRouter();
  const startedAtRef = useRef<number>(Date.now());
  const [activeTab, setActiveTab] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState(SESSION_SECONDS);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          handleSubmit();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted]);

  const handleSubmit = async () => {
    if (submitted) return;
    setSubmitted(true);
    const durationSec = Math.floor((Date.now() - startedAtRef.current) / 1000);

    let totalCorrect = 0;
    let totalQuestions = 0;
    const perPassage: { passageId: string; correct: number; total: number }[] = [];

    for (const p of passages) {
      const c = p.questions.filter(
        (q) => (answers[q.id] || "").trim().toLowerCase() === q.correctAnswer.toLowerCase(),
      ).length;
      totalCorrect += c;
      totalQuestions += p.questions.length;
      perPassage.push({ passageId: p.id, correct: c, total: p.questions.length });

      try {
        await fetch("/api/reading/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testId: p.id,
            answers: Object.fromEntries(
              p.questions.map((q) => [q.id, answers[q.id] || ""]),
            ),
            correctCount: c,
            total: p.questions.length,
            durationSec: Math.floor(durationSec / passages.length),
          }),
        });
      } catch (e) {
        console.error(e);
      }
    }

    const band = (totalCorrect / totalQuestions) * 9;
    toast.success(`${totalCorrect}/${totalQuestions} câu đúng — Band ~${band.toFixed(1)}`);
  };

  const totalCorrect = submitted
    ? passages.reduce((sum, p) => sum + p.questions.filter((q) => (answers[q.id] || "").trim().toLowerCase() === q.correctAnswer.toLowerCase()).length, 0)
    : 0;
  const totalQuestions = passages.reduce((sum, p) => sum + p.questions.length, 0);
  const band = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 9 : 0;

  const current = passages[activeTab];

  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="text-center space-y-2">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl gradient-brand text-white shadow-lg shadow-primary/30">
            <Trophy className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Hoàn thành Reading 🎉</h1>
        </div>

        <Card className="bg-gradient-to-br from-primary/10 to-accent border-2 border-primary/20">
          <CardContent className="p-8 text-center">
            <div className="text-sm text-muted-foreground">Reading Band</div>
            <div className="text-6xl font-extrabold gradient-brand-text mt-2">{band.toFixed(1)}</div>
            <div className="text-sm text-muted-foreground mt-2">{totalCorrect}/{totalQuestions} câu đúng</div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {passages.map((p, i) => {
            const c = p.questions.filter((q) => (answers[q.id] || "").trim().toLowerCase() === q.correctAnswer.toLowerCase()).length;
            return (
              <Card key={p.id} className="cursor-pointer hover:shadow-md" onClick={() => setActiveTab(i)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Passage {i + 1}</div>
                    <div className="font-semibold">{p.title}</div>
                  </div>
                  <div className="text-lg font-bold text-primary">{c}/{p.questions.length}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardContent className="p-5">
            <h3 className="font-bold mb-3">Đáp án — Passage {activeTab + 1}: {current.title}</h3>
            <div className="space-y-2">
              {current.questions.map((q, i) => {
                const ua = answers[q.id] || "";
                const ok = ua.trim().toLowerCase() === q.correctAnswer.toLowerCase();
                return (
                  <div key={q.id} className={cn("rounded-lg border p-3 text-sm", ok ? "border-success bg-success/5" : "border-destructive bg-destructive/5")}>
                    <div className="flex items-start gap-2">
                      <span className="font-bold">{i + 1}.</span>
                      <span className="flex-1">{q.prompt}</span>
                      {ok ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
                    </div>
                    <div className="mt-1 ml-6">
                      Của bạn: <span className={ok ? "text-success font-semibold" : "text-destructive line-through"}>{ua || "(trống)"}</span>
                      {!ok && <> · Đúng: <span className="text-success font-semibold">{q.correctAnswer}</span></>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <TipsCard skill="READING" score={band} context={`Reading session: ${totalCorrect}/${totalQuestions} correct across ${passages.length} passages`} />

        <ReviewReport
          data={{
            kind: "READING",
            passages: passages.map((p) => ({
              title: p.title,
              level: p.level,
              questions: p.questions.map((q) => ({
                prompt: q.prompt,
                type: q.type,
                userAnswer: answers[q.id] || "",
                correctAnswer: q.correctAnswer,
              })),
            })),
            totalCorrect,
            totalQuestions,
            band,
          } satisfies ReadingReviewData}
        />

        <Button onClick={() => router.push("/reading")} variant="brand" size="xl" className="w-full rounded-full">
          Làm session mới
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="rounded-2xl border bg-emerald-600 text-white p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6" />
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">IELTS Academic Reading</div>
            <div className="font-extrabold">Passage {activeTab + 1}/{passages.length}</div>
          </div>
        </div>
        <Badge variant="outline" className="bg-white/15 border-white/30 text-white text-base px-3 py-1">
          <Clock className="h-4 w-4 mr-1" /> {formatDuration(remaining)}
        </Badge>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {passages.map((p, i) => {
          const answered = p.questions.filter((q) => (answers[q.id] || "").trim()).length;
          return (
            <button
              key={p.id}
              onClick={() => setActiveTab(i)}
              className={cn(
                "shrink-0 rounded-full border-2 px-4 py-2 text-sm font-bold transition-all",
                activeTab === i
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card hover:border-primary/30",
              )}
            >
              Passage {i + 1}
              <span className="ml-2 text-xs opacity-70">({answered}/{p.questions.length})</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-7rem)] overflow-y-auto">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">{current.title}</h3>
              <Badge variant="outline">{current.level}</Badge>
            </div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{current.passage}</div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {current.questions.map((q, i) => {
            const userAns = answers[q.id] || "";
            return (
              <Card key={q.id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary">{i + 1}.</span>
                    <p className="font-medium flex-1">{q.prompt}</p>
                  </div>
                  {q.options ? (
                    <div className="space-y-2">
                      {q.options.map((opt) => (
                        <label
                          key={opt}
                          className={cn("flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer", userAns === opt && "border-primary bg-accent")}
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

          <div className="flex gap-2">
            {activeTab > 0 && (
              <Button variant="outline" onClick={() => setActiveTab(activeTab - 1)} className="flex-1">
                ← Passage trước
              </Button>
            )}
            {activeTab < passages.length - 1 ? (
              <Button onClick={() => setActiveTab(activeTab + 1)} variant="brand" className="flex-1 rounded-full">
                Passage tiếp →
              </Button>
            ) : (
              <Button onClick={handleSubmit} variant="brand" size="lg" className="flex-1 rounded-full">
                Nộp bài (tất cả 4 passage)
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
