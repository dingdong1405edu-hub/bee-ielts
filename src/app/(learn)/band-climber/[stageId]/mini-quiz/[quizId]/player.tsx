"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import {
  X, Heart, Check, XCircle, Flag, Trophy, Volume2,
  ListChecks, BookOpen, Headphones, PenLine, Mic, Loader2, Square, Sparkles,
  Wand2, MessageSquareQuote,
} from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { BeeGuide, type TourStep } from "@/components/learn/bee-guide";
import { playCorrectSfx, playWrongSfx } from "@/lib/quiz-sfx";
import { startWebSpeech, isWebSpeechSupported, type WebSpeechSession } from "@/lib/web-speech";
import { playExaminerLine, stopExaminerLine, primeAudioPlayback } from "@/lib/tts";

type Skill = "READING" | "LISTENING" | "WRITING" | "SPEAKING";

const SKILL_META: Record<Skill, { label: string; icon: React.ElementType; grad: string }> = {
  READING: { label: "Reading", icon: BookOpen, grad: "from-emerald-500 to-teal-600" },
  LISTENING: { label: "Listening", icon: Headphones, grad: "from-amber-500 to-orange-600" },
  WRITING: { label: "Writing", icon: PenLine, grad: "from-rose-500 to-pink-600" },
  SPEAKING: { label: "Speaking", icon: Mic, grad: "from-indigo-500 to-violet-600" },
};

interface Q {
  id: string;
  type: "IMAGE_CHOICE" | "TEXT_CHOICE" | "FILL_BLANK" | "SPEAKING";
  prompt: string;
  audioUrl?: string | null;
  options: { label: string; imageUrl?: string }[];
  correctIndex: number;
  // Admin's WHY-IS-THIS-RIGHT note. Rendered in the feedback bar after
  // the learner checks; null = no row. For SPEAKING this string is passed
  // to the inline AI grader as a focus hint.
  explanation?: string | null;
}

export interface VocabPackItem {
  term: string;
  definition: string;
  example?: string;
}

// Audio + transcript bundle the SpeakingQuestion sub-component bubbles up to
// the player after the candidate finishes recording. Stored per-question so
// the end-of-quiz summary can replay every take and the final IELTS grader
// receives all the low-confidence words at once.
interface SpeakingRecording {
  audioUrl: string;
  transcript: string;
  lowConfWords: string[];
}

// Compact per-question SPEAKING grade returned by
// /api/grade/quiz-speaking-question. Surfaced in the verdict bar right after
// the candidate's "Hoàn thành" so they get pronunciation/grammar fixes
// before the next question — the user's "chỉnh lại cho nó ngay sau khi nó
// làm xong câu đấy" requirement.
interface SpeakingQuestionGrade {
  quickBand: number;
  summary: string;
  pronunciationFixes: { word: string; ipa: string; tip: string }[];
  grammarFixes: { original: string; corrected: string; explanation: string }[];
  betterPhrasing: string;
}

// Full IELTS-style result returned by /api/grade/quiz-speaking-final. Same
// shape as /api/grade/speaking so the end-of-quiz summary can render the
// "y chang speaking luyện tập" review the user asked for.
interface SpeakingFinalResult {
  overallBand: number;
  criteria: {
    fluencyCoherence: { band: number; feedback: string };
    lexicalResource: { band: number; feedback: string };
    grammaticalRange: { band: number; feedback: string };
    pronunciation: { band: number; feedback: string; note?: string };
  };
  observations?: string[];
  corrections?: { original: string; corrected: string; explanation: string }[];
  pronunciationFixes?: { word: string; ipa: string; tip: string }[];
  improvedSample?: string;
  summary: string;
}

const BLANK_MARK = "___";
const normalize = (s: string) => s.trim().toLowerCase();

export function MiniQuizPlayer({
  stageId,
  stageTitle,
  skill,
  tipMarkdown,
  customTour,
  vocabPack,
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
  // Admin-curated vocab pack. Null/empty = no pre-quiz preview screen.
  vocabPack: VocabPackItem[] | null;
  quiz: { id: string; title: string; questions: Q[] };
}) {
  const router = useRouter();
  const total = quiz.questions.length;
  // Shared audio ref for the Aurora examiner voice — same plumbing the
  // Speaking practice player uses. Lives at the player level so a question
  // change can pause the previous prompt's playback in one place.
  const examinerAudioRef = useRef<HTMLAudioElement | null>(null);
  // `step` is the index of the question currently shown (0..total-1) OR
  // `total` when the user has finished and is on the summary screen.
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  // FILL_BLANK text input value; reset on every step change.
  const [blankInput, setBlankInput] = useState("");
  // SPEAKING transcript — populated when /api/speaking/transcribe returns
  // (or Web Speech fills it live). Reset on every step change.
  const [speakingTranscript, setSpeakingTranscript] = useState("");
  const [verdict, setVerdict] = useState<"none" | "correct" | "wrong">("none");
  const [hearts, setHearts] = useState(5);
  const [correctCount, setCorrectCount] = useState(0);
  const [showTips, setShowTips] = useState(false);
  // Bee tour opens by default ONLY when admin authored one. Tap "Bỏ qua
  // hướng dẫn" or finish the tour to dismiss it and start the quiz.
  const [tourOpen, setTourOpen] = useState(
    !!customTour && customTour.length > 0,
  );
  // Pre-quiz vocab preview: shown after the bee tour closes when admin
  // attached a vocab pack to this quiz. Dismissing the preview (or
  // importing it to /words) starts the quiz proper.
  const [vocabOpen, setVocabOpen] = useState(
    !!vocabPack && vocabPack.length > 0,
  );

  // Per-question SPEAKING state. `recordings` holds the blob URLs +
  // transcripts so the end-of-quiz summary can play every take back;
  // `qGrade` holds the inline per-question AI grade (loading / result /
  // error). Both are keyed by the MiniQuestion id so navigation between
  // questions doesn't shuffle results.
  const [recordings, setRecordings] = useState<Map<string, SpeakingRecording>>(
    () => new Map(),
  );
  const [qGrade, setQGrade] = useState<
    Map<string, SpeakingQuestionGrade | "loading" | "error">
  >(() => new Map());
  // Final IELTS grade — null until the candidate hits the summary screen with
  // at least one SPEAKING question; "loading" while POSTing to the final
  // grader; the result object on success. The summary screen blocks the
  // "Tiếp tục" button until this resolves so users see their full review.
  const [finalGrade, setFinalGrade] = useState<
    SpeakingFinalResult | "loading" | "error" | null
  >(null);

  const q = step < total ? quiz.questions[step] : null;

  // Progress bar reflects answered count (not "step shown"). Question N
  // counts as answered the moment "Kiểm tra" is pressed.
  const answered = verdict === "none" ? step : step + 1;
  const progressPct = (answered / total) * 100;

  // canCheck rules vary by question type:
  //  - SPEAKING:    transcript must be non-empty (user finished recording)
  //  - FILL_BLANK:  blank input must have content
  //  - choice:      an option must be selected
  const canCheck =
    q != null &&
    (q.type === "SPEAKING"
      ? speakingTranscript.trim().length > 0
      : q.type === "FILL_BLANK"
        ? blankInput.trim().length > 0
        : selected != null);

  const check = () => {
    if (q == null) return;
    if (q.type === "SPEAKING") {
      // No right/wrong — the act of recording counts as completing the
      // question. Always green light + sfx so the loop feels rewarding.
      setVerdict("correct");
      setCorrectCount((c) => c + 1);
      playCorrectSfx();
      // Kick off the per-question AI grade so the learner gets
      // pronunciation/grammar corrections inline BEFORE moving on. Runs
      // in background — the user can still tap "Tiếp tục" before it
      // finishes; the grade lands in qGrade and renders the inline card
      // whenever the response arrives.
      const rec = recordings.get(q.id);
      if (rec && rec.transcript.trim().length > 0) {
        const questionId = q.id;
        const prompt = q.prompt;
        const hint = q.explanation ?? "";
        setQGrade((m) => new Map(m).set(questionId, "loading"));
        void (async () => {
          try {
            const res = await fetch("/api/grade/quiz-speaking-question", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                question: prompt,
                transcript: rec.transcript,
                lowConfidenceWords: rec.lowConfWords,
                hint,
              }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Grade failed");
            setQGrade((m) =>
              new Map(m).set(questionId, data.result as SpeakingQuestionGrade),
            );
          } catch (e) {
            console.error("[mini-quiz/grade]", e);
            setQGrade((m) => new Map(m).set(questionId, "error"));
          }
        })();
      }
      return;
    }
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
    // Cut any examiner-voice playback before advancing — the new question's
    // prompt audio will start on its own mount effect.
    stopExaminerLine(examinerAudioRef);
    if (step + 1 >= total) {
      setStep(total);
      return;
    }
    setStep((s) => s + 1);
    setSelected(null);
    setBlankInput("");
    setSpeakingTranscript("");
    setVerdict("none");
  };

  const exit = () => {
    stopExaminerLine(examinerAudioRef);
    router.push(`/band-climber/${stageId}`);
  };

  // Auto-play the prompt with the Aurora voice on every SPEAKING question —
  // same examiner pipeline the Speaking practice page uses (/api/speaking/tts
  // → user's hosted Aurora endpoint). Fires once per step change; cleanup
  // pauses playback so a fast next-tap can't leave two prompts overlapping.
  // q is declared below — using ids inline keeps the dependency array stable
  // and avoids re-firing on every render.
  const currentQId = step < total ? quiz.questions[step]?.id : null;
  const currentQType = step < total ? quiz.questions[step]?.type : null;
  const currentQPrompt = step < total ? quiz.questions[step]?.prompt : null;
  useEffect(() => {
    if (!currentQId || currentQType !== "SPEAKING" || !currentQPrompt) return;
    if (tourOpen || vocabOpen) return;
    const ac = new AbortController();
    primeAudioPlayback();
    void playExaminerLine(currentQPrompt, "aurora", examinerAudioRef, ac.signal);
    return () => {
      ac.abort();
      stopExaminerLine(examinerAudioRef);
    };
  }, [currentQId, currentQType, currentQPrompt, tourOpen, vocabOpen]);

  // Belt-and-braces: kill any leftover examiner audio when the player
  // unmounts (route change, tab close). Also revoke every recorded blob URL
  // we still hold so we don't leak memory across navigations.
  useEffect(() => {
    return () => {
      stopExaminerLine(examinerAudioRef);
      recordings.forEach((r) => {
        if (r.audioUrl) URL.revokeObjectURL(r.audioUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================ FINISHED SUMMARY ============================
  if (step >= total) {
    const speakingQs = quiz.questions.filter((qq) => qq.type === "SPEAKING");
    if (speakingQs.length > 0) {
      // SPEAKING quizzes deserve the full "y chang speaking luyện tập" review
      // the user asked for — audio playback per question + aggregate IELTS
      // grade. The summary component owns its own data fetch so we keep the
      // player loop simple.
      return (
        <SpeakingQuizSummary
          quizId={quiz.id}
          quizTitle={quiz.title}
          questions={speakingQs}
          recordings={recordings}
          perQuestionGrade={qGrade}
          finalGrade={finalGrade}
          setFinalGrade={setFinalGrade}
          correctCount={correctCount}
          total={total}
          onExit={exit}
        />
      );
    }

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
      {/* Pre-quiz vocab preview — shown after the bee tour (or immediately
          if there's no tour). Dismissing it (skip or import-and-go) starts
          the quiz proper. */}
      {!tourOpen && vocabOpen && vocabPack && vocabPack.length > 0 && (
        <VocabPreviewScreen
          skill={skill}
          quizTitle={quiz.title}
          stageTitle={stageTitle}
          pack={vocabPack}
          onClose={() => setVocabOpen(false)}
        />
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
          {/* SPEAKING questions get a "Nghe lại đề" button so the candidate
              can replay the Aurora-voiced prompt anytime before answering. */}
          {q.type === "SPEAKING" && !q.audioUrl && (
            <ExaminerReplayButton
              key={`replay-${q.id}`}
              text={q.prompt}
              audioRef={examinerAudioRef}
            />
          )}
        </div>

        {q.type === "SPEAKING" ? (
          <>
            <SpeakingQuestion
              key={q.id}
              locked={verdict !== "none"}
              transcript={speakingTranscript}
              onRecorded={(rec) => {
                setSpeakingTranscript(rec.transcript);
                setRecordings((m) => {
                  const next = new Map(m);
                  next.set(q.id, rec);
                  return next;
                });
              }}
              onReset={() => {
                setSpeakingTranscript("");
                setRecordings((m) => {
                  const next = new Map(m);
                  next.delete(q.id);
                  return next;
                });
                setQGrade((m) => {
                  const next = new Map(m);
                  next.delete(q.id);
                  return next;
                });
              }}
              onBeforeRecord={() => stopExaminerLine(examinerAudioRef)}
            />
            {/* Inline per-question grading card — shows once the user has
                hit "Hoàn thành" so they get pronunciation/grammar fixes
                BEFORE moving to the next question. */}
            {verdict !== "none" && (
              <SpeakingPerQuestionCard
                state={qGrade.get(q.id) ?? null}
              />
            )}
          </>
        ) : q.type === "FILL_BLANK" ? (
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
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
          {verdict === "correct" && (
            <>
              <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-emerald-600 shadow">
                <Check className="h-7 w-7 stroke-[3]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-lg text-emerald-700">Làm tốt lắm!</div>
                {q.type !== "SPEAKING" && (
                  <div className="text-xs text-emerald-700/80 mt-0.5">
                    Đáp án đúng:{" "}
                    <span className="font-bold">
                      {q.type === "FILL_BLANK"
                        ? q.options[0]?.label ?? "—"
                        : q.options[q.correctIndex]?.label ?? "—"}
                    </span>
                  </div>
                )}
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
                <div className="text-sm text-rose-700">
                  {q.type === "FILL_BLANK"
                    ? q.options[0]?.label ?? "—"
                    : q.options[q.correctIndex]?.label ?? "—"}
                </div>
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
                {q.type === "SPEAKING" ? "Hoàn thành" : "Kiểm tra"}
              </button>
            </>
          )}
          </div>
          {/* Admin-authored explanation — only for choice/fill-blank where
              there's an objectively correct answer. SPEAKING uses the
              inline AI grading card instead. */}
          {verdict !== "none" && q.type !== "SPEAKING" && q.explanation && (
            <div
              className={cn(
                "rounded-xl border-2 p-3 text-sm leading-relaxed",
                verdict === "correct"
                  ? "border-emerald-300 bg-white/70 text-emerald-900"
                  : "border-rose-300 bg-white/70 text-rose-900",
              )}
            >
              <div className="text-[10px] font-extrabold uppercase tracking-widest mb-1 inline-flex items-center gap-1 opacity-70">
                <Sparkles className="h-3 w-3" /> Vì sao
              </div>
              <p className="whitespace-pre-wrap">{q.explanation}</p>
            </div>
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

/**
 * Mini-quiz Speaking question — replicates the IELTS Speaking player UX in
 * miniature: tap mic to record, live transcript via Web Speech API while
 * recording, finalize with /api/speaking/transcribe (Deepgram → Groq Whisper
 * fallback). Bubbles the final transcript up via onTranscript so the parent
 * can enable the "Hoàn thành" button.
 *
 * No grading / band score — speaking inside a mini-quiz is purely practice.
 * Auto-stops at 60 seconds so the loop doesn't stall.
 */
const SPEAKING_MAX_SECONDS = 60;

function SpeakingQuestion({
  locked,
  transcript,
  onRecorded,
  onReset,
  onBeforeRecord,
}: {
  locked: boolean;
  transcript: string;
  /** Fires when the recorder finalises with a usable transcript. The parent
   *  uses this to (a) unblock the "Hoàn thành" button via the transcript
   *  string and (b) persist the audio blob URL + low-confidence words for
   *  per-question AI grading + end-of-quiz playback. audioUrl is "" if Web
   *  Speech (in-browser) handled the transcript without a server round-trip
   *  — in that case we just don't have a blob to replay. */
  onRecorded: (rec: { audioUrl: string; transcript: string; lowConfWords: string[] }) => void;
  /** Fires when the candidate clears their take so they can record again —
   *  parent resets the transcript + per-question grade. */
  onReset: () => void;
  /** Fires just before the recorder starts — used by the parent to stop
   *  any prompt audio that's still playing so it doesn't bleed into the
   *  mic. */
  onBeforeRecord?: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [permError, setPermError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const webSpeechRef = useRef<WebSpeechSession | null>(null);

  // Release everything on unmount so the browser's mic indicator dies with
  // the question. Without this, navigating away mid-record leaves the
  // indicator stuck and looks like the page is still listening.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      webSpeechRef.current?.stop();
      webSpeechRef.current = null;
      try {
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
          recorderRef.current.stop();
        }
      } catch {
        /* ignore */
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const start = async () => {
    setPermError(null);
    // Kill any prompt audio still playing so the recorder doesn't capture
    // the examiner reading the question.
    onBeforeRecord?.();
    try {
      // Acquire mic — needs a user gesture, which this click is.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const blobType = mr.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: blobType });
        // Persist the blob as an objectURL — the end-of-quiz summary plays
        // every take back via a native <audio> element, and the per-question
        // grader doesn't need raw bytes (text + low-confidence words is
        // enough). We don't revoke the URL until the player unmounts so the
        // summary screen can still resolve it.
        const audioUrl = blob.size > 0 ? URL.createObjectURL(blob) : "";

        // Web Speech preferred — instant, no network. Fall back to the
        // server STT endpoint for browsers that don't support it. NOTE:
        // Web Speech doesn't expose per-word confidence so lowConfWords is
        // empty in that path — the inline grader still works (just with
        // less pronunciation evidence).
        const browserTranscript = webSpeechRef.current?.getTranscript() ?? "";
        webSpeechRef.current?.stop();
        webSpeechRef.current = null;
        if (browserTranscript.trim().length > 0) {
          onRecorded({
            audioUrl,
            transcript: browserTranscript.trim(),
            lowConfWords: [],
          });
          return;
        }
        if (blob.size < 1200) {
          toast.error("Không thu được tiếng — kiểm tra micro và thử lại.");
          return;
        }
        setTranscribing(true);
        try {
          const res = await fetch("/api/speaking/transcribe", {
            method: "POST",
            headers: { "Content-Type": blob.type || "audio/webm" },
            body: blob,
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || `Lỗi ${res.status}`);
          const text = (data.transcript ?? "").trim();
          if (!text) {
            toast.error("Không nghe được gì — thử nói to và rõ hơn.");
          }
          // Words with low recogniser confidence become the inline grader's
          // mispronunciation evidence. 0.7 is the same threshold the IELTS
          // Speaking practice player uses.
          const words = (data.words ?? []) as { word: string; confidence: number }[];
          const lowConfWords = Array.from(
            new Set(words.filter((w) => w.confidence < 0.7).map((w) => w.word)),
          );
          onRecorded({ audioUrl, transcript: text, lowConfWords });
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Nhận dạng giọng nói thất bại");
        } finally {
          setTranscribing(false);
        }
      };
      // Start Web Speech for live captions alongside the recorder.
      setLiveTranscript("");
      if (isWebSpeechSupported()) {
        webSpeechRef.current = startWebSpeech({
          lang: "en-US",
          onInterim: (t) => setLiveTranscript(t),
          onError: (err) => console.warn("[mini-quiz/web-speech]", err),
        });
      }
      mr.start();
      recorderRef.current = mr;
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((t) => t + 1), 1000);
    } catch (e) {
      console.error("[mini-quiz/speaking] getUserMedia failed", e);
      setPermError(
        "Không truy cập được micro. Hãy cấp quyền micro trong trình duyệt rồi bấm lại.",
      );
    }
  };

  const stop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    } catch {
      /* ignore */
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  // Hard cap at 60s so the question doesn't stall a long recording forever.
  useEffect(() => {
    if (!recording) return;
    if (elapsed >= SPEAKING_MAX_SECONDS) stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, elapsed]);

  const hasTranscript = transcript.trim().length > 0;

  return (
    <div className="w-full max-w-2xl space-y-3">
      {/* Big mic / stop button */}
      {!hasTranscript && !transcribing && (
        <div className="flex flex-col items-center gap-3">
          {recording ? (
            <button
              type="button"
              onClick={stop}
              className="group relative grid h-28 w-28 place-items-center rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-xl shadow-rose-500/30 transition-transform hover:scale-105"
            >
              <span className="absolute inset-0 rounded-full bg-rose-400/40 animate-ping" />
              <Square className="h-10 w-10 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={start}
              disabled={locked || transcribing}
              className="grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-xl shadow-indigo-500/30 transition-transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Bắt đầu ghi âm"
            >
              <Mic className="h-12 w-12" />
            </button>
          )}
          <div className="text-center">
            {recording ? (
              <>
                <div className="font-extrabold text-rose-700">Đang nghe bạn nói...</div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  {formatDuration(elapsed)} / {formatDuration(SPEAKING_MAX_SECONDS)} — bấm để dừng
                </div>
              </>
            ) : (
              <>
                <div className="font-extrabold text-indigo-700">Bấm mic để bắt đầu nói</div>
                <div className="text-xs text-muted-foreground">
                  Trả lời bằng tiếng Anh, tối đa {SPEAKING_MAX_SECONDS} giây
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {transcribing && (
        <div className="flex flex-col items-center gap-2 py-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <div className="text-sm font-semibold text-indigo-700">
            Đang chuyển giọng nói thành văn bản...
          </div>
        </div>
      )}

      {/* Live transcript while recording */}
      {recording && liveTranscript && (
        <div className="rounded-2xl border-2 border-sky-200 bg-sky-50 dark:bg-sky-950/20 dark:border-sky-900 p-4">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-sky-600 mb-1">
            Bạn đang nói (live)
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-sky-900 dark:text-sky-100">
            {liveTranscript}
          </p>
        </div>
      )}

      {/* Final transcript */}
      {hasTranscript && (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900 p-4">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 mb-1 inline-flex items-center gap-1">
            <Check className="h-3.5 w-3.5" /> Bạn đã nói
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-emerald-900 dark:text-emerald-100">
            {transcript}
          </p>
          {!locked && (
            <button
              type="button"
              onClick={() => {
                onReset();
                setLiveTranscript("");
              }}
              className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-400 px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
            >
              <Mic className="h-3 w-3" /> Ghi âm lại
            </button>
          )}
        </div>
      )}

      {permError && (
        <div className="rounded-xl border-2 border-rose-300 bg-rose-50 dark:bg-rose-950/20 p-3 text-sm text-rose-800 dark:text-rose-200">
          {permError}
        </div>
      )}
    </div>
  );
}

/**
 * "Nghe lại đề" button for SPEAKING questions — calls /api/speaking/tts
 * (which proxies to the user's Aurora endpoint) with the prompt text and
 * plays the result via the shared examiner AudioContext path. Same audio
 * pipeline the Speaking practice page uses, so the candidate hears the
 * same voice in both places.
 */
function ExaminerReplayButton({
  text,
  audioRef,
}: {
  text: string;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
}) {
  const [playing, setPlaying] = useState(false);

  const replay = async () => {
    if (playing) return;
    setPlaying(true);
    primeAudioPlayback();
    try {
      await playExaminerLine(text, "aurora", audioRef);
    } finally {
      setPlaying(false);
    }
  };

  return (
    <div className="flex items-center justify-center mt-1">
      <button
        type="button"
        onClick={replay}
        disabled={playing}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-bold shadow-sm transition-all",
          playing
            ? "bg-indigo-500 text-white border-indigo-600 animate-pulse"
            : "bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100",
        )}
      >
        {playing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Đang đọc...
          </>
        ) : (
          <>
            <Volume2 className="h-4 w-4" /> Nghe lại đề
          </>
        )}
      </button>
    </div>
  );
}

/**
 * Pre-quiz vocab preview — shown after the bee tour closes and before
 * the first question is rendered. The admin-curated vocab pack is laid
 * out as a scrollable list (term / Vietnamese definition / optional
 * example). The primary CTA imports the whole pack as a new flashcard
 * deck in /words via /api/words/import-pack; "Bỏ qua" just dismisses
 * the screen so the quiz can start.
 */
function VocabPreviewScreen({
  skill,
  quizTitle,
  stageTitle,
  pack,
  onClose,
}: {
  skill: Skill;
  quizTitle: string;
  stageTitle: string;
  pack: VocabPackItem[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<{
    deckId: string;
    deckTitle: string;
    cardCount: number;
  } | null>(null);
  const meta = SKILL_META[skill];
  const Icon = meta.icon;

  const importAndStart = async () => {
    if (importing || imported) return;
    setImporting(true);
    try {
      const res = await fetch("/api/words/import-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${quizTitle} · ${stageTitle}`,
          items: pack.map((p) => ({
            term: p.term,
            definition: p.definition,
            example: p.example || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lưu thất bại");
      setImported(data);
      toast.success(
        `Đã tạo bộ thẻ "${data.deckTitle}" với ${data.cardCount} từ.`,
        {
          action: {
            label: "Mở bộ thẻ",
            onClick: () => router.push(`/words/${data.deckId}`),
          },
        },
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tạo bộ thẻ thất bại");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col">
      {/* Header — same gradient style as TipsDrawer for visual consistency */}
      <div
        className={cn(
          "sticky top-0 z-10 bg-gradient-to-r text-white px-5 py-4 flex items-center gap-3",
          meta.grad,
        )}
      >
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest opacity-80 font-bold">
            Từ vựng cho bài này · {meta.label}
          </div>
          <h2 className="font-extrabold text-lg leading-tight truncate">
            {quizTitle}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20 hover:bg-white/30 text-white"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Scrollable word list */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-5 max-w-3xl mx-auto w-full">
        <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-muted-foreground max-w-xl">
            Admin đã chuẩn bị <strong className="text-foreground">{pack.length} từ</strong> mới
            cho phần này. Bấm <strong className="text-emerald-700">Thêm vào học từ</strong> để
            lưu cả file thành bộ thẻ flashcard trong "Từ vựng của tôi".
          </p>
        </div>
        <div className="space-y-2">
          {pack.map((item, i) => (
            <div
              key={i}
              className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <div className="font-extrabold text-lg text-foreground">
                  {item.term}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  #{i + 1}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {item.definition}
              </p>
              {item.example && (
                <p className="text-xs italic text-zinc-500 dark:text-zinc-400 mt-2 border-l-2 border-emerald-400 pl-2">
                  &ldquo;{item.example}&rdquo;
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar — sticky actions */}
      <div className="border-t-2 bg-card px-4 md:px-8 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="rounded-full border-2 border-zinc-300 hover:border-zinc-400 text-zinc-700 dark:text-zinc-300 px-6 py-2.5 text-sm font-bold disabled:opacity-50"
          >
            Bỏ qua, vào làm bài
          </button>
          {imported ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-emerald-500 hover:bg-emerald-600 px-6 py-2.5 text-white font-extrabold uppercase tracking-wider shadow inline-flex items-center gap-2"
            >
              <Check className="h-4 w-4" /> Đã thêm — vào làm bài
            </button>
          ) : (
            <button
              type="button"
              onClick={async () => {
                await importAndStart();
                // Auto-close right after import — keeps the loop tight.
                onClose();
              }}
              disabled={importing}
              className={cn(
                "rounded-full px-6 py-2.5 font-extrabold uppercase tracking-wider shadow inline-flex items-center gap-2 transition-all",
                importing
                  ? "bg-emerald-400 text-white cursor-wait"
                  : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white",
              )}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Thêm vào học từ & làm bài
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Inline AI-grading card shown right under the SPEAKING question after the
 * candidate hits "Hoàn thành". Lives in the question body (not the bottom
 * verdict bar) so it has room to surface multiple pronunciation + grammar
 * fixes. Stays mounted while loading so the user sees progress, and falls
 * back to a quiet info row when the transcript was too short to grade.
 */
function SpeakingPerQuestionCard({
  state,
}: {
  state: SpeakingQuestionGrade | "loading" | "error" | null;
}) {
  if (state === null) {
    return null;
  }
  if (state === "loading") {
    return (
      <div className="w-full max-w-2xl rounded-2xl border-2 border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20 dark:border-indigo-900 p-4 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-600 shrink-0" />
        <div className="text-sm font-semibold text-indigo-800 dark:text-indigo-100">
          AI đang nghe lại và chấm phát âm của bạn...
        </div>
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className="w-full max-w-2xl rounded-2xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-4 text-sm text-amber-900 dark:text-amber-100">
        AI tạm thời không chấm được câu này — bạn vẫn có thể nghe lại bản ghi ở
        màn hình kết thúc quiz.
      </div>
    );
  }
  const tooShort =
    state.quickBand === 0 &&
    state.pronunciationFixes.length === 0 &&
    state.grammarFixes.length === 0;
  if (tooShort) {
    return (
      <div className="w-full max-w-2xl rounded-2xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-4 text-sm text-amber-900 dark:text-amber-100">
        {state.summary}
      </div>
    );
  }
  // Color the band pill by IELTS-style tiers so the user gets an at-a-glance
  // signal without reading the summary first.
  const band = state.quickBand;
  const tone =
    band >= 7
      ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800"
      : band >= 5.5
        ? "bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-800"
        : band >= 4
          ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800"
          : "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800";
  return (
    <div className="w-full max-w-2xl rounded-2xl border-2 border-indigo-200 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/20 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-600" />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-700 dark:text-indigo-300">
            AI chấm phát âm
          </span>
        </div>
        <div
          className={cn(
            "inline-flex items-baseline gap-1.5 rounded-full border-2 px-3 py-1 font-bold",
            tone,
          )}
        >
          <span className="text-[10px] uppercase tracking-widest opacity-80">Band</span>
          <span className="text-lg">{band.toFixed(1)}</span>
        </div>
      </div>
      <p className="text-sm text-foreground/90 dark:text-foreground/90 leading-relaxed">
        {state.summary}
      </p>

      {state.pronunciationFixes.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-extrabold uppercase tracking-widest text-rose-700 dark:text-rose-300 inline-flex items-center gap-1.5">
            <Volume2 className="h-3.5 w-3.5" /> Sửa phát âm
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {state.pronunciationFixes.map((p, i) => (
              <div
                key={i}
                className="rounded-lg border bg-card p-2.5 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold">{p.word}</span>
                  <span className="text-xs font-mono text-primary">{p.ipa}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{p.tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.grammarFixes.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1.5">
            <Wand2 className="h-3.5 w-3.5" /> Lỗi & cách sửa
          </div>
          <div className="space-y-1.5">
            {state.grammarFixes.map((g, i) => (
              <div
                key={i}
                className="rounded-lg border bg-card p-2.5 text-sm space-y-1"
              >
                <p className="text-rose-600 line-through">{g.original}</p>
                <p className="text-emerald-700 font-semibold">✅ {g.corrected}</p>
                <p className="text-xs text-muted-foreground">{g.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.betterPhrasing && (
        <div className="rounded-lg border-2 border-violet-200 dark:border-violet-900 bg-violet-50 dark:bg-violet-950/30 p-2.5 text-sm">
          <div className="text-[11px] font-extrabold uppercase tracking-widest text-violet-700 dark:text-violet-300 mb-1 inline-flex items-center gap-1.5">
            <MessageSquareQuote className="h-3.5 w-3.5" /> Cách nói band 7+
          </div>
          <p className="text-violet-900 dark:text-violet-100 italic">
            "{state.betterPhrasing}"
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * End-of-quiz summary for SPEAKING mini-quizzes — replays every recording,
 * pipes all answers through the same IELTS examiner pipeline the Speaking
 * practice page uses, and surfaces the aggregate band + per-question
 * pronunciation/grammar feedback inline. Matches the user's request: "khi
 * users làm xong 1 quiz thì hãy cho ú nghe lại audio của nó vầ sửa lại và
 * chấm y chang speaking luyện tập".
 */
function SpeakingQuizSummary({
  quizId,
  quizTitle,
  questions,
  recordings,
  perQuestionGrade,
  finalGrade,
  setFinalGrade,
  correctCount,
  total,
  onExit,
}: {
  quizId: string;
  quizTitle: string;
  questions: Q[];
  recordings: Map<string, SpeakingRecording>;
  perQuestionGrade: Map<string, SpeakingQuestionGrade | "loading" | "error">;
  finalGrade: SpeakingFinalResult | "loading" | "error" | null;
  setFinalGrade: (
    v: SpeakingFinalResult | "loading" | "error" | null,
  ) => void;
  correctCount: number;
  total: number;
  onExit: () => void;
}) {
  // Fire the aggregate grader once on mount — same fetch the
  // /api/grade/speaking flow runs, scoped to this quiz's answers.
  useEffect(() => {
    if (finalGrade !== null) return; // already fetched / in-flight
    const answers = questions
      .map((qq) => {
        const rec = recordings.get(qq.id);
        return rec
          ? {
              question: qq.prompt,
              transcript: rec.transcript,
              lowConfidenceWords: rec.lowConfWords,
            }
          : null;
      })
      .filter((a): a is { question: string; transcript: string; lowConfidenceWords: string[] } => a !== null);
    if (answers.length === 0) {
      setFinalGrade("error");
      return;
    }
    setFinalGrade("loading");
    void (async () => {
      try {
        const res = await fetch("/api/grade/quiz-speaking-final", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quizId,
            topic: quizTitle,
            answers,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Grade failed");
        setFinalGrade(data.result as SpeakingFinalResult);
      } catch (e) {
        console.error("[mini-quiz/final-grade]", e);
        setFinalGrade("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accuracyPct = Math.round((correctCount / total) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-5">
        {/* Hero with overall band + accuracy */}
        <div className="text-center space-y-2 pt-2">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl gradient-brand text-white shadow-lg shadow-primary/30">
            <Trophy className="h-8 w-8" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold">Hoàn thành Speaking quiz</h1>
          <p className="text-sm text-muted-foreground">
            {accuracyPct}% câu nộp · {questions.length} câu speaking
          </p>
        </div>

        {/* Overall band card */}
        <div className="rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-accent p-6 text-center">
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
            Band Speaking tổng
          </div>
          {finalGrade === null || finalGrade === "loading" ? (
            <div className="mt-3 flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-sm text-muted-foreground">
                AI đang chấm tổng — y chang phần Speaking luyện tập...
              </div>
            </div>
          ) : finalGrade === "error" ? (
            <div className="mt-3 text-sm text-rose-700">
              AI không chấm được lúc này. Bạn vẫn có thể nghe lại audio + đọc
              nhận xét từng câu ở phía dưới.
            </div>
          ) : (
            <>
              <div className="text-5xl md:text-6xl font-extrabold gradient-brand-text mt-2">
                {finalGrade.overallBand.toFixed(1)}
              </div>
              <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
                {finalGrade.summary}
              </p>
            </>
          )}
        </div>

        {/* Four IELTS criteria — only after the final grade lands */}
        {finalGrade && finalGrade !== "loading" && finalGrade !== "error" && (
          <div className="grid sm:grid-cols-2 gap-3">
            {(
              [
                ["fluencyCoherence", "Fluency & Coherence"],
                ["lexicalResource", "Lexical Resource"],
                ["grammaticalRange", "Grammatical Range"],
                ["pronunciation", "Pronunciation"],
              ] as const
            ).map(([key, label]) => {
              const v = finalGrade.criteria[key];
              return (
                <div
                  key={key}
                  className="rounded-2xl border bg-card p-4"
                >
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="text-lg font-bold text-primary">
                      {v.band.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {v.feedback}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Per-question audio + transcript + AI fixes */}
        <div className="space-y-3">
          <h2 className="text-lg font-extrabold flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" /> Audio + nhận xét từng câu
          </h2>
          <p className="text-xs text-muted-foreground -mt-1">
            Nhấn ▶ để nghe lại từng bản ghi. AI đã sửa phát âm + ngữ pháp ngay
            tại mỗi câu khi bạn nói xong.
          </p>
          {questions.map((qq, i) => {
            const rec = recordings.get(qq.id);
            const grade = perQuestionGrade.get(qq.id);
            return (
              <div key={qq.id} className="rounded-xl border bg-card p-4 space-y-2">
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-violet-700">
                  Câu {i + 1}
                </div>
                <p className="font-semibold leading-snug">{qq.prompt}</p>
                {rec?.audioUrl ? (
                  <audio
                    controls
                    src={rec.audioUrl}
                    className="w-full h-10"
                    preload="metadata"
                  />
                ) : rec ? (
                  <p className="text-xs text-muted-foreground italic">
                    (Trình duyệt không tạo bản ghi để phát lại — nhưng đã nhận
                    dạng được lời nói qua Web Speech)
                  </p>
                ) : (
                  <p className="text-xs text-amber-700 italic">
                    Bạn đã bỏ qua không ghi âm câu này.
                  </p>
                )}
                {rec?.transcript && (
                  <p className="text-sm rounded-lg border-l-2 border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 pl-3 py-2 italic">
                    "{rec.transcript}"
                  </p>
                )}
                {grade &&
                  grade !== "loading" &&
                  grade !== "error" &&
                  (grade.pronunciationFixes.length > 0 || grade.grammarFixes.length > 0) && (
                    <div className="space-y-2 pt-1">
                      {grade.pronunciationFixes.length > 0 && (
                        <div className="text-xs">
                          <span className="font-extrabold text-rose-700">
                            Sửa phát âm:{" "}
                          </span>
                          {grade.pronunciationFixes
                            .map((p) => `${p.word} ${p.ipa}`)
                            .join(" · ")}
                        </div>
                      )}
                      {grade.grammarFixes.map((g, idx) => (
                        <div key={idx} className="text-xs space-y-0.5">
                          <span className="text-rose-600 line-through">
                            {g.original}
                          </span>{" "}
                          →{" "}
                          <span className="text-emerald-700 font-semibold">
                            {g.corrected}
                          </span>
                          <div className="text-muted-foreground">
                            {g.explanation}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            );
          })}
        </div>

        {/* Aggregate corrections + pronunciation fixes from the final grade */}
        {finalGrade &&
          finalGrade !== "loading" &&
          finalGrade !== "error" &&
          (finalGrade.corrections?.length || finalGrade.pronunciationFixes?.length) ? (
          <div className="space-y-3">
            {finalGrade.pronunciationFixes && finalGrade.pronunciationFixes.length > 0 && (
              <div className="rounded-2xl border bg-card p-4 space-y-2">
                <h3 className="font-extrabold flex items-center gap-2">
                  <Volume2 className="h-5 w-5 text-rose-500" /> Tổng hợp phát âm
                </h3>
                <div className="grid sm:grid-cols-2 gap-2">
                  {finalGrade.pronunciationFixes.map((p, i) => (
                    <div key={i} className="rounded-lg border p-2.5 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold">{p.word}</span>
                        <span className="text-xs font-mono text-primary">{p.ipa}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{p.tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {finalGrade.corrections && finalGrade.corrections.length > 0 && (
              <div className="rounded-2xl border bg-card p-4 space-y-2">
                <h3 className="font-extrabold flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-emerald-500" /> Tổng hợp ngữ pháp
                </h3>
                <div className="space-y-2">
                  {finalGrade.corrections.map((c, i) => (
                    <div key={i} className="rounded-lg border p-2.5 text-sm space-y-1">
                      <p className="text-rose-600 line-through">{c.original}</p>
                      <p className="text-emerald-700 font-semibold">✅ {c.corrected}</p>
                      <p className="text-xs text-muted-foreground">{c.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {finalGrade &&
          finalGrade !== "loading" &&
          finalGrade !== "error" &&
          finalGrade.improvedSample && (
            <div className="rounded-2xl border-2 border-violet-200 dark:border-violet-900 bg-violet-50 dark:bg-violet-950/20 p-4">
              <h3 className="font-extrabold inline-flex items-center gap-2 text-violet-700 dark:text-violet-300 mb-2">
                <MessageSquareQuote className="h-5 w-5" /> Bài trả lời mẫu band 7.5
              </h3>
              <p className="text-sm leading-relaxed italic text-violet-900 dark:text-violet-100">
                {finalGrade.improvedSample}
              </p>
            </div>
          )}

        <div className="pt-2 pb-6 flex justify-center">
          <button
            onClick={onExit}
            className="rounded-full bg-emerald-500 hover:bg-emerald-600 px-8 py-3 text-white font-extrabold uppercase tracking-wider shadow"
          >
            Hoàn tất
          </button>
        </div>
      </div>
    </div>
  );
}
