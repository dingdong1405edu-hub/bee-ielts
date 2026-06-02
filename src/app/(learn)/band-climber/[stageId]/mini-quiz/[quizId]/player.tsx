"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  X, Heart, Check, XCircle, Flag, Trophy, Volume2,
  ListChecks, BookOpen, Headphones, PenLine, Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BeeGuide, type TourStep } from "@/components/learn/bee-guide";
import { playCorrectSfx, playWrongSfx } from "@/lib/quiz-sfx";

type Skill = "READING" | "LISTENING" | "WRITING" | "SPEAKING";

const SKILL_META: Record<Skill, { label: string; icon: React.ElementType; grad: string }> = {
  READING: { label: "Reading", icon: BookOpen, grad: "from-emerald-500 to-teal-600" },
  LISTENING: { label: "Listening", icon: Headphones, grad: "from-amber-500 to-orange-600" },
  WRITING: { label: "Writing", icon: PenLine, grad: "from-rose-500 to-pink-600" },
  SPEAKING: { label: "Speaking", icon: Mic, grad: "from-indigo-500 to-violet-600" },
};

interface Q {
  id: string;
  type: "IMAGE_CHOICE" | "TEXT_CHOICE" | "FILL_BLANK";
  prompt: string;
  audioUrl?: string | null;
  options: { label: string; imageUrl?: string }[];
  correctIndex: number;
}

const BLANK_MARK = "___";
const normalize = (s: string) => s.trim().toLowerCase();

export function MiniQuizPlayer({
  stageId,
  stageTitle,
  skill,
  tipMarkdown,
  customTour,
  quiz,
}: {
  stageId: string;
  // Parent band stage's title + skill — used in the HƯỚNG DẪN drawer header.
  stageTitle: string;
  skill: Skill;
  // Markdown tips authored by admin for this skill at the stage level.
  // Empty string means admin hasn't written any.
  tipMarkdown: string;
  // Admin-authored Bee 🐝 tour for this quiz. Null = no overlay shown.
  customTour: TourStep[] | null;
  quiz: { id: string; title: string; questions: Q[] };
}) {
  const router = useRouter();
  const total = quiz.questions.length;
  // `step` is the index of the question currently shown (0..total-1) OR
  // `total` when the user has finished and is on the summary screen.
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  // FILL_BLANK text input value; reset on every step change.
  const [blankInput, setBlankInput] = useState("");
  const [verdict, setVerdict] = useState<"none" | "correct" | "wrong">("none");
  const [hearts, setHearts] = useState(5);
  const [correctCount, setCorrectCount] = useState(0);
  const [showTips, setShowTips] = useState(false);
  // Bee tour opens by default ONLY when admin authored one. Tap "Bỏ qua
  // hướng dẫn" or finish the tour to dismiss it and start the quiz.
  const [tourOpen, setTourOpen] = useState(
    !!customTour && customTour.length > 0,
  );

  const q = step < total ? quiz.questions[step] : null;

  // Progress bar reflects answered count (not "step shown"). Question N
  // counts as answered the moment "Kiểm tra" is pressed.
  const answered = verdict === "none" ? step : step + 1;
  const progressPct = (answered / total) * 100;

  // For FILL_BLANK the "selected" notion doesn't apply — we check the
  // typed text against every option label instead.
  const canCheck =
    q != null && (q.type === "FILL_BLANK" ? blankInput.trim().length > 0 : selected != null);

  const check = () => {
    if (q == null) return;
    if (q.type === "FILL_BLANK") {
      const user = normalize(blankInput);
      const ok = q.options.some((o) => normalize(o.label) === user);
      if (ok) {
        setVerdict("correct");
        setCorrectCount((c) => c + 1);
        playCorrectSfx();
      } else {
        setVerdict("wrong");
        setHearts((h) => Math.max(0, h - 1));
        playWrongSfx();
      }
      return;
    }
    if (selected == null) return;
    if (selected === q.correctIndex) {
      setVerdict("correct");
      setCorrectCount((c) => c + 1);
      playCorrectSfx();
    } else {
      setVerdict("wrong");
      setHearts((h) => Math.max(0, h - 1));
      playWrongSfx();
    }
  };

  const next = () => {
    if (step + 1 >= total) {
      setStep(total);
      return;
    }
    setStep((s) => s + 1);
    setSelected(null);
    setBlankInput("");
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

  const hasTips = tipMarkdown.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Bee tour overlay — only renders when admin authored one for THIS
          quiz. Empty tour = no overlay (consistent with long-test rule). */}
      {tourOpen && customTour && customTour.length > 0 && (
        <BeeGuide steps={customTour} onFinish={() => setTourOpen(false)} />
      )}
      {/* Duolingo-style burst when verdict transitions to "correct". Keyed
          by the question id so React remounts it and replays the CSS
          animation on every new correct answer. */}
      {verdict === "correct" && <CorrectBurst key={`burst-${q.id}`} />}
      {/* Top bar: X + progress + hướng dẫn + hearts (Duolingo) */}
      <div className="flex items-center gap-3 px-4 md:px-8 py-4">
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
        {hasTips && (
          <button
            onClick={() => setShowTips(true)}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border-2 border-violet-300 bg-violet-50 text-violet-700 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider hover:bg-violet-100 transition-all"
          >
            <ListChecks className="h-3.5 w-3.5" /> Hướng dẫn
          </button>
        )}
        {hasTips && (
          <button
            onClick={() => setShowTips(true)}
            aria-label="Hướng dẫn"
            className="sm:hidden grid h-9 w-9 place-items-center rounded-full border-2 border-violet-300 bg-violet-50 text-violet-700"
          >
            <ListChecks className="h-4 w-4" />
          </button>
        )}
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
          {q.type === "FILL_BLANK" && q.prompt.includes(BLANK_MARK) ? (
            <FillBlankInlinePrompt
              prompt={q.prompt}
              value={blankInput}
              onChange={setBlankInput}
              onEnter={check}
              locked={verdict !== "none"}
              verdict={verdict}
            />
          ) : (
            <h2 className="text-2xl md:text-3xl font-extrabold leading-tight">{q.prompt}</h2>
          )}
          {q.audioUrl ? <AudioButton key={q.id} url={q.audioUrl} /> : null}
        </div>

        {q.type === "FILL_BLANK" ? (
          q.prompt.includes(BLANK_MARK) ? null : (
            <div className="w-full max-w-xl">
              <input
                type="text"
                value={blankInput}
                onChange={(e) => setBlankInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canCheck) {
                    e.preventDefault();
                    check();
                  }
                }}
                disabled={verdict !== "none"}
                autoFocus
                placeholder="Gõ đáp án rồi nhấn Enter..."
                className={cn(
                  // Always pin text/placeholder colors to dark — the input
                  // backgrounds are hard-coded light tints, so without this
                  // dark-mode would render white-on-white and the user's
                  // typed answer becomes invisible.
                  "w-full rounded-2xl border-2 px-5 py-4 text-xl font-bold text-center transition-all outline-none placeholder:text-sky-400/70",
                  verdict === "correct"
                    ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                    : verdict === "wrong"
                      ? "border-rose-400 bg-rose-50 text-rose-800 quiz-shake"
                      : "border-sky-300 bg-sky-50 text-sky-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-200",
                )}
              />
            </div>
          )
        ) : q.type === "IMAGE_CHOICE" ? (
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
              const wrong = verdict === "wrong" && isSelected;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => verdict === "none" && setSelected(i)}
                  disabled={verdict !== "none"}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border-2 p-3 transition-all flex flex-col items-center gap-2",
                    tone,
                    wrong && "quiz-shake",
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
              const wrong = verdict === "wrong" && isSelected;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => verdict === "none" && setSelected(i)}
                  disabled={verdict !== "none"}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left font-semibold transition-all",
                    tone,
                    wrong && "quiz-shake",
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
                disabled={!canCheck}
                className={cn(
                  "rounded-full px-8 py-3 font-extrabold uppercase tracking-wider shadow transition-all",
                  canCheck
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

      {showTips && (
        <TipsDrawer
          skill={skill}
          stageTitle={stageTitle}
          quizTitle={quiz.title}
          markdown={tipMarkdown}
          onClose={() => setShowTips(false)}
        />
      )}
    </div>
  );
}

/**
 * Slide-up drawer that surfaces the admin-authored markdown tips for the
 * skill this mini-quiz belongs to. Mirrors the TipsDrawer in the stage
 * path-view so learners get the same guidance no matter where they open
 * a Vượt band exercise from.
 */
function TipsDrawer({
  skill,
  stageTitle,
  quizTitle,
  markdown,
  onClose,
}: {
  skill: Skill;
  stageTitle: string;
  quizTitle: string;
  markdown: string;
  onClose: () => void;
}) {
  const meta = SKILL_META[skill];
  const Icon = meta.icon;
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative bg-card w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "sticky top-0 z-10 bg-gradient-to-r text-white px-5 py-4 flex items-center justify-between rounded-t-3xl",
            meta.grad,
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 shrink-0">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-widest opacity-80 font-bold">
                Hướng dẫn {meta.label} · {stageTitle}
              </div>
              <h2 className="font-extrabold text-lg leading-tight truncate">{quizTitle}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20 hover:bg-white/30 text-white"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">
          <div className="prose prose-sm md:prose-base max-w-none dark:prose-invert prose-headings:font-extrabold prose-headings:tracking-tight">
            <ReactMarkdown>{markdown}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * FILL_BLANK prompt with the blank rendered as an inline text input.
 * Splits the admin's prompt on the BLANK_MARK sentinel ("___") and weaves
 * an `<input>` between the segments so the user types right where the
 * blank is. Multiple blanks reuse the same `value` (single-answer model).
 */
function FillBlankInlinePrompt({
  prompt,
  value,
  onChange,
  onEnter,
  locked,
  verdict,
}: {
  prompt: string;
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
  locked: boolean;
  verdict: "none" | "correct" | "wrong";
}) {
  const parts = prompt.split(BLANK_MARK);
  // Same dark-mode fix as the standalone FILL_BLANK input — backgrounds are
  // light tints, so pin the typed text colour explicitly to avoid invisible
  // white-on-white in dark theme.
  const inputTone =
    verdict === "correct"
      ? "border-emerald-400 bg-emerald-50 text-emerald-800"
      : verdict === "wrong"
        ? "border-rose-400 bg-rose-50 text-rose-800 quiz-shake"
        : "border-sky-300 bg-sky-50 text-sky-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-200";
  return (
    <h2 className="text-xl md:text-2xl font-extrabold leading-snug flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
      {parts.flatMap((seg, i) => {
        const nodes: React.ReactNode[] = [
          <span key={`seg-${i}`}>{seg}</span>,
        ];
        if (i < parts.length - 1) {
          nodes.push(
            <input
              key={`blank-${i}`}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && value.trim().length > 0) {
                  e.preventDefault();
                  onEnter();
                }
              }}
              disabled={locked}
              autoFocus={i === 0}
              placeholder="..."
              className={cn(
                "inline-block min-w-[6ch] max-w-[16ch] rounded-lg border-2 px-2 py-1 text-center font-extrabold outline-none transition-all",
                inputTone,
              )}
              size={Math.max(value.length, 6)}
            />,
          );
        }
        return nodes;
      })}
    </h2>
  );
}

/**
 * Full-screen Duolingo-style celebration when the learner answers correctly.
 * Mounts on verdict→"correct" (keyed by question id so it replays each round)
 * and self-removes after the longest animation (~1.1s). pointer-events:none
 * so it never blocks the "Tiếp tục" button underneath.
 */
const BURST_EMOJI = ["🎉", "✨", "⭐", "💫", "🌟", "🎊", "✨", "⭐", "🎉", "💫", "🌟", "🎊"];

function CorrectBurst() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {/* Tinted flash — gives a satisfying screen pulse on correct. */}
      <div className="absolute inset-0 bg-emerald-300/25 quiz-flash-green" />
      {/* Central trophy emoji pops in/out from the middle of the screen. */}
      <div
        className="absolute top-1/2 left-1/2 text-7xl md:text-8xl drop-shadow-[0_4px_12px_rgba(16,185,129,0.4)] quiz-pop-in"
        aria-hidden
      >
        🎉
      </div>
      {/* 12 emoji particles fly outward in evenly spaced directions. */}
      {BURST_EMOJI.map((emoji, i) => {
        const angle = (i / BURST_EMOJI.length) * Math.PI * 2;
        // Mix two radii so the burst doesn't look ring-shaped.
        const radius = 180 + (i % 3) * 60;
        const dx = Math.cos(angle) * radius;
        const dy = Math.sin(angle) * radius;
        return (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 text-3xl md:text-4xl quiz-burst"
            style={
              {
                "--qx": `${dx.toFixed(1)}px`,
                "--qy": `${dy.toFixed(1)}px`,
                animationDelay: `${i * 20}ms`,
              } as React.CSSProperties
            }
            aria-hidden
          >
            {emoji}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Big Duolingo-style listen button. Plays the question's audio on tap and
 * highlights while playing. New key per question id resets the element when
 * the learner advances, so the previous track can't keep playing.
 */
function AudioButton({ url }: { url: string }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  // Auto-stop the audio when this component unmounts (route change / next q).
  useEffect(() => {
    const a = ref.current;
    return () => {
      if (a && !a.paused) a.pause();
    };
  }, []);

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) {
      a.currentTime = 0;
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="flex items-center justify-center gap-3 mt-1">
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border-2 px-5 py-2.5 font-bold shadow-sm transition-all",
          playing
            ? "bg-sky-500 text-white border-sky-600 animate-pulse"
            : "bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100",
        )}
      >
        <Volume2 className="h-5 w-5" />
        {playing ? "Đang phát..." : "Nghe"}
      </button>
      <audio
        ref={ref}
        src={url}
        onEnded={() => setPlaying(false)}
        onError={() => setPlaying(false)}
        hidden
      />
    </div>
  );
}
