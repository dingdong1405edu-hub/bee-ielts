"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Trophy, Sparkles } from "lucide-react";
import { cn, isAnswerCorrect } from "@/lib/utils";
import { TipsCard } from "@/components/learn/tips-card";
import { ReviewReport, type ReadingReviewData } from "@/components/learn/review-report";
import { ReadingShell, type ShellPart, type ShellQ } from "@/components/learn/reading-shell";
import { ReadingSolutions } from "@/components/learn/reading-solutions";
import { ReadingComments } from "@/components/learn/reading-comments";
import { MotivationalCard } from "@/components/learn/motivational-card";
import { Honeycomb, Leaf, MascotBubble } from "@/components/brand";

interface Passage {
  id: string;
  title: string;
  level: string;
  passage: string;
  imageUrl?: string | null;
  questions: ShellQ[];
}

const SESSION_SECONDS = 60 * 60;

export function ReadingSession({ passages, targetBand = 6.0 }: { passages: Passage[]; targetBand?: number }) {
  const router = useRouter();
  const startedAtRef = useRef<number>(Date.now());
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [showSolutions, setShowSolutions] = useState(false);

  const handleSubmit = async (finalAnswers: Record<string, string>) => {
    if (submitted) return;
    setSubmitted(true);
    setAnswers(finalAnswers);
    const durationSec = Math.floor((Date.now() - startedAtRef.current) / 1000);

    let totalCorrect = 0;
    let totalQuestions = 0;

    for (const p of passages) {
      const c = p.questions.filter(
        (q) => isAnswerCorrect(finalAnswers[q.id], q.correctAnswer, q.type),
      ).length;
      totalCorrect += c;
      totalQuestions += p.questions.length;
      try {
        await fetch("/api/reading/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testId: p.id,
            answers: Object.fromEntries(p.questions.map((q) => [q.id, finalAnswers[q.id] || ""])),
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

  if (!submitted) {
    const shellParts: ShellPart[] = passages.map((p) => ({
      id: p.id,
      title: p.title,
      level: p.level,
      passage: p.passage,
      imageUrl: p.imageUrl,
      questions: p.questions,
    }));
    const label = passages.length > 1 ? `${passages.length} Passages` : "Practise";
    return (
      <ReadingShell
        testTitle={`Reading · ${label}`}
        parts={shellParts}
        timeLimit={SESSION_SECONDS}
        onSubmit={handleSubmit}
        countUp
      />
    );
  }

  const totalCorrect = passages.reduce(
    (sum, p) =>
      sum +
      p.questions.filter((q) => isAnswerCorrect(answers[q.id], q.correctAnswer, q.type)).length,
    0,
  );
  const totalQuestions = passages.reduce((sum, p) => sum + p.questions.length, 0);
  const band = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 9 : 0;
  const current = passages[activeTab];

  return (
    <div className="max-w-3xl mx-auto space-y-4 p-4 md:p-6">
      <div className="relative overflow-hidden text-center space-y-2 py-2">
        <Honeycomb className="pointer-events-none absolute inset-0 text-[#4F7A66]/[0.05]" />
        <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl gradient-brand text-white shadow-lg shadow-primary/30">
          <Trophy className="h-8 w-8" />
        </div>
        <h1 className="relative flex items-center justify-center gap-2 text-3xl font-extrabold tracking-tight">
          <Leaf className="h-4 w-4 text-leaf" />
          Hoàn thành Reading 🎉
        </h1>
      </div>

      <MascotBubble tone="tip" className="justify-center">
        Tuyệt vời! Xem lại đáp án để lên band nhanh hơn nhé.
      </MascotBubble>

      <Card className="bg-gradient-to-br from-primary/10 to-accent border-2 border-primary/20">
        <CardContent className="p-8 text-center">
          <div className="text-sm text-muted-foreground">Reading Band</div>
          <div className="text-6xl font-extrabold gradient-brand-text mt-2">{band.toFixed(1)}</div>
          <div className="text-sm text-muted-foreground mt-2">
            {totalCorrect}/{totalQuestions} câu đúng · Mục tiêu: Band {targetBand.toFixed(1)}
          </div>
        </CardContent>
      </Card>

      <MotivationalCard currentBand={band} targetBand={targetBand} />

      <div className="space-y-2">
        {passages.map((p, i) => {
          const c = p.questions.filter(
            (q) => isAnswerCorrect(answers[q.id], q.correctAnswer, q.type),
          ).length;
          return (
            <Card key={p.id} className="cursor-pointer hover:shadow-md" onClick={() => setActiveTab(i)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Part {i + 1}</div>
                  <div className="font-semibold">{p.title}</div>
                </div>
                <div className="text-lg font-bold text-primary">
                  {c}/{p.questions.length}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-5">
          <h3 className="font-bold mb-3">
            Đáp án — Part {activeTab + 1}: {current.title}
          </h3>
          <div className="space-y-2">
            {current.questions.map((q, i) => {
              const ua = answers[q.id] || "";
              const ok = isAnswerCorrect(ua, q.correctAnswer, q.type);
              const num = q.displayNumber ?? i + 1;
              return (
                <div key={q.id} className={cn("rounded-lg border p-3 text-sm", ok ? "border-success bg-success/5" : "border-destructive bg-destructive/5")}>
                  <div className="flex items-start gap-2">
                    <span className="font-bold">{num}.</span>
                    <span className="flex-1">{q.prompt}</span>
                    {ok ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
                  </div>
                  <div className="mt-1 ml-6">
                    Của bạn:{" "}
                    <span className={ok ? "text-success font-semibold" : "text-destructive line-through"}>
                      {ua || "(trống)"}
                    </span>
                    {!ok && (
                      <>
                        {" "}
                        · Đúng: <span className="text-success font-semibold">{q.correctAnswer}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Xem lời giải chi tiết — call AI to explain each question */}
      <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/30">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl gradient-brand text-white shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold">Lời giải chi tiết</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Xem đoạn nào trong bài chứa đáp án, bản dịch tiếng Việt, và lý do chọn đáp án đó.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowSolutions((v) => !v)}
            variant={showSolutions ? "outline" : "brand"}
            className="w-full mt-3 rounded-full"
          >
            {showSolutions ? "Đóng lời giải" : "Xem lời giải chi tiết"}
          </Button>
        </CardContent>
      </Card>

      {showSolutions && (
        <ReadingSolutions
          passages={passages.map((p) => ({
            id: p.id,
            title: p.title,
            passage: p.passage,
            questions: p.questions.map((q) => ({
              id: q.id,
              type: q.type,
              prompt: q.prompt,
              options: q.options ?? null,
              correctAnswer: q.correctAnswer,
            })),
          }))}
          answers={answers}
        />
      )}

      <TipsCard skill="READING" score={band} context={`Reading session: ${totalCorrect}/${totalQuestions} correct across ${passages.length} passages`} />

      {/* Comment section under each reading passage */}
      {passages.map((p) => (
        <div key={p.id} className="space-y-1">
          {passages.length > 1 && (
            <p className="text-xs font-bold text-muted-foreground px-1">{p.title}</p>
          )}
          <ReadingComments testId={p.id} />
        </div>
      ))}

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
