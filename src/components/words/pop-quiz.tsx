"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { playCorrectSfx, playWrongSfx } from "@/lib/quiz-sfx";

type QuizCard = { term: string; answer: string; options: string[] };

// Pop quiz only appears on these "browsing" pages — never during an exercise.
const SAFE_PREFIXES = ["/dashboard", "/words", "/profile", "/community"];
const COOLDOWN_MS = 90_000;
const CHANCE = 0.35;

/** Surprise vocab quiz — occasionally asks the meaning of a random saved word. */
export function PopQuiz({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const lastRef = useRef(Date.now());
  const [quiz, setQuiz] = useState<QuizCard | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || quiz) return;
    if (!SAFE_PREFIXES.some((p) => pathname.startsWith(p))) return;
    const now = Date.now();
    if (now - lastRef.current < COOLDOWN_MS) return;
    if (Math.random() > CHANCE) return;
    lastRef.current = now;
    fetch("/api/words/random")
      .then((r) => r.json())
      .then((d) => {
        if (d.card && Array.isArray(d.card.options) && d.card.options.length >= 2) {
          setPicked(null);
          setQuiz(d.card as QuizCard);
        }
      })
      .catch(() => {});
  }, [pathname, enabled, quiz]);

  if (!quiz) return null;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-xl space-y-3">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl gradient-brand text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="font-extrabold leading-tight">Ôn bất chợt!</div>
            <div className="text-xs text-muted-foreground">Nghĩa của từ này là gì?</div>
          </div>
        </div>

        <div className="rounded-xl border bg-muted/30 p-4 text-center text-xl font-extrabold">
          {quiz.term}
        </div>

        <div className="space-y-2">
          {quiz.options.map((opt) => {
            const isAnswer = opt === quiz.answer;
            const isPicked = opt === picked;
            const answered = picked !== null;
            return (
              <button
                key={opt}
                disabled={answered}
                onClick={() => {
                  setPicked(opt);
                  if (opt === quiz.answer) playCorrectSfx();
                  else playWrongSfx();
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg border-2 p-3 text-left text-sm transition-colors",
                  !answered && "hover:border-primary/50",
                  answered && isAnswer && "border-success bg-success/10",
                  answered && isPicked && !isAnswer && "border-destructive bg-destructive/10",
                  !answered && "border-border",
                )}
              >
                <span className="flex-1">{opt}</span>
                {answered && isAnswer && <CheckCircle2 className="h-4 w-4 text-success" />}
                {answered && isPicked && !isAnswer && <XCircle className="h-4 w-4 text-destructive" />}
              </button>
            );
          })}
        </div>

        {picked !== null && (
          <div className="flex items-center justify-between gap-3">
            <span className={cn("text-sm font-bold", picked === quiz.answer ? "text-success" : "text-destructive")}>
              {picked === quiz.answer ? "Chính xác! 🎉" : "Chưa đúng — ôn lại nhé"}
            </span>
            <Button size="sm" className="rounded-full" onClick={() => setQuiz(null)}>
              Tiếp tục
            </Button>
          </div>
        )}
        {picked === null && (
          <button
            onClick={() => setQuiz(null)}
            className="w-full text-xs text-muted-foreground hover:underline"
          >
            Bỏ qua
          </button>
        )}
      </div>
    </div>
  );
}
