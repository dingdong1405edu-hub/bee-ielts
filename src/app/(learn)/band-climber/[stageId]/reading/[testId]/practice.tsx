"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Clock, Lightbulb, TrendingUp, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDuration, isAnswerCorrect } from "@/lib/utils";
import { groupQuestions, FormBlanks, MultiSelectQuestion } from "@/components/learn/form-blanks";
import { ReadingGroupHeader, groupStartFor } from "@/components/learn/reading-group-header";
import { ReadingSolutions } from "@/components/learn/reading-solutions";
import { BeeGuide, type TourStep } from "@/components/learn/bee-guide";

type Q = {
  id: string;
  type:
    | "MCQ"
    | "FILL_BLANK"
    | "TRUE_FALSE"
    | "TRUE_FALSE_NOT_GIVEN"
    | "MATCHING"
    | "MATCHING_HEADINGS"
    | "MATCHING_INFO"
    | "MATCHING_FEATURES"
    | "MATCHING_SENTENCE_ENDINGS"
    | "SHORT_ANSWER";
  prompt: string;
  options: string[] | null;
  correctAnswer: string;
  explanation: string | null;
  formGroup?: string | null;
};

interface Stage {
  id: string;
  fromBand: number;
  toBand: number;
  title: string;
  subtitle: string | null;
}

interface TestPayload {
  id: string;
  title: string;
  passage: string;
  imageUrl: string | null;
  questions: Q[];
}

/** Steps used for the 4→5 sample. Order matches the tip order in the brief. */
const TOUR_STEPS: TourStep[] = [
  {
    target: "center",
    title: "Chào! Mình là Bee 🐝",
    body:
      "Trước khi vào làm bài Reading vượt band 4→5, mình chỉ bạn 2 mẹo siêu quan trọng.\n\nLàm theo là điểm tăng thấy rõ — không cần đọc hết cả bài!",
    ctaLabel: "OK, chỉ mình",
  },
  {
    target: "passage",
    title: "Mẹo 1 — Săn từ neo cứng",
    body:
      "Đừng cố dịch cả đoạn. Quét mắt theo đường ziczac trong bài đọc, chỉ tìm các \"từ neo\" không thể paraphrase. Đáp án luôn nằm sát các từ này 1-2 câu.",
    highlights: [
      {
        label: "Ví dụ từ neo trong bài này",
        items: ["60,000", "1851", "9 millimetres", "Karl von Frisch", "1973", "Australia", "1822", "“waggle dance”", "2006"],
      },
    ],
  },
  {
    target: "questions",
    title: "Mẹo 2 — Làm dạng theo thứ tự trước",
    body:
      "Câu hỏi T/F/Not Given, Fill the blank và Short Answer luôn xuất hiện theo thứ tự bài đọc. Đây là 'kho điểm dễ' — ăn trước!",
  },
  {
    target: "matching",
    title: "Cảnh báo — Matching Headings để CUỐI",
    body:
      "Dạng Nối tiêu đề ngốn nhiều thời gian vì câu hỏi không đi tuần tự. Mẹo: bỏ qua, làm hết các dạng order-based, rồi quay lại.\n\nTrong đề này có 2 câu Matching ở cuối — đúng thứ tự bạn nên làm.",
  },
  {
    target: "center",
    title: "Sẵn sàng bay chưa?",
    body:
      "Bấm 'Bắt đầu' và áp dụng 2 mẹo trên. Sau khi nộp bài, mình sẽ phân tích từng câu sai và chỉ rõ 'từ neo' bạn lẽ ra nên thấy.",
    ctaLabel: "Bắt đầu",
  },
];

export function BandClimbReadingPractice({
  stage,
  test,
  bandClimbContext,
}: {
  stage: Stage;
  test: TestPayload;
  bandClimbContext: string;
}) {
  const router = useRouter();
  const [tourOpen, setTourOpen] = useState(true);
  const startedAtRef = useRef<number>(Date.now());
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [elapsed, setElapsed] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (submitted) return;
    if (tourOpen) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [submitted, tourOpen]);

  // Re-anchor the start clock once the tour closes so the time spent in the
  // tour doesn't count against the learner's reading clock.
  useEffect(() => {
    if (!tourOpen) startedAtRef.current = Date.now();
  }, [tourOpen]);

  const handleSubmit = async () => {
    if (submitted) return;
    setSubmitted(true);
    setSubmitting(true);
    const correctCount = test.questions.filter((q) =>
      isAnswerCorrect(answers[q.id], q.correctAnswer, q.type),
    ).length;
    const score = (correctCount / test.questions.length) * 9;
    try {
      const durationSec = Math.floor((Date.now() - startedAtRef.current) / 1000);
      await fetch("/api/reading/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId: test.id,
          answers,
          correctCount,
          total: test.questions.length,
          durationSec,
        }),
      });
      toast.success(
        `Bạn đúng ${correctCount}/${test.questions.length} — Band ước tính ~${score.toFixed(1)}`,
      );
    } catch {
      toast.error("Lưu kết quả thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const correctCount = submitted
    ? test.questions.filter((q) => isAnswerCorrect(answers[q.id], q.correctAnswer, q.type)).length
    : 0;

  // First MATCHING_HEADINGS question id — the tour points at this card.
  const firstMatchingId = test.questions.find((q) =>
    q.type.startsWith("MATCHING"),
  )?.id;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {tourOpen && (
        <BeeGuide steps={TOUR_STEPS} onFinish={() => setTourOpen(false)} />
      )}

      <Card className="bg-gradient-to-br from-primary/10 to-accent border-2 border-primary/20">
        <CardContent className="p-4 md:p-5 flex flex-wrap items-center gap-3">
          <Link
            href={`/band-climber/${stage.id}`}
            className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Về chặng
          </Link>
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl gradient-brand text-white shadow-md shadow-primary/20">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-xl font-extrabold truncate">{test.title}</h1>
            <p className="text-xs md:text-sm text-muted-foreground truncate">
              {stage.title}
              {stage.subtitle ? ` · ${stage.subtitle}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="text-sm px-2 py-1">
              <Clock className="h-3.5 w-3.5 mr-1" /> {formatDuration(elapsed)}
            </Badge>
            {!submitted && (
              <Button onClick={handleSubmit} disabled={submitting} size="sm">
                Nộp bài
              </Button>
            )}
            {!submitted && !tourOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTourOpen(true)}
                className="text-xs"
              >
                <Lightbulb className="h-3.5 w-3.5" /> Mở mẹo
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {!submitted ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card
            data-tour="passage"
            className="lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] overflow-y-auto"
          >
            <CardContent className="p-6 prose prose-sm max-w-none">
              <h3 className="font-semibold text-lg mb-3">Passage</h3>
              {test.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={test.imageUrl}
                  alt=""
                  className="not-prose mb-4 w-full rounded-lg border bg-muted/30 object-contain max-h-80"
                />
              )}
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{test.passage}</div>
            </CardContent>
          </Card>

          <div data-tour="questions" className="space-y-4">
            {groupQuestions(test.questions).map((unit) => {
              if (unit.kind === "form") {
                const end = unit.startNum + unit.items.length - 1;
                return (
                  <div key={`fg-${unit.items[0].id}`}>
                    <ReadingGroupHeader type="FILL_BLANK" start={unit.startNum} end={end} />
                    <Card>
                      <CardContent className="p-5">
                        <FormBlanks
                          items={unit.items}
                          startNum={unit.startNum}
                          answers={answers}
                          onChange={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))}
                          disabled={submitted}
                          submitted={submitted}
                        />
                      </CardContent>
                    </Card>
                  </div>
                );
              }
              if (unit.kind === "multi") {
                const q = unit.q;
                return (
                  <Card key={q.id}>
                    <CardContent className="p-5">
                      <MultiSelectQuestion
                        q={q}
                        num={unit.num}
                        value={answers[q.id] || ""}
                        onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                        disabled={submitted}
                        submitted={submitted}
                      />
                    </CardContent>
                  </Card>
                );
              }
              const q = unit.q;
              const i = unit.num - 1;
              const userAns = answers[q.id] || "";
              const groupStart = groupStartFor(test.questions, i);
              const isFirstMatching = q.id === firstMatchingId;
              return (
                <div key={q.id} data-tour={isFirstMatching ? "matching" : undefined}>
                  {groupStart && (
                    <ReadingGroupHeader
                      type={q.type}
                      start={groupStart.start + 1}
                      end={groupStart.end + 1}
                    />
                  )}
                  <Card>
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
                              className={cn(
                                "flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors hover:bg-accent",
                                userAns === opt && "border-primary bg-accent",
                              )}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                value={opt}
                                checked={userAns === opt}
                                onChange={(e) =>
                                  setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                                }
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
                          onChange={(e) =>
                            setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                          }
                        />
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="bg-accent">
            <CardContent className="p-5 text-center space-y-2">
              <h3 className="text-xl font-bold">Kết quả</h3>
              <p className="text-3xl font-bold text-primary">
                {correctCount}/{test.questions.length}
              </p>
              <p className="text-muted-foreground">
                Band ước tính:{" "}
                {((correctCount / test.questions.length) * 9).toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Cuộn xuống xem Bee chỉ rõ từng câu sai — kèm mẹo "săn từ neo" áp dụng cho đề này.
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <Button variant="outline" onClick={() => router.push(`/band-climber/${stage.id}`)}>
                  Về chặng
                </Button>
                <Button onClick={() => router.refresh()}>Làm lại</Button>
              </div>
            </CardContent>
          </Card>

          <SubmittedSummary
            questions={test.questions}
            answers={answers}
          />

          <ReadingSolutions
            passages={[
              {
                id: test.id,
                title: test.title,
                passage: test.passage,
                questions: test.questions.map((q) => ({
                  id: q.id,
                  type: q.type,
                  prompt: q.prompt,
                  options: q.options,
                  correctAnswer: q.correctAnswer,
                })),
              },
            ]}
            answers={answers}
            bandClimbContext={bandClimbContext}
          />
        </div>
      )}
    </div>
  );
}

/** Compact correct/wrong list shown right under the score card. */
function SubmittedSummary({
  questions,
  answers,
}: {
  questions: Q[];
  answers: Record<string, string>;
}) {
  return (
    <Card>
      <CardContent className="p-5 space-y-2">
        <h4 className="font-bold">Tổng quan từng câu</h4>
        <ul className="space-y-1.5">
          {questions.map((q, i) => {
            const ok = isAnswerCorrect(answers[q.id], q.correctAnswer, q.type);
            return (
              <li key={q.id} className="flex items-start gap-2 text-sm">
                {ok ? (
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-success shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                )}
                <span className="font-semibold">{i + 1}.</span>
                <span className="flex-1 line-clamp-1">{q.prompt}</span>
                <span
                  className={cn(
                    "text-xs font-bold shrink-0",
                    ok ? "text-success" : "text-destructive",
                  )}
                >
                  {ok ? "Đúng" : "Sai"}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
