"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { X, Heart, Check, CheckCircle2, XCircle, Flag, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface Q {
  id: string;
  type: "IMAGE_CHOICE" | "TEXT_CHOICE";
  prompt: string;
  options: { label: string; imageUrl?: string }[];
  correctIndex: number;
}

export function MiniQuizPlayer({
  stageId,
  quiz,
}: {
  stageId: string;
  quiz: { id: string; title: string; questions: Q[] };
}) {
  const router = useRouter();
  const total = quiz.questions.length;
  // `step` is the index of the question currently shown (0..total-1) OR
  // `total` when the user has finished and is on the summary screen.
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<"none" | "correct" | "wrong">("none");
  const [hearts, setHearts] = useState(5);
  const [correctCount, setCorrectCount] = useState(0);

  const q = step < total ? quiz.questions[step] : null;

  // Progress bar reflects answered count (not "step shown"). Question N
  // counts as answered the moment "Kiểm tra" is pressed.
  const answered = verdict === "none" ? step : step + 1;
  const progressPct = (answered / total) * 100;

  const check = () => {
    if (q == null || selected == null) return;
    if (selected === q.correctIndex) {
      setVerdict("correct");
      setCorrectCount((c) => c + 1);
    } else {
      setVerdict("wrong");
      setHearts((h) => Math.max(0, h - 1));
    }
  };

  const next = () => {
    if (step + 1 >= total) {
      setStep(total);
      return;
    }
    setStep((s) => s + 1);
    setSelected(null);
    setVerdict("none");
  };

  const exit = () => {
    router.push(`/band-climber/${stageId}`);
  };

  // ============================ FINISHED SUMMARY ============================
  if (step >= total) {
    const score = Math.round((correctCount / total) * 100);
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-4 text-center gap-4">
        <div className="grid h-20 w-20 place-items-center rounded-3xl gradient-brand text-white shadow-lg shadow-primary/30">
          <Trophy className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-extrabold">Hoàn thành!</h1>
        <p className="text-lg">
          Đúng <span className="font-extrabold text-emerald-600">{correctCount}</span> /{" "}
          {total} ({score}%)
        </p>
        <button
          onClick={exit}
          className="mt-4 rounded-full bg-emerald-500 hover:bg-emerald-600 px-8 py-3 text-white font-extrabold uppercase tracking-wider shadow-md"
        >
          Tiếp tục
        </button>
      </div>
    );
  }

  if (!q) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top bar: X + progress + hearts (Duolingo) */}
      <div className="flex items-center gap-4 px-4 md:px-8 py-4">
        <button
          onClick={exit}
          aria-label="Thoát"
          className="grid h-10 w-10 place-items-center rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
        >
          <X className="h-6 w-6" />
        </button>
        <div className="flex-1 h-3 rounded-full bg-zinc-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex items-center gap-1.5 text-rose-500 font-bold">
          <Heart className="h-5 w-5 fill-rose-500" />
          <span>{hearts}</span>
        </div>
      </div>

      {/* Question body */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 flex flex-col items-center justify-center gap-6 max-w-4xl mx-auto w-full">
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-violet-700">
            <span className="grid h-4 w-4 place-items-center rounded-full bg-violet-500 text-white text-[10px]">
              ?
            </span>
            Câu {step + 1}/{total}
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold leading-tight">{q.prompt}</h2>
        </div>

        {q.type === "IMAGE_CHOICE" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full">
            {q.options.map((opt, i) => {
              const isSelected = selected === i;
              const isCorrect = q.correctIndex === i;
              const showResult = verdict !== "none";
              const tone = showResult
                ? isCorrect
                  ? "border-emerald-400 bg-emerald-50"
                  : isSelected
                    ? "border-rose-400 bg-rose-50"
                    : "border-input bg-card"
                : isSelected
                  ? "border-sky-400 bg-sky-50 ring-2 ring-sky-200"
                  : "border-input bg-card hover:border-zinc-300";
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => verdict === "none" && setSelected(i)}
                  disabled={verdict !== "none"}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border-2 p-3 transition-all flex flex-col items-center gap-2",
                    tone,
                  )}
                >
                  <div className="aspect-square w-full grid place-items-center bg-muted/30 rounded-lg">
                    {opt.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={opt.imageUrl} alt={opt.label} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-4xl">📦</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between w-full text-sm">
                    <span className="font-bold">{opt.label}</span>
                    <span className="grid h-6 w-6 place-items-center rounded-md border text-xs font-bold text-zinc-500">
                      {i + 1}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-3 w-full max-w-xl">
            {q.options.map((opt, i) => {
              const isSelected = selected === i;
              const isCorrect = q.correctIndex === i;
              const showResult = verdict !== "none";
              const tone = showResult
                ? isCorrect
                  ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                  : isSelected
                    ? "border-rose-400 bg-rose-50 text-rose-700"
                    : "border-input bg-card"
                : isSelected
                  ? "border-sky-400 bg-sky-50 ring-2 ring-sky-200 text-sky-700"
                  : "border-input bg-card hover:border-zinc-300";
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => verdict === "none" && setSelected(i)}
                  disabled={verdict !== "none"}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left font-semibold transition-all",
                    tone,
                  )}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="flex-1">{opt.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom feedback bar — green if correct, pink if wrong, neutral when
          no verdict yet. Matches the Duolingo screenshot layout. */}
      <div
        className={cn(
          "px-4 md:px-8 py-4 border-t-2 transition-colors",
          verdict === "correct" && "bg-emerald-100 border-emerald-300",
          verdict === "wrong" && "bg-rose-100 border-rose-300",
          verdict === "none" && "bg-card border-input",
        )}
      >
        <div className="max-w-4xl mx-auto flex items-center gap-3 flex-wrap">
          {verdict === "correct" && (
            <>
              <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-emerald-600 shadow">
                <Check className="h-7 w-7 stroke-[3]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-lg text-emerald-700">Làm tốt lắm!</div>
                <button className="text-xs font-bold text-emerald-700/70 inline-flex items-center gap-1 mt-0.5">
                  <Flag className="h-3 w-3" /> BÁO CÁO
                </button>
              </div>
              <button
                onClick={next}
                className="rounded-full bg-emerald-500 hover:bg-emerald-600 px-8 py-3 text-white font-extrabold uppercase tracking-wider shadow"
              >
                Tiếp tục
              </button>
            </>
          )}
          {verdict === "wrong" && (
            <>
              <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-rose-600 shadow">
                <XCircle className="h-7 w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-lg text-rose-700">Đáp án đúng:</div>
                <div className="text-sm text-rose-700">{q.options[q.correctIndex].label}</div>
                <button className="text-xs font-bold text-rose-700/70 inline-flex items-center gap-1 mt-0.5">
                  <Flag className="h-3 w-3" /> BÁO CÁO
                </button>
              </div>
              <button
                onClick={next}
                className="rounded-full bg-rose-500 hover:bg-rose-600 px-8 py-3 text-white font-extrabold uppercase tracking-wider shadow"
              >
                Tiếp tục
              </button>
            </>
          )}
          {verdict === "none" && (
            <>
              <div className="flex-1" />
              <button
                onClick={check}
                disabled={selected == null}
                className={cn(
                  "rounded-full px-8 py-3 font-extrabold uppercase tracking-wider shadow transition-all",
                  selected != null
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                    : "bg-zinc-200 text-zinc-400 cursor-not-allowed",
                )}
              >
                Kiểm tra
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
