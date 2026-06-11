"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn, isAnswerCorrect } from "@/lib/utils";
import { TipsCard } from "@/components/learn/tips-card";
import { ReviewReport, type ListeningReviewData } from "@/components/learn/review-report";
import {
  ListeningShell,
  type ListeningPart,
  type ShellListeningQ,
} from "@/components/learn/listening-shell";

type Q = ShellListeningQ;

/**
 * Standalone Listening practice player. The body of the test renders via
 * the shared <ListeningShell> so the chrome (brand bar, audio strip,
 * floating arrows, part-nav strip) is identical to every other listening
 * surface. Post-submit we leave the full-screen shell and render the
 * results inline with the regular learn layout chrome.
 */
export function ListeningPlayer({
  testId,
  title,
  audioUrl,
  imageUrl,
  contentImageUrl,
  transcript,
  questions,
}: {
  testId: string;
  title: string;
  audioUrl: string;
  imageUrl?: string | null;
  contentImageUrl?: string | null;
  transcript: string | null;
  questions: Q[];
}) {
  const router = useRouter();
  const startedAtRef = useRef<number>(Date.now());
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [elapsed, setElapsed] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  // Practise — đếm xuôi thời gian đã làm, không giới hạn thời gian.
  useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [submitted]);

  const submit = async () => {
    setSubmitted(true);
    const correctCount = questions.filter(
      (q) => isAnswerCorrect(answers[q.id], q.correctAnswer, q.type),
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

  // Single-part practice. Continuous numbering starts at 1.
  const parts: ListeningPart[] = [
    {
      id: testId,
      index: 1,
      startNum: 1,
      title: "Part 1",
      audioUrl,
      transcript,
      contentImageUrl: contentImageUrl ?? imageUrl ?? null,
      questions,
      instructions:
        questions[0]?.type === "FILL_BLANK"
          ? "Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer."
          : null,
    },
  ];

  if (!submitted) {
    return (
      <ListeningShell
        title={title}
        brandName="Bee IELTS"
        parts={parts}
        activeIdx={0}
        onActiveIdxChange={() => {}}
        answers={answers}
        onChangeAnswer={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))}
        onSubmit={submit}
        elapsedSec={elapsed}
        remainingSec={null}
      />
    );
  }

  // ---- Post-submit view (regular learn layout) ----
  const correctCount = questions.filter(
    (q) => isAnswerCorrect(answers[q.id], q.correctAnswer, q.type),
  ).length;
  const band = (correctCount / questions.length) * 9;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Card className="bg-accent">
        <CardContent className="p-5 text-center space-y-2">
          <h3 className="text-xl font-bold">Kết quả</h3>
          <p className="text-3xl font-bold text-primary">
            {correctCount}/{questions.length}
          </p>
          <p className="text-muted-foreground">Band ước tính: {band.toFixed(1)}</p>
          <div className="flex justify-center gap-2 pt-2 flex-wrap">
            {transcript && (
              <Button variant="outline" onClick={() => setShowTranscript((s) => !s)}>
                {showTranscript ? "Ẩn" : "Xem"} transcript
              </Button>
            )}
            <Button onClick={() => router.push("/listening")}>Về danh sách</Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {questions.map((q, i) => {
          const userAns = answers[q.id] || "";
          const isCorrect = isAnswerCorrect(userAns, q.correctAnswer, q.type);
          return (
            <Card
              key={q.id}
              className={cn(isCorrect ? "border-success" : "border-destructive")}
            >
              <CardContent className="p-5 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-primary">{i + 1}.</span>
                  <p className="font-medium flex-1">{q.prompt}</p>
                  {isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                </div>
                <div className="text-sm text-muted-foreground ml-6">
                  Bạn chọn: <strong>{userAns || "—"}</strong>
                </div>
                {!isCorrect && (
                  <div className="text-sm ml-6">
                    Đáp án đúng:{" "}
                    <strong className="text-success">{q.correctAnswer}</strong>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {showTranscript && transcript && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold mb-2">Transcript</h3>
            <div className="whitespace-pre-wrap text-sm text-muted-foreground">{transcript}</div>
          </CardContent>
        </Card>
      )}

      <TipsCard
        skill="LISTENING"
        score={band}
        context={`User got ${correctCount}/${questions.length} questions correct on a listening test.`}
      />
      <ReviewReport
        data={{
          kind: "LISTENING",
          title,
          transcript: transcript ?? null,
          questions: questions.map((q) => ({
            prompt: q.prompt,
            type: q.type,
            userAnswer: answers[q.id] || "",
            correctAnswer: q.correctAnswer,
          })),
          totalCorrect: correctCount,
          totalQuestions: questions.length,
          band,
        } satisfies ListeningReviewData}
      />
    </div>
  );
}
