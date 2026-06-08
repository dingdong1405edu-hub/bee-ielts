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
  READING: { label: "Reading", icon: BookOpen, grad: "from-sage-500 to-teal-600" },
  LISTENING: { label: "Listening", icon: Headphones, grad: "from-gold-500 to-gold-600" },
  WRITING: { label: "Writing", icon: PenLine, grad: "from-rose-500 to-rose-600" },
  SPEAKING: { label: "Speaking", icon: Mic, grad: "from-honey to-honey-deep" },
};

interface Q {
  id: string;
  type:
    | "IMAGE_CHOICE"
    | "TEXT_CHOICE"
    | "FILL_BLANK"
    | "PARAGRAPH_FILL"
    | "SPEAKING";
  prompt: string;
  audioUrl?: string | null;
  options: { label: string; imageUrl?: string }[];
  correctIndex: number;
  // Admin's WHY-IS-THIS-RIGHT note. Rendered in the feedback bar after
  // the learner checks; null = no row. For SPEAKING this string is passed
  // to the inline AI grader as a focus hint.
  explanation?: string | null;
  // IELTS Speaking Part-2 cue card bullets. SPEAKING only — when present
  // the player swaps the standard record-an-answer UI for the Part-2
  // flow (60s prep + 120s auto-recording timed speech).
  cueCardPoints?: string[] | null;
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
  // PARAGRAPH_FILL: one input per blank, in order. Length always matches
  // q.options.length while the user is on a PARAGRAPH_FILL step. Reset on
  // step change just like blankInput.
  const [paragraphInputs, setParagraphInputs] = useState<string[]>([]);
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
  //  - SPEAKING:        transcript must be non-empty
  //  - FILL_BLANK:      blank input must have content
  //  - PARAGRAPH_FILL:  every blank must have content
  //  - choice:          an option must be selected
  const canCheck =
    q != null &&
    (q.type === "SPEAKING"
      ? speakingTranscript.trim().length > 0
      : q.type === "FILL_BLANK"
        ? blankInput.trim().length > 0
        : q.type === "PARAGRAPH_FILL"
          ? paragraphInputs.length === q.options.length &&
            paragraphInputs.every((v) => v.trim().length > 0)
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
        // For Part-2 cue-card questions, prepend the cue-card structure to
        // the prompt + admin hint so the AI grader knows this was a 2-min
        // monologue, not a single Part-1-style answer. Otherwise the grader
        // judges fluency at the wrong scale.
        const isPart2 = !!q.cueCardPoints && q.cueCardPoints.length > 0;
        const prompt = isPart2
          ? `IELTS Speaking Part 2 — Cue card.\nTopic: ${q.prompt}\nYou should say:\n${q.cueCardPoints!.map((p) => `- ${p}`).join("\n")}\n\nThe candidate spoke for up to 2 minutes.`
          : q.prompt;
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
    if (q.type === "PARAGRAPH_FILL") {
      // All blanks must be correct for the question to count. Each
      // option.label is the answer for the same-index blank; alternates
      // are "/"-separated. ALL must match — partial credit would muddy
      // the heart accounting.
      const allOk = q.options.every((o, i) => {
        const user = normalize(paragraphInputs[i] ?? "");
        const accepts = o.label
          .split("/")
          .map((s) => normalize(s))
          .filter(Boolean);
        return accepts.includes(user);
      });
      if (allOk) {
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
    setParagraphInputs([]);
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

  // Initialise PARAGRAPH_FILL inputs array to the right length when the
  // step lands on one. Single source of truth for "how many blanks does
  // this question have" = q.options.length (admin form enforces it
  // matching the ___ count in the prompt at save time).
  useEffect(() => {
    if (step >= total) return;
    const qq = quiz.questions[step];
    if (qq.type !== "PARAGRAPH_FILL") return;
    const need = qq.options.length;
    setParagraphInputs((prev) =>
      prev.length === need ? prev : Array.from({ length: need }, () => ""),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, total]);

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
          Đúng <span className="font-extrabold text-success">{correctCount}</span> /{" "}
          {total} ({score}%)
        </p>
        <button
          onClick={exit}
          className="mt-4 rounded-full bg-success hover:bg-success/90 text-success-foreground px-8 py-3 font-extrabold uppercase tracking-wider shadow-md"
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
          className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <X className="h-6 w-6" />
        </button>
        <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-sage-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {hasTips && (
          <button
            onClick={() => setShowTips(true)}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border-2 border-honey/40 bg-honey-tint text-honey-deep px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider hover:bg-honey/20 transition-all"
          >
            <ListChecks className="h-3.5 w-3.5" /> Hướng dẫn
          </button>
        )}
        {hasTips && (
          <button
            onClick={() => setShowTips(true)}
            aria-label="Hướng dẫn"
            className="sm:hidden grid h-9 w-9 place-items-center rounded-full border-2 border-honey/40 bg-honey-tint text-honey-deep"
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
          <div className="inline-flex items-center gap-1.5 rounded-full bg-honey-tint px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-honey-deep">
            <span className="grid h-4 w-4 place-items-center rounded-full bg-honey text-white text-[10px]">
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
          ) : q.type === "PARAGRAPH_FILL" ? (
            <ParagraphFillInlinePrompt
              prompt={q.prompt}
              values={paragraphInputs}
              onChange={setParagraphInputs}
              onSubmit={check}
              locked={verdict !== "none"}
              verdict={verdict}
              options={q.options}
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
            {q.cueCardPoints && q.cueCardPoints.length > 0 ? (
              <SpeakingPart2Question
                key={q.id}
                locked={verdict !== "none"}
                transcript={speakingTranscript}
                cueCardTopic={q.prompt}
                cueCardPoints={q.cueCardPoints}
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
            ) : (
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
            )}
            {/* Inline per-question grading card — shows once the user has
                hit "Hoàn thành" so they get pronunciation/grammar fixes
                BEFORE moving to the next question. */}
            {verdict !== "none" && (
              <SpeakingPerQuestionCard
                state={qGrade.get(q.id) ?? null}
              />
            )}
          </>
        ) : q.type === "PARAGRAPH_FILL" ? null : q.type === "FILL_BLANK" ? (
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
                  "w-full rounded-2xl border-2 px-5 py-4 text-xl font-bold text-center transition-all outline-none placeholder:text-primary/70",
                  verdict === "correct"
                    ? "border-success/50 bg-success/10 text-success"
                    : verdict === "wrong"
                      ? "border-rose-400 bg-rose-50 text-rose-800 quiz-shake"
                      : "border-primary/30 bg-primary/10 text-primary focus:border-primary focus:ring-2 focus:ring-primary",
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
                  ? "border-success/50 bg-success/10"
                  : isSelected
                    ? "border-rose-400 bg-rose-50"
                    : "border-input bg-card"
                : isSelected
                  ? "border-primary bg-primary/10 ring-2 ring-primary"
                  : "border-input bg-card hover:border-border";
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
                    <span className="grid h-6 w-6 place-items-center rounded-md border text-xs font-bold text-muted-foreground">
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
                  ? "border-success/50 bg-success/10 text-success"
                  : isSelected
                    ? "border-rose-400 bg-rose-50 text-rose-700"
                    : "border-input bg-card"
                : isSelected
                  ? "border-primary bg-primary/10 ring-2 ring-primary text-primary"
                  : "border-input bg-card hover:border-border";
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
          verdict === "correct" && "bg-success/15 border-success/40",
          verdict === "wrong" && "bg-rose-100 border-rose-300",
          verdict === "none" && "bg-card border-input",
        )}
      >
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
          {verdict === "correct" && (
            <>
              <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-success shadow">
                <Check className="h-7 w-7 stroke-[3]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-lg text-success">Làm tốt lắm!</div>
                {q.type !== "SPEAKING" && (
                  <div className="text-xs text-sage-700/80 mt-0.5">
                    Đáp án đúng:{" "}
                    <span className="font-bold">
                      {q.type === "FILL_BLANK"
                        ? q.options[0]?.label ?? "—"
                        : q.type === "PARAGRAPH_FILL"
                          ? q.options
                              .map((o) => o.label.split("/")[0])
                              .join(" · ")
                          : q.options[q.correctIndex]?.label ?? "—"}
                    </span>
                  </div>
                )}
                <button className="text-xs font-bold text-sage-700/70 inline-flex items-center gap-1 mt-0.5">
                  <Flag className="h-3 w-3" /> BÁO CÁO
                </button>
              </div>
              <button
                onClick={next}
                className="rounded-full bg-success hover:bg-success/90 text-success-foreground px-8 py-3 font-extrabold uppercase tracking-wider shadow"
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
                    : q.type === "PARAGRAPH_FILL"
                      ? q.options
                          .map((o) => o.label.split("/")[0])
                          .join(" · ")
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
                    ? "bg-sage-500 hover:bg-sage-600 text-white"
                    : "bg-muted text-muted-foreground cursor-not-allowed",
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
                  ? "border-sage-300 bg-white/70 text-sage-900"
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
      ? "border-success/50 bg-success/10 text-success"
      : verdict === "wrong"
        ? "border-rose-400 bg-rose-50 text-rose-800 quiz-shake"
        : "border-primary/30 bg-primary/10 text-primary focus:border-primary focus:ring-2 focus:ring-primary";
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
 * PARAGRAPH_FILL prompt rendered as a paragraph with one inline input per
 * blank. Same visual language as FillBlankInlinePrompt (sky / emerald /
 * rose tones for none / correct / wrong) but every blank gets its OWN
 * verdict color based on whether its answer matches options[i].label
 * (alternates separated by "/").
 *
 * The "correct answer" gets revealed inline on wrong submissions so the
 * user sees exactly what should have been there for each blank.
 */
function ParagraphFillInlinePrompt({
  prompt,
  values,
  onChange,
  onSubmit,
  locked,
  verdict,
  options,
}: {
  prompt: string;
  values: string[];
  onChange: (next: string[]) => void;
  onSubmit: () => void;
  locked: boolean;
  verdict: "none" | "correct" | "wrong";
  options: { label: string }[];
}) {
  const parts = prompt.split(BLANK_MARK);
  // Per-blank correctness lookup, computed only when the verdict is
  // revealed so admin-supplied alternates ("color/colour") drive both the
  // tone and the reveal text.
  const blankOk = (i: number): boolean => {
    const user = values[i]?.trim().toLowerCase() ?? "";
    const accepts = (options[i]?.label ?? "")
      .split("/")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    return accepts.includes(user);
  };
  const tone = (i: number): string => {
    if (verdict === "none") {
      return "border-primary/30 bg-primary/10 text-primary focus:border-primary focus:ring-2 focus:ring-primary";
    }
    return blankOk(i)
      ? "border-success/50 bg-success/10 text-success"
      : "border-rose-400 bg-rose-50 text-rose-800";
  };
  return (
    <div className="text-left max-w-2xl mx-auto">
      <p className="text-lg md:text-xl font-semibold leading-relaxed text-foreground">
        {parts.flatMap((seg, i) => {
          const nodes: React.ReactNode[] = [
            <span key={`seg-${i}`}>{seg}</span>,
          ];
          if (i < parts.length - 1) {
            const idx = i;
            const wrong = verdict === "wrong" && !blankOk(idx);
            nodes.push(
              <span key={`blank-${i}`} className="inline-block align-baseline">
                <input
                  type="text"
                  value={values[idx] ?? ""}
                  onChange={(e) => {
                    const next = [...values];
                    while (next.length <= idx) next.push("");
                    next[idx] = e.target.value;
                    onChange(next);
                  }}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !locked &&
                      values.every((v) => v.trim().length > 0)
                    ) {
                      e.preventDefault();
                      onSubmit();
                    }
                  }}
                  disabled={locked}
                  placeholder="..."
                  className={cn(
                    "inline-block min-w-[6ch] max-w-[18ch] rounded-md border-2 px-2 py-0.5 text-center font-extrabold outline-none transition-all",
                    tone(idx),
                  )}
                  size={Math.max(
                    Math.max(
                      values[idx]?.length ?? 0,
                      // After reveal, fit the displayed answer too so the
                      // input doesn't grow/shrink awkwardly.
                      verdict === "wrong"
                        ? (options[idx]?.label.split("/")[0]?.length ?? 0)
                        : 0,
                    ),
                    6,
                  )}
                />
                {wrong && (
                  <span className="ml-1 text-xs font-bold text-sage-700">
                    → {options[idx]?.label.split("/")[0] ?? ""}
                  </span>
                )}
              </span>,
            );
          }
          return nodes;
        })}
      </p>
      {verdict === "none" && (
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Điền hết các chỗ trống rồi nhấn Enter / nút Kiểm tra ở dưới.
        </p>
      )}
    </div>
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
      <div className="absolute inset-0 bg-sage-300/25 quiz-flash-green" />
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
            ? "bg-primary text-primary-foreground border-primary animate-pulse"
            : "bg-primary/10 text-primary border-primary/30 hover:bg-primary/15",
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
// Safety cap so a runaway recorder can't eat memory; UX-wise the timer just
// counts up and the candidate decides when to stop. The user explicitly
// asked: "chỉ đếm h thôi" — no forced auto-stop at a short limit.
const SPEAKING_MAX_SECONDS = 300;

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
              className="grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-honey to-honey-deep hover:from-honey-deep hover:to-honey-deep text-white shadow-xl shadow-honey/30 transition-transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
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
                  Đã nói <span className="font-bold text-rose-700">{formatDuration(elapsed)}</span> — bấm để dừng
                </div>
              </>
            ) : (
              <>
                <div className="font-extrabold text-honey-deep">Bấm mic để bắt đầu nói</div>
                <div className="text-xs text-muted-foreground">
                  Trả lời bằng tiếng Anh — bấm dừng khi xong, không giới hạn thời gian
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {transcribing && (
        <div className="flex flex-col items-center gap-2 py-4">
          <Loader2 className="h-8 w-8 animate-spin text-honey-deep" />
          <div className="text-sm font-semibold text-honey-deep">
            Đang chuyển giọng nói thành văn bản...
          </div>
        </div>
      )}

      {/* Live transcript while recording */}
      {recording && liveTranscript && (
        <div className="rounded-2xl border-2 border-primary/30 bg-primary/10 dark:bg-primary/10 dark:border-primary/30 p-4">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-primary mb-1">
            Bạn đang nói (live)
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-primary dark:text-primary">
            {liveTranscript}
          </p>
        </div>
      )}

      {/* Final transcript */}
      {hasTranscript && (
        <div className="rounded-2xl border-2 border-sage-300 bg-sage-50 dark:bg-sage-950/20 dark:border-sage-900 p-4">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-sage-600 mb-1 inline-flex items-center gap-1">
            <Check className="h-3.5 w-3.5" /> Bạn đã nói
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-sage-900 dark:text-sage-100">
            {transcript}
          </p>
          {!locked && (
            <button
              type="button"
              onClick={() => {
                onReset();
                setLiveTranscript("");
              }}
              className="mt-2 inline-flex items-center gap-1 rounded-full border border-sage-400 px-3 py-1 text-xs font-bold text-sage-700 hover:bg-sage-100"
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
 * IELTS Speaking Part-2 cue-card variant of SpeakingQuestion. Shows the
 * cue card topic + bullet points, runs a 60s preparation countdown
 * (skippable), then auto-starts MediaRecorder + a 120s speaking timer.
 * When the speak timer ends (or the candidate taps "Dừng sớm") the
 * recorder stops, the blob is sent to /api/speaking/transcribe for
 * Deepgram word-confidence, and onRecorded fires with the same shape
 * SpeakingQuestion uses — so the parent's grading flow doesn't have to
 * branch.
 */
const PART2_PREP_SEC = 60;
// Hint shown to the candidate as "mục tiêu IELTS" — NOT enforced. The user
// explicitly asked: in Vượt-band Part 2 + Part 3 the timer should only
// count, not auto-stop.
const PART2_TARGET_SEC = 120;
// Safety cap on the recorder — well above the 1-2 min IELTS target so it
// never bites real candidates, but stops a stuck microphone from eating
// memory if the page is left open.
const PART2_SAFETY_CAP_SEC = 300;

function SpeakingPart2Question({
  locked,
  transcript,
  cueCardTopic,
  cueCardPoints,
  onRecorded,
  onReset,
  onBeforeRecord,
}: {
  locked: boolean;
  transcript: string;
  cueCardTopic: string;
  cueCardPoints: string[];
  onRecorded: (rec: { audioUrl: string; transcript: string; lowConfWords: string[] }) => void;
  onReset: () => void;
  onBeforeRecord?: () => void;
}) {
  type Phase = "prep" | "speak" | "transcribing" | "done";
  const [phase, setPhase] = useState<Phase>("prep");
  const [prepRemaining, setPrepRemaining] = useState(PART2_PREP_SEC);
  // Counts UP — the candidate sees how long they've been talking so they
  // can self-pace against the IELTS 1-2 min target without being cut off.
  const [speakElapsed, setSpeakElapsed] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [permError, setPermError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const webSpeechRef = useRef<WebSpeechSession | null>(null);
  const prepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speakTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanupAudio = () => {
    if (speakTimerRef.current) clearInterval(speakTimerRef.current);
    speakTimerRef.current = null;
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

  // Belt-and-braces cleanup so navigating away mid-Part-2 kills the mic
  // indicator + timers.
  useEffect(() => {
    return () => {
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
      cleanupAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prep timer — runs while phase === "prep", auto-advances to "speak".
  useEffect(() => {
    if (phase !== "prep") return;
    setPrepRemaining(PART2_PREP_SEC);
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    prepTimerRef.current = setInterval(() => {
      setPrepRemaining((r) => {
        if (r <= 1) {
          if (prepTimerRef.current) clearInterval(prepTimerRef.current);
          setPhase("speak");
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    };
  }, [phase]);

  // Speak phase — auto-start mic + 120s countdown. Mic stop triggers the
  // transcribe → onRecorded chain.
  useEffect(() => {
    if (phase !== "speak") return;
    let cancelled = false;
    (async () => {
      onBeforeRecord?.();
      setPermError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const mr = new MediaRecorder(stream);
        chunksRef.current = [];
        mr.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        mr.onstop = async () => {
          const blobType = mr.mimeType || "audio/webm";
          const blob = new Blob(chunksRef.current, { type: blobType });
          const audioUrl = blob.size > 0 ? URL.createObjectURL(blob) : "";
          const browserTranscript = webSpeechRef.current?.getTranscript() ?? "";
          webSpeechRef.current?.stop();
          webSpeechRef.current = null;

          let finalTranscript = browserTranscript.trim();
          let lowConfWords: string[] = [];
          if (blob.size >= 1200) {
            setPhase("transcribing");
            try {
              const res = await fetch("/api/speaking/transcribe", {
                method: "POST",
                headers: { "Content-Type": blob.type || "audio/webm" },
                body: blob,
              });
              const data = await res.json();
              if (res.ok) {
                const text = (data.transcript ?? "").trim();
                if (text.length > 0) finalTranscript = text;
                const words = (data.words ?? []) as { word: string; confidence: number }[];
                lowConfWords = Array.from(
                  new Set(words.filter((w) => w.confidence < 0.7).map((w) => w.word)),
                );
              }
            } catch (e) {
              console.warn("[mini-quiz/part2 transcribe]", e);
            }
          }
          onRecorded({ audioUrl, transcript: finalTranscript, lowConfWords });
          setPhase("done");
        };

        if (isWebSpeechSupported()) {
          webSpeechRef.current = startWebSpeech({
            lang: "en-US",
            onInterim: (t) => setLiveTranscript(t),
            onError: (err) => console.warn("[mini-quiz/part2 web-speech]", err),
          });
        }

        mr.start();
        recorderRef.current = mr;
        setSpeakElapsed(0);
        if (speakTimerRef.current) clearInterval(speakTimerRef.current);
        // Count UP — purely informational. The recorder keeps going until
        // the candidate taps "Dừng" themselves; only the safety cap (5 min)
        // can interrupt to stop a runaway take.
        speakTimerRef.current = setInterval(() => {
          setSpeakElapsed((s) => {
            const next = s + 1;
            if (next >= PART2_SAFETY_CAP_SEC) {
              if (speakTimerRef.current) clearInterval(speakTimerRef.current);
              try {
                if (recorderRef.current && recorderRef.current.state !== "inactive") {
                  recorderRef.current.stop();
                }
              } catch {
                /* ignore */
              }
              return PART2_SAFETY_CAP_SEC;
            }
            return next;
          });
        }, 1000);
      } catch (e) {
        console.error("[mini-quiz/part2 getUserMedia]", e);
        setPermError(
          "Không truy cập được micro. Hãy cấp quyền micro trong trình duyệt rồi tải lại trang.",
        );
      }
    })();
    return () => {
      cancelled = true;
      cleanupAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const skipPrep = () => {
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    setPhase("speak");
  };
  const stopSpeakEarly = () => {
    if (speakTimerRef.current) clearInterval(speakTimerRef.current);
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
  const restart = () => {
    onReset();
    setLiveTranscript("");
    setPhase("prep");
  };

  return (
    <div className="w-full max-w-2xl space-y-3">
      {/* Cue card — always visible across prep/speak/done so the candidate
          can keep the bullets in sight while talking. The data-tour="cuecard"
          anchor lets the admin's Bee 🐝 hướng dẫn spotlight this box at any
          step of the tour (matches the option in BandClimbToursEditor).

          A built-in bee mascot is always docked to the top-right corner so
          even quizzes WITHOUT an authored bee tour get a visual hint that
          this is the deal-with-this-now panel — fulfils the user's
          "đứng gần phần đề bài màu vàng để hướng dẫn" requirement without
          forcing admin to wire up a tour step. The amber glow underneath
          keeps the eye locked on the cue card while the bee hovers. */}
      <div className="relative">
        <div
          data-tour="cuecard"
          className="cuecard-glow relative rounded-2xl border-2 border-gold-300 bg-gold-50 dark:bg-gold-950/30 dark:border-gold-800 p-4 space-y-2"
        >
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-gold-700 dark:text-gold-300 pr-12">
            IELTS Speaking · Part 2 · Cue card
          </div>
          <div className="font-extrabold text-lg leading-snug pr-12">{cueCardTopic}</div>
          <div className="text-xs font-bold text-gold-700 dark:text-gold-300">
            You should say:
          </div>
          <ul className="list-disc pl-5 text-sm space-y-0.5">
            {cueCardPoints.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
        {/* Floating bee mascot — sits half outside the top-right corner of
            the cue card so it visually "lands" on the panel. A tiny speech
            bubble points back at the topic. pointer-events:none so it never
            blocks taps on the bullets behind it. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-4 -right-2 sm:-right-3 flex items-start gap-1"
        >
          <div className="cuecard-bee-bubble hidden sm:block rounded-2xl bg-gold-500 text-white text-[10px] font-extrabold uppercase tracking-widest px-2 py-1 shadow-lg shadow-gold-500/40">
            Đề Part 2 ↓
          </div>
          <div className="cuecard-bee grid h-10 w-10 sm:h-11 sm:w-11 place-items-center rounded-full bg-gradient-to-br from-gold-300 to-gold-400 text-2xl shadow-xl shadow-gold-500/40 ring-2 ring-gold-500/50">
            🐝
          </div>
        </div>
      </div>

      {phase === "prep" && (
        <div className="rounded-2xl border-2 border-honey/30 bg-honey-tint dark:bg-honey/10 dark:border-honey/40 p-4 text-center space-y-2">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-honey-deep dark:text-honey">
            Chuẩn bị (1 phút)
          </div>
          <div className="text-4xl font-extrabold tabular-nums">
            {formatDuration(prepRemaining)}
          </div>
          <p className="text-xs text-muted-foreground">
            Suy nghĩ ý + dàn bài. Có thể bỏ qua nếu đã sẵn sàng.
          </p>
          <button
            type="button"
            onClick={skipPrep}
            disabled={locked}
            className="inline-flex items-center gap-1.5 rounded-full bg-honey hover:bg-honey-deep px-5 py-2 text-white font-bold text-sm shadow disabled:opacity-50"
          >
            <Mic className="h-4 w-4" /> Bỏ qua, nói luôn →
          </button>
        </div>
      )}

      {phase === "speak" && (
        <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900 p-4 space-y-2 text-center">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-rose-700 dark:text-rose-300">
            Đang nói (mục tiêu IELTS: {formatDuration(PART2_TARGET_SEC)})
          </div>
          <div className="text-4xl font-extrabold tabular-nums">
            {formatDuration(speakElapsed)}
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-sm text-rose-700 dark:text-rose-200 font-semibold">
              {speakElapsed >= PART2_TARGET_SEC
                ? "Đã vượt mốc 2 phút — bấm dừng khi xong"
                : "Đang ghi âm — cứ nói tự nhiên, không bị cắt giờ"}
            </span>
          </div>
          <button
            type="button"
            onClick={stopSpeakEarly}
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 hover:bg-rose-600 px-5 py-2 text-white font-bold text-sm shadow"
          >
            <Square className="h-4 w-4 fill-current" /> Dừng
          </button>
          {liveTranscript && (
            <div className="rounded-xl border-2 border-primary/30 bg-primary/10 dark:bg-primary/10 dark:border-primary/30 p-3 text-left">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-primary mb-1">
                Bạn đang nói (live)
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-primary dark:text-primary">
                {liveTranscript}
              </p>
            </div>
          )}
        </div>
      )}

      {phase === "transcribing" && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border-2 border-honey/30 bg-honey-tint dark:bg-honey/10 dark:border-honey/40 p-4">
          <Loader2 className="h-5 w-5 animate-spin text-honey-deep" />
          <span className="text-sm font-semibold text-honey-deep dark:text-honey">
            Đang chuyển giọng nói thành văn bản...
          </span>
        </div>
      )}

      {phase === "done" && transcript && (
        <div className="rounded-2xl border-2 border-sage-300 bg-sage-50 dark:bg-sage-950/20 dark:border-sage-900 p-4">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-sage-600 mb-1 inline-flex items-center gap-1">
            <Check className="h-3.5 w-3.5" /> Bạn đã nói
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-sage-900 dark:text-sage-100">
            {transcript}
          </p>
          {!locked && (
            <button
              type="button"
              onClick={restart}
              className="mt-2 inline-flex items-center gap-1 rounded-full border border-sage-400 px-3 py-1 text-xs font-bold text-sage-700 hover:bg-sage-100"
            >
              <Mic className="h-3 w-3" /> Làm lại Part 2
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
            ? "bg-honey text-white border-honey-deep animate-pulse"
            : "bg-honey-tint text-honey-deep border-honey/40 hover:bg-honey/20",
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
            cho phần này. Bấm <strong className="text-sage-700">Thêm vào học từ</strong> để
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
                <p className="text-xs italic text-muted-foreground dark:text-muted-foreground mt-2 border-l-2 border-sage-400 pl-2">
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
            className="rounded-full border-2 border-border hover:border-border text-foreground dark:text-muted-foreground px-6 py-2.5 text-sm font-bold disabled:opacity-50"
          >
            Bỏ qua, vào làm bài
          </button>
          {imported ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-sage-500 hover:bg-sage-600 px-6 py-2.5 text-white font-extrabold uppercase tracking-wider shadow inline-flex items-center gap-2"
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
                  ? "bg-sage-400 text-white cursor-wait"
                  : "bg-gradient-to-r from-sage-500 to-teal-600 hover:from-sage-600 hover:to-teal-700 text-white",
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
      <div className="w-full max-w-2xl rounded-2xl border-2 border-honey/30 bg-honey-tint dark:bg-honey/10 dark:border-honey/40 p-4 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-honey-deep shrink-0" />
        <div className="text-sm font-semibold text-honey-deep dark:text-honey">
          AI đang nghe lại và chấm phát âm của bạn...
        </div>
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className="w-full max-w-2xl rounded-2xl border-2 border-gold-300 bg-gold-50 dark:bg-gold-950/20 p-4 text-sm text-gold-900 dark:text-gold-100">
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
      <div className="w-full max-w-2xl rounded-2xl border-2 border-gold-300 bg-gold-50 dark:bg-gold-950/20 p-4 text-sm text-gold-900 dark:text-gold-100">
        {state.summary}
      </div>
    );
  }
  // Color the band pill by IELTS-style tiers so the user gets an at-a-glance
  // signal without reading the summary first.
  const band = state.quickBand;
  const tone =
    band >= 7
      ? "bg-sage-100 text-sage-700 border-sage-300 dark:bg-sage-950/40 dark:text-sage-200 dark:border-sage-800"
      : band >= 5.5
        ? "bg-primary/10 text-primary border-primary/30 dark:bg-primary/10 dark:text-primary dark:border-primary/30"
        : band >= 4
          ? "bg-gold-100 text-gold-800 border-gold-300 dark:bg-gold-950/40 dark:text-gold-200 dark:border-gold-800"
          : "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800";
  return (
    <div className="w-full max-w-2xl rounded-2xl border-2 border-honey/30 dark:border-honey/40 bg-honey-tint/60 dark:bg-honey/10 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-honey-deep" />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-honey-deep dark:text-honey">
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
          <div className="text-[11px] font-extrabold uppercase tracking-widest text-sage-700 dark:text-sage-300 inline-flex items-center gap-1.5">
            <Wand2 className="h-3.5 w-3.5" /> Lỗi & cách sửa
          </div>
          <div className="space-y-1.5">
            {state.grammarFixes.map((g, i) => (
              <div
                key={i}
                className="rounded-lg border bg-card p-2.5 text-sm space-y-1"
              >
                <p className="text-rose-600 line-through">{g.original}</p>
                <p className="text-sage-700 font-semibold">✅ {g.corrected}</p>
                <p className="text-xs text-muted-foreground">{g.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.betterPhrasing && (
        <div className="rounded-lg border-2 border-honey/30 dark:border-honey/40 bg-honey-tint dark:bg-honey/10 p-2.5 text-sm">
          <div className="text-[11px] font-extrabold uppercase tracking-widest text-honey-deep dark:text-honey mb-1 inline-flex items-center gap-1.5">
            <MessageSquareQuote className="h-3.5 w-3.5" /> Cách nói band 7+
          </div>
          <p className="text-ink dark:text-honey/90 italic">
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
        if (!rec) return null;
        const isPart2 = !!qq.cueCardPoints && qq.cueCardPoints.length > 0;
        const question = isPart2
          ? `[Part 2 cue card] ${qq.prompt} — Points: ${qq.cueCardPoints!.join("; ")}`
          : qq.prompt;
        return {
          question,
          transcript: rec.transcript,
          lowConfidenceWords: rec.lowConfWords,
        };
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
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-honey-deep">
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
                  <p className="text-xs text-gold-700 italic">
                    Bạn đã bỏ qua không ghi âm câu này.
                  </p>
                )}
                {rec?.transcript && (
                  <p className="text-sm rounded-lg border-l-2 border-sage-400 bg-sage-50/40 dark:bg-sage-950/20 pl-3 py-2 italic">
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
                          <span className="text-sage-700 font-semibold">
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
                  <Wand2 className="h-5 w-5 text-sage-500" /> Tổng hợp ngữ pháp
                </h3>
                <div className="space-y-2">
                  {finalGrade.corrections.map((c, i) => (
                    <div key={i} className="rounded-lg border p-2.5 text-sm space-y-1">
                      <p className="text-rose-600 line-through">{c.original}</p>
                      <p className="text-sage-700 font-semibold">✅ {c.corrected}</p>
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
            <div className="rounded-2xl border-2 border-honey/30 dark:border-honey/40 bg-honey-tint dark:bg-honey/10 p-4">
              <h3 className="font-extrabold inline-flex items-center gap-2 text-honey-deep dark:text-honey mb-2">
                <MessageSquareQuote className="h-5 w-5" /> Bài trả lời mẫu band 7.5
              </h3>
              <p className="text-sm leading-relaxed italic text-ink dark:text-honey/90">
                {finalGrade.improvedSample}
              </p>
            </div>
          )}

        <div className="pt-2 pb-6 flex justify-center">
          <button
            onClick={onExit}
            className="rounded-full bg-sage-500 hover:bg-sage-600 px-8 py-3 text-white font-extrabold uppercase tracking-wider shadow"
          >
            Hoàn tất
          </button>
        </div>
      </div>
    </div>
  );
}
