"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Check, X, Sparkles, Trophy } from "lucide-react";
import {Leaf, MascotBubble, BeeMascot } from "@/components/brand";
import { cn } from "@/lib/utils";

type Exercise =
  | { type: "translate"; prompt: string; options: string[]; answer: string }
  | { type: "match"; prompt: string; options: string[]; answer: string }
  | { type: "type"; prompt: string; answer: string };

export function LessonPlayer({
  lessonId,
  title,
  unitTitle,
  exercises,
}: {
  lessonId: string;
  title: string;
  unitTitle: string;
  exercises: Exercise[];
}) {
  const router = useRouter();
  const startedAtRef = useRef<number>(Date.now());
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string>("");
  const [typed, setTyped] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const current = exercises[idx];
  const progressValue = (idx / exercises.length) * 100;

  const check = () => {
    let userAnswer = "";
    if (current.type === "type") userAnswer = typed.trim().toLowerCase();
    else userAnswer = selected;

    const correct =
      current.type === "type"
        ? userAnswer === current.answer.toLowerCase()
        : userAnswer === current.answer;

    setFeedback(correct ? "correct" : "wrong");
    if (correct) setCorrectCount((c) => c + 1);
    else setWrongCount((w) => w + 1);
  };

  const next = async () => {
    setFeedback(null);
    setSelected("");
    setTyped("");
    if (idx + 1 < exercises.length) {
      setIdx(idx + 1);
    } else {
      setDone(true);
      setSubmitting(true);
      try {
        const durationSec = Math.floor((Date.now() - startedAtRef.current) / 1000);
        const res = await fetch("/api/vocab/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId,
            score: Math.round((correctCount / exercises.length) * 100),
            totalCorrect: correctCount + (feedback === "correct" ? 1 : 0),
            total: exercises.length,
            durationSec,
          }),
        });
        const data = await res.json().catch(() => ({}));
        const { triggerUnlocksFromResponse } = await import(
          "@/lib/achievements/client-trigger"
        );
        triggerUnlocksFromResponse(data);
      } catch (e) {
        console.error(e);
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (done) {
    const score = Math.round((correctCount / exercises.length) * 100);
    return (
      <div className="max-w-md mx-auto text-center space-y-6 mt-12">
        <BeeMascot className="w-16 mx-auto" />
        <div className="grid h-20 w-20 place-items-center rounded-full bg-success text-white mx-auto">
          <Trophy className="h-10 w-10" />
        </div>
        <div>
          <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
            <Leaf className="h-5 w-5 text-leaf" />
            Hoàn thành! 🎉
          </h1>
          <p className="text-muted-foreground mt-1">
            Bạn trả lời đúng {correctCount}/{exercises.length} câu — điểm {score}/100
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => router.push("/vocab")}>Về danh sách</Button>
          <Button onClick={() => router.push("/dashboard")} disabled={submitting}>Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="relative overflow-hidden rounded-xl">
        
        <div className="relative space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <button onClick={() => router.push("/vocab")} className="hover:underline">
              ← {unitTitle}
            </button>
            <span>
              {idx + 1}/{exercises.length}
            </span>
          </div>
          <Progress value={progressValue} />
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-honey-deep" />
            {title}
            <Leaf className="h-4 w-4 text-leaf" />
          </h1>
        </div>
      </div>

      {idx === 0 && feedback === null && (
        <MascotBubble tone="tip">Cố lên! Mỗi từ mới là một bước tiến — bắt đầu thôi nào!</MascotBubble>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={cn(
            "rounded-xl border bg-card p-6 space-y-5",
            feedback === "wrong" && "animate-shake border-destructive",
          )}
        >
          <p className="text-lg font-medium">{current.prompt}</p>

          {current.type === "type" ? (
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Nhập câu trả lời..."
              disabled={feedback !== null}
              autoFocus
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {current.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setSelected(opt)}
                  disabled={feedback !== null}
                  className={cn(
                    "rounded-lg border-2 px-4 py-3 text-left transition-all",
                    selected === opt
                      ? feedback === "correct" && opt === current.answer
                        ? "border-success bg-success/10"
                        : feedback === "wrong"
                          ? "border-destructive bg-destructive/10"
                          : "border-primary bg-accent"
                      : "border-border hover:border-muted-foreground",
                    feedback === "correct" && opt === current.answer && "border-success bg-success/10",
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {feedback && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                "flex items-center gap-2 rounded-lg p-3",
                feedback === "correct" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
              )}
            >
              {feedback === "correct" ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
              <div>
                <div className="font-semibold">{feedback === "correct" ? "Chính xác!" : "Chưa đúng"}</div>
                {feedback === "wrong" && (
                  <div className="text-sm">Đáp án: <strong>{current.answer}</strong></div>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-3">
        {feedback === null ? (
          <Button
            className="ml-auto"
            size="lg"
            onClick={check}
            disabled={current.type === "type" ? !typed.trim() : !selected}
          >
            Kiểm tra
          </Button>
        ) : (
          <Button className="ml-auto" size="lg" onClick={next}>
            {idx + 1 < exercises.length ? "Tiếp theo" : "Hoàn thành"}
          </Button>
        )}
      </div>
    </div>
  );
}
