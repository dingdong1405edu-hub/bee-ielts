"use client";

import { useState, useCallback } from "react";
import { CheckCircle2, XCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { StudyCard } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type QuestionKind = "mcq" | "typing";

interface MCQQuestion {
  kind: "mcq";
  card: StudyCard;
  options: string[]; // 4 terms
  correctIndex: number;
}

interface TypingQuestion {
  kind: "typing";
  card: StudyCard;
}

type Question = MCQQuestion | TypingQuestion;

interface QuestionState {
  question: Question;
  /** Selected option index for MCQ, typed string for Typing */
  answer: string;
  graded: boolean;
  correct: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildTest(cards: StudyCard[]): Question[] {
  if (cards.length === 0) return [];

  const pool = shuffle(cards).slice(0, 10);
  const canMCQ = cards.length >= 4;

  return pool.map((card): Question => {
    const useMCQ = canMCQ && Math.random() < 0.5;

    if (useMCQ) {
      // pick 3 distractors from cards that are not this card
      const others = cards.filter((c) => c.id !== card.id);
      const distractors = shuffle(others)
        .slice(0, 3)
        .map((c) => c.term);
      const correctIndex = Math.floor(Math.random() * 4);
      const options = [...distractors];
      options.splice(correctIndex, 0, card.term);
      return { kind: "mcq", card, options, correctIndex };
    }

    return { kind: "typing", card };
  });
}

function initStates(questions: Question[]): QuestionState[] {
  return questions.map((q) => ({
    question: q,
    answer: "",
    graded: false,
    correct: false,
  }));
}

function gradeAll(states: QuestionState[]): QuestionState[] {
  return states.map((s) => {
    let correct = false;

    if (s.question.kind === "mcq") {
      const selectedIdx = parseInt(s.answer, 10);
      correct =
        !isNaN(selectedIdx) &&
        selectedIdx === s.question.correctIndex;
    } else {
      correct =
        s.answer.trim().toLowerCase() ===
        s.question.card.term.trim().toLowerCase();
    }

    return { ...s, graded: true, correct };
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MCQQuestion({
  state,
  index,
  onChange,
}: {
  state: QuestionState;
  index: number;
  onChange: (value: string) => void;
}) {
  const q = state.question as MCQQuestion;
  const selectedIdx =
    state.answer !== "" ? parseInt(state.answer, 10) : null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Câu {index + 1} · Trắc nghiệm
      </p>
      <p className="text-base font-semibold leading-snug">{q.card.definition}</p>

      <div className="space-y-2">
        {q.options.map((opt, i) => {
          const isSelected = selectedIdx === i;
          const isCorrect = state.graded && i === q.correctIndex;
          const isWrong =
            state.graded && isSelected && i !== q.correctIndex;

          return (
            <button
              key={i}
              type="button"
              disabled={state.graded}
              onClick={() => !state.graded && onChange(String(i))}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl border-2 transition-colors text-sm font-medium",
                !state.graded && isSelected &&
                  "border-primary bg-accent",
                !state.graded && !isSelected &&
                  "border-muted hover:border-primary/50 hover:bg-accent/40",
                state.graded && isCorrect &&
                  "border-green-500 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300",
                state.graded && isWrong &&
                  "border-red-500 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300",
                state.graded && !isCorrect && !isWrong &&
                  "border-muted opacity-60",
              )}
            >
              <span className="mr-2 opacity-50">{String.fromCharCode(65 + i)}.</span>
              {opt}
            </button>
          );
        })}
      </div>

      {state.graded && !state.correct && (
        <p className="text-sm text-muted-foreground">
          Đáp án đúng:{" "}
          <span className="font-semibold text-green-600 dark:text-green-400">
            {q.card.term}
          </span>
        </p>
      )}
    </div>
  );
}

function TypingQuestion({
  state,
  index,
  onChange,
}: {
  state: QuestionState;
  index: number;
  onChange: (value: string) => void;
}) {
  const q = state.question as TypingQuestion;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Câu {index + 1} · Điền từ
      </p>
      <p className="text-base font-semibold leading-snug">{q.card.definition}</p>

      <input
        type="text"
        disabled={state.graded}
        value={state.answer}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Nhập từ / cụm từ..."
        className={cn(
          "w-full rounded-xl border-2 px-4 py-3 text-sm font-medium outline-none transition-colors bg-background",
          !state.graded && "border-muted focus:border-primary",
          state.graded && state.correct &&
            "border-green-500 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300",
          state.graded && !state.correct &&
            "border-red-500 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300",
        )}
      />

      {state.graded && !state.correct && (
        <p className="text-sm text-muted-foreground">
          Đáp án đúng:{" "}
          <span className="font-semibold text-green-600 dark:text-green-400">
            {q.card.term}
          </span>
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function TestMode({ cards }: { cards: StudyCard[] }) {
  const [states, setStates] = useState<QuestionState[]>(() =>
    initStates(buildTest(cards))
  );
  const [submitted, setSubmitted] = useState(false);

  const score = submitted
    ? states.filter((s) => s.correct).length
    : null;

  const handleAnswer = useCallback((index: number, value: string) => {
    setStates((prev) =>
      prev.map((s, i) => (i === index ? { ...s, answer: value } : s))
    );
  }, []);

  const handleSubmit = useCallback(() => {
    setStates((prev) => gradeAll(prev));
    setSubmitted(true);
  }, []);

  const handleRetry = useCallback(() => {
    setStates(initStates(buildTest(cards)));
    setSubmitted(false);
  }, [cards]);

  // Empty state
  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <p className="text-4xl">📝</p>
        <p className="font-extrabold text-xl">Chưa có thẻ nào</p>
        <p className="text-muted-foreground text-sm">
          Thêm thẻ từ vựng để bắt đầu kiểm tra.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-extrabold text-2xl tracking-tight">Kiểm tra</h2>
        {submitted && (
          <Button variant="outline" size="sm" onClick={handleRetry} className="gap-2">
            <RotateCw className="h-4 w-4" />
            Làm lại
          </Button>
        )}
      </div>

      {/* Score panel */}
      {submitted && score !== null && (
        <Card className="rounded-2xl border-2">
          <CardContent className="py-5 flex items-center gap-4">
            {score === states.length ? (
              <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
            ) : (
              <XCircle className="h-8 w-8 text-red-500 shrink-0" />
            )}
            <div>
              <p className="font-extrabold text-2xl">
                {score} / {states.length}
              </p>
              <p className="text-sm text-muted-foreground">
                {score === states.length
                  ? "Hoàn hảo! Bạn trả lời đúng tất cả."
                  : score >= Math.ceil(states.length * 0.7)
                  ? "Tốt lắm! Hãy ôn lại các câu sai."
                  : "Cần ôn thêm. Thử lại nhé!"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {states.map((s, i) => (
          <Card
            key={i}
            className={cn(
              "rounded-2xl border-2 transition-colors",
              s.graded && s.correct && "border-green-200 dark:border-green-800",
              s.graded && !s.correct && "border-red-200 dark:border-red-800",
            )}
          >
            <CardContent className="py-5 space-y-1">
              {/* Graded badge */}
              {s.graded && (
                <div className="flex justify-end mb-1">
                  {s.correct ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              )}

              {s.question.kind === "mcq" ? (
                <MCQQuestion
                  state={s}
                  index={i}
                  onChange={(val) => handleAnswer(i, val)}
                />
              ) : (
                <TypingQuestion
                  state={s}
                  index={i}
                  onChange={(val) => handleAnswer(i, val)}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Submit button */}
      {!submitted && (
        <div className="flex justify-center pt-2">
          <Button
            size="lg"
            onClick={handleSubmit}
            className="min-w-40 font-extrabold text-base"
          >
            Nộp bài
          </Button>
        </div>
      )}

      {/* Bottom retry */}
      {submitted && (
        <div className="flex justify-center pt-2">
          <Button
            size="lg"
            variant="outline"
            onClick={handleRetry}
            className="min-w-40 gap-2 font-extrabold text-base"
          >
            <RotateCw className="h-5 w-5" />
            Làm lại
          </Button>
        </div>
      )}
    </div>
  );
}
