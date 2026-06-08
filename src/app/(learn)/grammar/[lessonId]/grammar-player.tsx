"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, X, BookOpenText, Trophy, Play, Sparkles, ArrowRight, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { renderMarkdown } from "@/lib/markdown";
import { TipsCard } from "@/components/learn/tips-card";
import { BeeMascot } from "@/components/brand";

type FillExercise = { type: "fill"; prompt: string; answer: string };

export function GrammarPlayer({
  lessonId,
  title,
  unitTitle,
  content,
  exercises,
}: {
  lessonId: string;
  title: string;
  unitTitle: string;
  content: string;
  exercises: FillExercise[];
}) {
  const router = useRouter();
  const startedAtRef = useRef<number>(Date.now());
  const [stage, setStage] = useState<"intro" | "lesson" | "done">("intro");
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  const current = exercises[idx];
  const progressValue = (idx / exercises.length) * 100;

  // Build options for the current fill: correct answer + 3 random distractors from other answers
  const options = useDistractorOptions(current?.answer, exercises);

  const check = (chosen: string) => {
    const correct = chosen.trim().toLowerCase() === current.answer.toLowerCase();
    setInput(chosen);
    setFeedback(correct ? "correct" : "wrong");
    if (correct) setCorrectCount((c) => c + 1);
    else setHearts((h) => Math.max(0, h - 1));
  };

  const next = async () => {
    setFeedback(null);
    setInput("");
    if (idx + 1 < exercises.length) {
      setIdx(idx + 1);
      return;
    }
    setStage("done");
    setSubmitting(true);
    const durationSec = Math.floor((Date.now() - startedAtRef.current) / 1000);
    try {
      await fetch("/api/grammar/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          correctCount: correctCount + (feedback === "correct" ? 1 : 0),
          total: exercises.length,
          durationSec,
        }),
      });
    } catch (e) {
      console.error(e);
      toast.error("Lưu thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  if (stage === "intro") {
    return (
      <div className="max-w-xl mx-auto py-6 space-y-6">
        <button onClick={() => router.push("/grammar")} className="text-sm text-muted-foreground hover:underline">
          ← {unitTitle}
        </button>
        <div className="text-center space-y-3">
          <div className="relative mx-auto">
            <BeeMascot priority className="mx-auto w-24 animate-float" />
            <div className="absolute -top-2 -right-2 grid h-8 w-8 place-items-center rounded-full gradient-brand text-white shadow-md">
              <BookOpenText className="h-4 w-4" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Luyện tập <span className="gradient-brand-text">Grammar</span>
          </h1>
          <p className="text-muted-foreground">{title}</p>
        </div>

        <div className="rounded-3xl border bg-card p-6">
          <div className="text-sm text-muted-foreground mb-3 font-semibold tracking-wider uppercase">Lý thuyết</div>
          <div className="text-[15px] text-foreground">{renderMarkdown(content)}</div>
        </div>

        <div className="rounded-2xl border-2 border-dashed bg-accent/30 p-4 text-sm space-y-1.5">
          <div className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> Cách chơi
          </div>
          <p>• {exercises.length} câu, mỗi câu chọn đáp án đúng</p>
          <p>• Có 3 hearts ❤️ — sai 1 câu mất 1 heart</p>
          <p>• Đáp đúng ngay sẽ thấy feedback và XP</p>
        </div>

        <Button onClick={() => setStage("lesson")} variant="brand" size="xl" className="w-full rounded-full">
          Bắt đầu làm bài <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  if (stage === "done") {
    const score = Math.round((correctCount / exercises.length) * 100);
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-10">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mx-auto grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-gold-400 to-gold-500 text-white shadow-xl shadow-gold-500/30"
        >
          <Trophy className="h-12 w-12" />
        </motion.div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Hoàn thành! 🎉</h1>
          <p className="text-muted-foreground mt-1">
            Đúng <span className="text-success font-bold">{correctCount}/{exercises.length}</span> · {score}/100 điểm
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border p-3">
            <div className="text-2xl font-extrabold gradient-brand-text">{score}</div>
            <div className="text-xs text-muted-foreground">Điểm</div>
          </div>
          <div className="rounded-2xl border p-3">
            <div className="text-2xl font-extrabold text-sage-500">+{correctCount * 5}</div>
            <div className="text-xs text-muted-foreground">XP</div>
          </div>
          <div className="rounded-2xl border p-3">
            <div className="text-2xl font-extrabold text-rose-500">{hearts}</div>
            <div className="text-xs text-muted-foreground">Hearts</div>
          </div>
        </div>

        <TipsCard skill="GRAMMAR" score={(correctCount / exercises.length) * 9} context={`Grammar "${title}": ${correctCount}/${exercises.length} correct`} />

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push("/grammar")} className="flex-1 rounded-full">
            Về list
          </Button>
          <Button onClick={() => router.push("/dashboard")} disabled={submitting} className="flex-1 rounded-full" variant="brand">
            Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/grammar")}
          className="text-2xl text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          ✕
        </button>
        <div className="flex-1">
          <Progress value={progressValue} className="h-3" />
        </div>
        <div className="flex items-center gap-1.5 text-rose-500 font-bold">
          <Heart className="h-5 w-5 fill-rose-500" />
          <span className="text-base">{hearts}</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="space-y-6"
        >
          <div className="text-center">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">
              Câu {idx + 1} / {exercises.length}
            </div>
            <h2 className="text-2xl font-extrabold leading-tight">Điền từ thích hợp vào chỗ trống</h2>
          </div>

          <div className="flex items-end gap-3">
            <BeeMascot className="w-14 shrink-0" />
            <div
              className={cn(
                "relative flex-1 rounded-3xl border-2 bg-card p-5 text-center text-xl font-bold leading-relaxed",
                "before:content-[''] before:absolute before:-left-2 before:bottom-4 before:h-4 before:w-4 before:rotate-45 before:bg-card before:border-l-2 before:border-b-2 before:border-[inherit]",
                feedback === "wrong" && "animate-shake border-destructive",
              )}
            >
              {current.prompt.split(/(_+)/).map((part, i) =>
                /_+/.test(part) ? (
                  <span key={i} className="inline-block min-w-[3em] border-b-2 border-primary mx-1 text-primary">
                    {input && feedback ? input : "____"}
                  </span>
                ) : (
                  <span key={i}>{part}</span>
                ),
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {options.map((opt) => {
              const isPicked = input === opt;
              const isCorrectOpt = opt.toLowerCase() === current.answer.toLowerCase();
              return (
                <button
                  key={opt}
                  onClick={() => !feedback && check(opt)}
                  disabled={feedback !== null}
                  className={cn(
                    "rounded-2xl border-2 px-4 py-4 text-base font-bold transition-all",
                    "shadow-[0_4px_0_0_hsl(var(--border))] active:translate-y-1 active:shadow-[0_0_0_0_hsl(var(--border))]",
                    !feedback && "hover:border-primary/40 hover:bg-accent",
                    feedback && isCorrectOpt && "border-success bg-success/10 text-success",
                    feedback && isPicked && !isCorrectOpt && "border-destructive bg-destructive/10 text-destructive",
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {feedback && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={cn(
            "fixed bottom-0 inset-x-0 z-40 border-t-2 p-5 pb-8 md:pb-5",
            feedback === "correct" ? "bg-success/10 border-success" : "bg-destructive/10 border-destructive",
          )}
        >
          <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-full text-white",
                  feedback === "correct" ? "bg-success" : "bg-destructive",
                )}
              >
                {feedback === "correct" ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
              </div>
              <div>
                <div className={cn("text-lg font-extrabold", feedback === "correct" ? "text-success" : "text-destructive")}>
                  {feedback === "correct" ? "Chuẩn rồi! 🎯" : "Chưa đúng"}
                </div>
                <div className="text-sm font-semibold">
                  Đáp án: <span className={feedback === "correct" ? "text-success" : "text-success"}>{current.answer}</span>
                </div>
              </div>
            </div>
            <Button onClick={next} variant={feedback === "correct" ? "success" : "destructive"} size="lg" className="rounded-full">
              Tiếp →
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function useDistractorOptions(answer: string | undefined, exercises: FillExercise[]): string[] {
  if (!answer) return [];
  // gather all unique answers from this lesson
  const pool = Array.from(new Set(exercises.map((e) => e.answer).filter((a) => a !== answer)));
  // pick up to 3 random distractors
  const distractors: string[] = [];
  const copy = [...pool];
  while (distractors.length < 3 && copy.length > 0) {
    distractors.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  while (distractors.length < 3) {
    // fallback if not enough — duplicate the answer is bad; insert a placeholder
    distractors.push("—");
  }
  // shuffle answer + distractors deterministically per call
  const arr = [answer, ...distractors];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
