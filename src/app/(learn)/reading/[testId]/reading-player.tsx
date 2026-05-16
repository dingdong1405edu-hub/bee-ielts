"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { formatDuration, cn } from "@/lib/utils";
import { TipsCard } from "@/components/learn/tips-card";
import { ReadingGroupHeader, groupStartFor } from "@/components/learn/reading-group-header";

type Q = {
  id: string;
  type: "MCQ" | "FILL_BLANK" | "TRUE_FALSE" | "TRUE_FALSE_NOT_GIVEN" | "MATCHING" | "MATCHING_HEADINGS" | "MATCHING_INFO" | "MATCHING_FEATURES" | "MATCHING_SENTENCE_ENDINGS" | "SHORT_ANSWER";
  prompt: string;
  options: string[] | null;
  correctAnswer: string;
  explanation: string | null;
};

export function ReadingPlayer({
  testId,
  title,
  passage,
  questions,
}: {
  testId: string;
  title: string;
  passage: string;
  questions: Q[];
}) {
  const router = useRouter();
  const startedAtRef = useRef<number>(Date.now());
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [elapsed, setElapsed] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Practise — đếm xuôi thời gian đã làm, không giới hạn, không tự nộp.
  useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [submitted]);

  const handleSubmit = async () => {
    if (submitted) return;
    setSubmitted(true);
    setSubmitting(true);
    const correctCount = questions.filter(
      (q) => (answers[q.id] || "").trim().toLowerCase() === q.correctAnswer.toLowerCase(),
    ).length;
    const score = (correctCount / questions.length) * 9;
    try {
      const durationSec = Math.floor((Date.now() - startedAtRef.current) / 1000);
      await fetch("/api/reading/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId, answers, correctCount, total: questions.length, durationSec }),
      });
      toast.success(`Bạn đúng ${correctCount}/${questions.length} — Band ~${score.toFixed(1)}`);
    } catch {
      toast.error("Lưu kết quả thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const correctCount = submitted
    ? questions.filter((q) => (answers[q.id] || "").trim().toLowerCase() === q.correctAnswer.toLowerCase()).length
    : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <button onClick={() => router.push("/reading")} className="text-sm text-muted-foreground hover:underline">
            ← Reading
          </button>
          <h1 className="text-xl md:text-2xl font-bold mt-1">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-base px-3 py-1">
            <Clock className="h-4 w-4 mr-1" /> Đã làm {formatDuration(elapsed)}
          </Badge>
          {!submitted && (
            <Button onClick={handleSubmit} disabled={submitting}>
              Nộp bài
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] overflow-y-auto">
          <CardContent className="p-6 prose prose-sm max-w-none">
            <h3 className="font-semibold text-lg mb-3">Passage</h3>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{passage}</div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {questions.map((q, i) => {
            const userAns = answers[q.id] || "";
            const isCorrect = userAns.trim().toLowerCase() === q.correctAnswer.toLowerCase();
            const groupStart = groupStartFor(questions, i);
            return (
              <div key={q.id}>
                {groupStart && (
                  <ReadingGroupHeader type={q.type} start={groupStart.start + 1} end={groupStart.end + 1} />
                )}
              <Card className={cn(submitted && (isCorrect ? "border-success" : "border-destructive"))}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary">{i + 1}.</span>
                    <p className="font-medium flex-1">{q.prompt}</p>
                    {submitted && (isCorrect ? <CheckCircle2 className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-destructive" />)}
                  </div>

                  {q.options ? (
                    <div className="space-y-2">
                      {q.options.map((opt) => (
                        <label
                          key={opt}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors",
                            !submitted && "hover:bg-accent",
                            userAns === opt && "border-primary bg-accent",
                            submitted && opt === q.correctAnswer && "border-success bg-success/10",
                            submitted && userAns === opt && opt !== q.correctAnswer && "border-destructive bg-destructive/10",
                          )}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            value={opt}
                            disabled={submitted}
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
                      disabled={submitted}
                      onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    />
                  )}

                  {submitted && !isCorrect && (
                    <div className="text-sm text-muted-foreground">
                      Đáp án đúng: <strong className="text-success">{q.correctAnswer}</strong>
                    </div>
                  )}
                </CardContent>
              </Card>
              </div>
            );
          })}

          {submitted && (
            <>
              <Card className="bg-accent">
                <CardContent className="p-5 text-center space-y-2">
                  <h3 className="text-xl font-bold">Kết quả</h3>
                  <p className="text-3xl font-bold text-primary">
                    {correctCount}/{questions.length}
                  </p>
                  <p className="text-muted-foreground">Band ước tính: {((correctCount / questions.length) * 9).toFixed(1)}</p>
                  <Button onClick={() => router.push("/reading")} className="mt-3">Về danh sách</Button>
                </CardContent>
              </Card>
              <TipsCard
                skill="READING"
                score={(correctCount / questions.length) * 9}
                context={`Reading: ${correctCount}/${questions.length} correct`}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
