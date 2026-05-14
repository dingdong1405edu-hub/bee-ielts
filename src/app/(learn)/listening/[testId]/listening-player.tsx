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

type Q = {
  id: string;
  type: "MCQ" | "FILL_BLANK" | "TRUE_FALSE" | "MATCHING" | "SHORT_ANSWER";
  prompt: string;
  options: string[] | null;
  correctAnswer: string;
};

export function ListeningPlayer({
  testId,
  title,
  audioUrl,
  transcript,
  timeLimit,
  questions,
}: {
  testId: string;
  title: string;
  audioUrl: string;
  transcript: string | null;
  timeLimit: number;
  questions: Q[];
}) {
  const router = useRouter();
  const startedAtRef = useRef<number>(Date.now());
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState(timeLimit);
  const [submitted, setSubmitted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [submitted]);

  const submit = async () => {
    setSubmitted(true);
    const correctCount = questions.filter(
      (q) => (answers[q.id] || "").trim().toLowerCase() === q.correctAnswer.toLowerCase(),
    ).length;
    const band = (correctCount / questions.length) * 9;
    try {
      const durationSec = Math.floor((Date.now() - startedAtRef.current) / 1000);
      await fetch("/api/listening/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId, answers, correctCount, total: questions.length, durationSec }),
      });
      toast.success(`Đúng ${correctCount}/${questions.length} — Band ~${band.toFixed(1)}`);
    } catch {
      toast.error("Lưu kết quả thất bại");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <button onClick={() => router.push("/listening")} className="text-sm text-muted-foreground hover:underline">
            ← Listening
          </button>
          <h1 className="text-xl md:text-2xl font-bold mt-1">{title}</h1>
        </div>
        <Badge variant={remaining < 60 ? "destructive" : "outline"} className="text-base px-3 py-1">
          <Clock className="h-4 w-4 mr-1" /> {formatDuration(remaining)}
        </Badge>
      </div>

      <Card>
        <CardContent className="p-5 space-y-3">
          <audio controls src={audioUrl} className="w-full" preload="metadata">
            Audio not supported.
          </audio>
          <p className="text-xs text-muted-foreground">
            Mẹo: bạn có thể điều chỉnh tốc độ trong menu của trình phát (3 chấm).
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {questions.map((q, i) => {
          const userAns = answers[q.id] || "";
          const isCorrect = userAns.trim().toLowerCase() === q.correctAnswer.toLowerCase();
          return (
            <Card key={q.id} className={cn(submitted && (isCorrect ? "border-success" : "border-destructive"))}>
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
                          "flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer",
                          userAns === opt && "border-primary bg-accent",
                          submitted && opt === q.correctAnswer && "border-success bg-success/10",
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
                    Đáp án: <strong className="text-success">{q.correctAnswer}</strong>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-3 justify-end">
        {!submitted ? (
          <Button size="lg" onClick={submit}>Nộp bài</Button>
        ) : (
          <>
            {transcript && (
              <Button variant="outline" onClick={() => setShowTranscript((s) => !s)}>
                {showTranscript ? "Ẩn" : "Xem"} transcript
              </Button>
            )}
            <Button onClick={() => router.push("/listening")}>Về danh sách</Button>
          </>
        )}
      </div>

      {submitted && showTranscript && transcript && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold mb-2">Transcript</h3>
            <div className="whitespace-pre-wrap text-sm text-muted-foreground">{transcript}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
