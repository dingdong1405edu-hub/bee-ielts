"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Headphones, BookOpen, PenLine, Mic, GraduationCap, Trophy, Loader2, Maximize2, Minimize2, Volume2, Printer, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BreakTimer } from "./break-timer";
import { MockListening } from "./section-listening";
import { MockReading } from "./section-reading";
import { MockWriting } from "./section-writing";
import { MockSpeaking, type MockSpeakingResult } from "./section-speaking";
import {Leaf, MascotBubble, BeeMascot } from "@/components/brand";
import { toast } from "sonner";

/** Best-effort fullscreen request; ignores failures (some browsers / iframes block). */
async function enterFullscreen() {
  if (typeof document === "undefined") return;
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
  try {
    if (el.requestFullscreen) await el.requestFullscreen();
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
  } catch {
    // user denied or browser blocked — silently skip
  }
}

async function exitFullscreen() {
  if (typeof document === "undefined") return;
  const d = document as Document & { webkitExitFullscreen?: () => Promise<void> };
  try {
    if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
    else if (d.webkitExitFullscreen) await d.webkitExitFullscreen();
  } catch {
    // ignore
  }
}

type Stage =
  | "intro"
  | "listening"
  | "reading"
  | "break"
  | "writing"
  | "speaking"
  | "grading"
  | "done";

type Q = {
  id: string;
  type: "MCQ" | "FILL_BLANK" | "TRUE_FALSE" | "TRUE_FALSE_NOT_GIVEN" | "MATCHING" | "MATCHING_HEADINGS" | "MATCHING_INFO" | "MATCHING_FEATURES" | "MATCHING_SENTENCE_ENDINGS" | "SHORT_ANSWER";
  prompt: string;
  options: string[] | null;
  correctAnswer: string;
  formGroup?: string | null;
};

interface Props {
  targetBand: number;
  listenings: { id: string; title: string; section: number; audioUrl: string; imageUrl?: string | null; contentImageUrl?: string | null; transcript: string | null; questions: Q[] }[];
  readings: { id: string; title: string; level: string; passage: string; imageUrl?: string | null; questions: Q[] }[];
  writing: {
    task1: { id: string; prompt: string; minWords: number; diagramSvg: string | null };
    task2: { id: string; prompt: string; minWords: number };
  };
  speaking: {
    id: string;
    topic: string;
    imageUrl?: string | null;
    part1Questions: string[];
    part2CueCard: { topic: string; points: string[] };
    part3Questions: string[];
  };
}

export function MockRunner({ targetBand, listenings, readings, writing, speaking }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("intro");
  const [listeningAns, setListeningAns] = useState<Record<string, string>>({});
  const [readingAns, setReadingAns] = useState<Record<string, string>>({});
  const [writingEssays, setWritingEssays] = useState<{ essay1: string; essay2: string }>({
    essay1: "",
    essay2: "",
  });
  const [speakingTranscripts, setSpeakingTranscripts] = useState<{ 1: string; 2: string; 3: string }>({ 1: "", 2: "", 3: "" });
  // Per-part audio blob URLs + low-confidence words. Used by MockResultView
  // for in-session playback (browser-only — blob URLs die on navigation)
  // and to enrich the speaking grade with pronunciation evidence.
  const speakingRecordingsRef = useRef<MockSpeakingResult | null>(null);
  const [result, setResult] = useState<MockResult | null>(null);
  const [isFs, setIsFs] = useState(false);

  // Track fullscreen state so the toggle button reflects reality (user can press Esc).
  useEffect(() => {
    const onChange = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // When the candidate finishes (or aborts), drop back out of fullscreen.
  useEffect(() => {
    if (stage === "done" || stage === "intro") exitFullscreen();
  }, [stage]);

  // Exam mode: hide the learn-layout chrome (sidebar + topbar + floating
  // helpers) once the candidate enters any test stage, regardless of
  // whether they've also entered browser fullscreen.
  useEffect(() => {
    const inTest =
      stage === "listening" ||
      stage === "reading" ||
      stage === "break" ||
      stage === "writing" ||
      stage === "speaking";
    if (inTest) document.body.classList.add("mock-exam");
    else document.body.classList.remove("mock-exam");
    return () => document.body.classList.remove("mock-exam");
  }, [stage]);

  const startMock = async () => {
    await enterFullscreen();
    setStage("listening");
  };

  const toggleFs = async () => {
    if (document.fullscreenElement) await exitFullscreen();
    else await enterFullscreen();
  };

  const submitMock = async (recordings: MockSpeakingResult) => {
    const transcripts = {
      1: recordings[1].transcript,
      2: recordings[2].transcript,
      3: recordings[3].transcript,
    };
    // Merge low-confidence words across parts — feeds the speaking grader's
    // Pronunciation criterion the same way the practice player does.
    const lowConfidenceWords = Array.from(
      new Set([
        ...recordings[1].lowConfWords,
        ...recordings[2].lowConfWords,
        ...recordings[3].lowConfWords,
      ]),
    );
    setStage("grading");
    try {
      const res = await fetch("/api/mock/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listening: {
            testIds: listenings.map((l) => l.id),
            answers: listeningAns,
            questions: listenings.flatMap((l) => l.questions.map((q) => ({ id: q.id, correctAnswer: q.correctAnswer, type: q.type }))),
          },
          reading: {
            testIds: readings.map((r) => r.id),
            answers: readingAns,
            questions: readings.flatMap((r) => r.questions.map((q) => ({ id: q.id, correctAnswer: q.correctAnswer, type: q.type }))),
          },
          writing: {
            task1Id: writing.task1.id,
            essay1: writingEssays.essay1,
            task2Id: writing.task2.id,
            essay2: writingEssays.essay2,
          },
          speaking: {
            setId: speaking.id,
            topic: speaking.topic,
            transcripts,
            lowConfidenceWords,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      setStage("done");
    } catch (e) {
      console.error(e);
      toast.error("Chấm bài thất bại. Đã lưu draft.");
      setStage("done");
    }
  };

  if (stage === "intro") {
    return (
      <div className="max-w-2xl mx-auto py-10 space-y-6">
        <div className="relative overflow-hidden rounded-3xl">
          
          <div className="relative text-center space-y-3 py-4">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl gradient-brand text-white shadow-lg shadow-primary/30">
              <GraduationCap className="h-8 w-8" />
            </div>
            <h1 className="flex items-center justify-center gap-2 text-3xl font-extrabold tracking-tight">
              <Leaf className="h-5 w-5 text-leaf" />
              Sẵn sàng thi thử?
            </h1>
            <p className="text-muted-foreground">Đề được chọn theo target band {targetBand.toFixed(1)} của bạn.</p>
          </div>
        </div>
        <MascotBubble tone="tip">Hít thở sâu nào — cứ làm hết sức, ong sẽ chấm bài cho bạn!</MascotBubble>
        <Card>
          <CardContent className="p-5 text-sm space-y-2">
            <p>📋 Listening → Reading (60′, 4 bài) → nghỉ 15′ → Writing (60′, 2 task) → Speaking (3 part)</p>
            <p>⏸ Có 1 lần nghỉ 15 phút sau Reading (có thể skip)</p>
            <p>🚫 Khi bắt đầu rồi thì không thể quay lại phần / section trước</p>
            <p>🖥️ Tự bật toàn màn hình khi bắt đầu — nhấn Esc để thoát bất kỳ lúc nào</p>
            <p>📊 Cuối bài AI sẽ chấm cả 4 kỹ năng</p>
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button variant="outline" size="xl" className="flex-1 rounded-full" onClick={() => router.push("/mock")}>
            Quay lại
          </Button>
          <Button variant="brand" size="xl" className="flex-1 rounded-full" onClick={startMock}>
            Bắt đầu →
          </Button>
        </div>
      </div>
    );
  }

  const fsToggle = <FsToggle isFs={isFs} onClick={toggleFs} />;

  if (stage === "listening") {
    return (
      <>
        <MockListening
          sections={listenings}
          timeLimit={30 * 60}
          onDone={(ans) => {
            setListeningAns(ans);
            setStage("reading");
          }}
        />
        {fsToggle}
      </>
    );
  }

  if (stage === "reading") {
    return (
      <>
        <MockReading
          passages={readings}
          timeLimit={60 * 60}
          onDone={(ans) => {
            setReadingAns(ans);
            setStage("break");
          }}
        />
        {fsToggle}
      </>
    );
  }
  if (stage === "break")
    return (
      <>
        <BreakTimer seconds={15 * 60} onDone={() => setStage("writing")} />
        {fsToggle}
      </>
    );

  if (stage === "writing") {
    return (
      <>
        <MockWriting
          task1={writing.task1}
          task2={writing.task2}
          timeLimit={60 * 60}
          onDone={(essays) => {
            setWritingEssays(essays);
            setStage("speaking");
          }}
        />
        {fsToggle}
      </>
    );
  }

  if (stage === "speaking") {
    return (
      <>
        <MockSpeaking
          topic={speaking.topic}
          imageUrl={speaking.imageUrl}
          part1Questions={speaking.part1Questions}
          part2CueCard={speaking.part2CueCard}
          // Mock exam intentionally trims Part 3 to a single question so the
          // 4-skill test fits inside one sitting; the per-set library keeps
          // the full Part 3 for non-mock practice.
          part3Questions={speaking.part3Questions.slice(0, 1)}
          onDone={(recordings) => {
            speakingRecordingsRef.current = recordings;
            setSpeakingTranscripts({
              1: recordings[1].transcript,
              2: recordings[2].transcript,
              3: recordings[3].transcript,
            });
            submitMock(recordings);
          }}
        />
        {fsToggle}
      </>
    );
  }

  if (stage === "grading") {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <h2 className="text-2xl font-extrabold">AI đang chấm bài...</h2>
          <p className="text-muted-foreground max-w-md">Đợi 30-60 giây cho cả 4 kỹ năng. Đừng đóng tab nhé.</p>
        </div>
      </div>
    );
  }

  if (stage === "done" && result) {
    return (
      <MockResultView
        result={result}
        listenings={listenings}
        readings={readings}
        listeningAns={listeningAns}
        readingAns={readingAns}
        writing={writing}
        writingEssays={writingEssays}
        speaking={speaking}
        speakingRecordings={speakingRecordingsRef.current}
        onBack={() => router.push("/mock")}
      />
    );
  }

  return null;
}

type AiCriteriaBlock = {
  band: number;
  feedback: string;
  note?: string;
};
type AiSpeakingResult = {
  overallBand: number;
  criteria?: {
    fluencyCoherence?: AiCriteriaBlock;
    lexicalResource?: AiCriteriaBlock;
    grammaticalRange?: AiCriteriaBlock;
    pronunciation?: AiCriteriaBlock;
  };
  corrections?: { original: string; corrected: string; explanation: string }[];
  pronunciationFixes?: { word: string; ipa: string; tip: string }[];
  improvedSample?: string;
  summary?: string;
};
type AiWritingResult = {
  overallBand: number;
  criteria?: {
    taskAchievement?: AiCriteriaBlock;
    coherenceCohesion?: AiCriteriaBlock;
    lexicalResource?: AiCriteriaBlock;
    grammaticalRange?: AiCriteriaBlock;
  };
  annotations?: { excerpt: string; issue: string; suggestion: string }[];
  improvedVersion?: string;
  summary?: string;
};
type MockResult = {
  attemptId: string;
  overallBand: number;
  perSkill: {
    listening: { band: number; correct: number; total: number; attempted?: number };
    reading: { band: number; correct: number; total: number; attempted?: number };
    writing: { band: number; feedback: string };
    speaking: { band: number; feedback: string };
  };
  grading?: {
    listening?: { id: string; correctAnswer: string; userAnswer: string; isCorrect: boolean }[];
    reading?: { id: string; correctAnswer: string; userAnswer: string; isCorrect: boolean }[];
  };
  ai?: {
    writing1?: AiWritingResult | null;
    writing2?: AiWritingResult | null;
    speaking?: AiSpeakingResult | null;
  };
  summary: string;
};

function MockResultView({
  result,
  listenings,
  readings,
  listeningAns,
  readingAns,
  writing,
  writingEssays,
  speaking,
  speakingRecordings,
  onBack,
}: {
  result: MockResult;
  listenings: Props["listenings"];
  readings: Props["readings"];
  listeningAns: Record<string, string>;
  readingAns: Record<string, string>;
  writing: Props["writing"];
  writingEssays: { essay1: string; essay2: string };
  speaking: Props["speaking"];
  speakingRecordings: MockSpeakingResult | null;
  onBack: () => void;
}) {
  const router = useRouter();
  const today = new Date().toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Quick-lookup map for grading results coming back from the server so we
  // can render ✓/✗ per question without re-running isAnswerCorrect on the
  // client (which would need to import the same util).
  const lGrading = new Map(
    (result.grading?.listening ?? []).map((g) => [g.id, g]),
  );
  const rGrading = new Map(
    (result.grading?.reading ?? []).map((g) => [g.id, g]),
  );

  const skills: {
    key: "listening" | "reading" | "writing" | "speaking";
    label: string;
    icon: React.ElementType;
    grad: string;
    band: number;
    note: string;
  }[] = [
    {
      key: "listening",
      label: "Listening",
      icon: Headphones,
      grad: "from-gold-400 to-gold-600",
      band: result.perSkill.listening.band,
      note: `${result.perSkill.listening.correct}/${result.perSkill.listening.total} câu đúng`,
    },
    {
      key: "reading",
      label: "Reading",
      icon: BookOpen,
      grad: "from-sage-500 to-teal-500",
      band: result.perSkill.reading.band,
      note: `${result.perSkill.reading.correct}/${result.perSkill.reading.total} câu đúng`,
    },
    {
      key: "writing",
      label: "Writing",
      icon: PenLine,
      grad: "from-honey to-honey-deep",
      band: result.perSkill.writing.band,
      note: "AI chấm theo 4 tiêu chí",
    },
    {
      key: "speaking",
      label: "Speaking",
      icon: Mic,
      grad: "from-leaf to-leaf-deep",
      band: result.perSkill.speaking.band,
      note: "AI chấm theo 4 tiêu chí",
    },
  ];

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 print:max-w-none print:space-y-3">
      {/* Top action bar — hidden in print so PDF stays clean */}
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Button onClick={onBack} variant="outline" size="sm" className="rounded-full">
          ← Về trang Mock
        </Button>
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline" size="sm" className="rounded-full">
            <Printer className="h-4 w-4" /> In / Xuất PDF
          </Button>
          <Button
            onClick={() => router.push(`/mock/review/${result.attemptId}?skill=reading`)}
            variant="outline"
            size="sm"
            className="rounded-full"
          >
            <FileDown className="h-4 w-4" /> Review chi tiết
          </Button>
        </div>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl print:overflow-visible">
        
        <div className="relative text-center space-y-2 py-4 print:text-left print:py-0">
          <BeeMascot className="mx-auto w-16 drop-shadow-sm print:hidden" />
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl gradient-brand text-white shadow-lg shadow-primary/30 print:hidden">
            <Trophy className="h-8 w-8" />
          </div>
          <div className="text-[10px] uppercase tracking-widest font-extrabold text-muted-foreground print:text-foreground">
            IELTS Bee · Bài thi thử
          </div>
          <h1 className="flex items-center justify-center gap-2 text-3xl font-extrabold tracking-tight print:justify-start">
            <Leaf className="h-5 w-5 text-leaf print:hidden" />
            Bài thi thử — Kết quả
          </h1>
          <p className="text-xs text-muted-foreground print:text-foreground/70">{today}</p>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-primary/10 to-accent border-2 border-primary/20">
        <CardContent className="p-6 text-center print:p-4">
          <div className="text-sm text-muted-foreground">Overall Band</div>
          <div className="text-6xl font-extrabold gradient-brand-text mt-1">{result.overallBand.toFixed(1)}</div>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{result.summary}</p>
        </CardContent>
      </Card>

      {/* Per-skill summary cards */}
      <div className="grid sm:grid-cols-4 gap-3 print:gap-2">
        {skills.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.key}
              className="rounded-2xl border bg-card p-3 text-center print:border-border"
            >
              <div className={`mx-auto grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${s.grad} text-white print:hidden`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-xs font-bold mt-2">{s.label}</div>
              <div className="text-2xl font-extrabold mt-1">{s.band.toFixed(1)}</div>
              <div className="text-[10px] text-muted-foreground">{s.note}</div>
            </div>
          );
        })}
      </div>

      {/* SECTION: Listening — per-question */}
      <ResultSection
        icon={Headphones}
        label="Listening"
        bandSummary={`Band ${result.perSkill.listening.band.toFixed(1)} · ${result.perSkill.listening.correct}/${result.perSkill.listening.total} đúng`}
        gradient="from-gold-400 to-gold-600"
      >
        {listenings.flatMap((sec) =>
          sec.questions.map((q, i) => {
            const g = lGrading.get(q.id);
            const userA = g?.userAnswer ?? listeningAns[q.id] ?? "";
            return (
              <QARow
                key={q.id}
                idx={i + 1}
                section={sec.title}
                prompt={q.prompt}
                userAnswer={userA}
                correctAnswer={g?.correctAnswer ?? q.correctAnswer}
                isCorrect={g?.isCorrect ?? false}
              />
            );
          }),
        )}
      </ResultSection>

      {/* SECTION: Reading — per-question */}
      <ResultSection
        icon={BookOpen}
        label="Reading"
        bandSummary={`Band ${result.perSkill.reading.band.toFixed(1)} · ${result.perSkill.reading.correct}/${result.perSkill.reading.total} đúng`}
        gradient="from-sage-500 to-teal-500"
      >
        {readings.flatMap((sec) =>
          sec.questions.map((q, i) => {
            const g = rGrading.get(q.id);
            const userA = g?.userAnswer ?? readingAns[q.id] ?? "";
            return (
              <QARow
                key={q.id}
                idx={i + 1}
                section={sec.title}
                prompt={q.prompt}
                userAnswer={userA}
                correctAnswer={g?.correctAnswer ?? q.correctAnswer}
                isCorrect={g?.isCorrect ?? false}
              />
            );
          }),
        )}
      </ResultSection>

      {/* SECTION: Writing */}
      <ResultSection
        icon={PenLine}
        label="Writing"
        bandSummary={`Band ${result.perSkill.writing.band.toFixed(1)}`}
        gradient="from-honey to-honey-deep"
      >
        <WritingTaskBlock
          taskType={1}
          prompt={writing.task1.prompt}
          essay={writingEssays.essay1}
          ai={result.ai?.writing1 ?? null}
        />
        <WritingTaskBlock
          taskType={2}
          prompt={writing.task2.prompt}
          essay={writingEssays.essay2}
          ai={result.ai?.writing2 ?? null}
        />
      </ResultSection>

      {/* SECTION: Speaking */}
      <ResultSection
        icon={Mic}
        label="Speaking"
        bandSummary={`Band ${result.perSkill.speaking.band.toFixed(1)}`}
        gradient="from-leaf to-leaf-deep"
      >
        <SpeakingResultBlock
          topic={speaking.topic}
          part1Questions={speaking.part1Questions}
          part2CueCard={speaking.part2CueCard}
          part3Questions={speaking.part3Questions.slice(0, 1)}
          recordings={speakingRecordings}
          ai={result.ai?.speaking ?? null}
        />
      </ResultSection>

      <Button onClick={onBack} variant="outline" size="xl" className="w-full rounded-full print:hidden">
        Về trang Mock
      </Button>
    </div>
  );
}

/**
 * Container for one full skill section in the inline mock review — fixed
 * gradient header + section-scoped content. Used by all 4 sections so the
 * "thi thử" review reads as a single coherent document (and stays that way
 * when the user hits Print / Save as PDF).
 */
function ResultSection({
  icon: Icon,
  label,
  bandSummary,
  gradient,
  children,
}: {
  icon: React.ElementType;
  label: string;
  bandSummary: string;
  gradient: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border-2 overflow-hidden break-inside-avoid print:border-border">
      <div
        className={`bg-gradient-to-r ${gradient} text-white px-4 py-2.5 flex items-center justify-between print:bg-foreground`}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="font-extrabold">{label}</span>
        </div>
        <span className="text-xs font-bold opacity-90">{bandSummary}</span>
      </div>
      <div className="p-4 space-y-3 bg-card">{children}</div>
    </div>
  );
}

/** One question/answer row used by Listening + Reading sections. */
function QARow({
  idx,
  section,
  prompt,
  userAnswer,
  correctAnswer,
  isCorrect,
}: {
  idx: number;
  section: string;
  prompt: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}) {
  const hadAnswer = userAnswer.trim().length > 0;
  return (
    <div className="rounded-xl border bg-card p-3 text-sm break-inside-avoid">
      <div className="flex items-start gap-2">
        <div
          className={`shrink-0 grid h-6 w-6 place-items-center rounded-md text-[11px] font-extrabold ${
            isCorrect
              ? "bg-sage-100 text-sage-700"
              : hadAnswer
                ? "bg-rose-100 text-rose-700"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {idx}
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            {section}
          </div>
          <div className="font-semibold whitespace-pre-wrap">{prompt}</div>
          <div className="grid sm:grid-cols-2 gap-1.5 text-xs">
            <div
              className={`rounded-md border px-2 py-1 ${
                isCorrect
                  ? "border-sage-300 bg-sage-50 dark:bg-sage-950/30"
                  : hadAnswer
                    ? "border-rose-300 bg-rose-50 dark:bg-rose-950/30"
                    : "border-border bg-muted dark:bg-muted"
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                Bạn trả lời
              </div>
              <div className="font-mono">
                {hadAnswer ? userAnswer : <span className="opacity-60 italic">(bỏ trống)</span>}
              </div>
            </div>
            <div className="rounded-md border border-sage-400 bg-sage-50 dark:bg-sage-950/30 px-2 py-1">
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                Đáp án đúng
              </div>
              <div className="font-mono">{correctAnswer}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Writing Task block with prompt, essay text, and AI criteria summary. */
function WritingTaskBlock({
  taskType,
  prompt,
  essay,
  ai,
}: {
  taskType: 1 | 2;
  prompt: string;
  essay: string;
  ai: AiWritingResult | null | undefined;
}) {
  return (
    <div className="rounded-xl border bg-card p-3 space-y-2 text-sm break-inside-avoid">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="font-extrabold">Task {taskType}</div>
        {ai && (
          <div className="text-xs font-bold text-primary">
            Band {ai.overallBand.toFixed(1)}
          </div>
        )}
      </div>
      <div className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
        Đề bài
      </div>
      <p className="whitespace-pre-wrap leading-relaxed">{prompt}</p>
      <div className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
        Bài viết của bạn ({essay.trim().split(/\s+/).filter(Boolean).length} từ)
      </div>
      {essay.trim() ? (
        <p className="whitespace-pre-wrap leading-relaxed rounded-md border bg-muted/30 p-2.5 font-serif">
          {essay}
        </p>
      ) : (
        <p className="italic text-muted-foreground">Không nộp bài.</p>
      )}
      {ai?.criteria && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
          {Object.entries(ai.criteria).map(([k, v]) =>
            v ? (
              <div key={k} className="rounded-md border p-1.5">
                <div className="text-[9px] uppercase tracking-wider opacity-70">
                  {k}
                </div>
                <div className="font-bold">{v.band.toFixed(1)}</div>
                <div className="text-[10px] text-muted-foreground line-clamp-2">
                  {v.feedback}
                </div>
              </div>
            ) : null,
          )}
        </div>
      )}
      {ai?.summary && (
        <p className="text-xs italic text-muted-foreground">{ai.summary}</p>
      )}
    </div>
  );
}

/** Speaking section block — per-part audio replay + transcripts + AI fixes. */
function SpeakingResultBlock({
  topic,
  part1Questions,
  part2CueCard,
  part3Questions,
  recordings,
  ai,
}: {
  topic: string;
  part1Questions: string[];
  part2CueCard: { topic: string; points: string[] };
  part3Questions: string[];
  recordings: MockSpeakingResult | null;
  ai: AiSpeakingResult | null | undefined;
}) {
  const part1Txt = recordings?.[1].transcript ?? "";
  const part2Txt = recordings?.[2].transcript ?? "";
  const part3Txt = recordings?.[3].transcript ?? "";

  return (
    <div className="space-y-3 text-sm">
      <div className="rounded-xl border bg-card p-3 break-inside-avoid">
        <div className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
          Chủ đề
        </div>
        <p className="font-semibold">{topic}</p>
      </div>

      <PartBlock
        label="Part 1"
        questions={part1Questions}
        transcript={part1Txt}
        audioUrl={recordings?.[1].audioUrl}
      />
      <PartBlock
        label="Part 2"
        questions={[part2CueCard.topic, ...part2CueCard.points]}
        transcript={part2Txt}
        audioUrl={recordings?.[2].audioUrl}
      />
      <PartBlock
        label="Part 3"
        questions={part3Questions}
        transcript={part3Txt}
        audioUrl={recordings?.[3].audioUrl}
      />

      {ai?.criteria && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs break-inside-avoid">
          {Object.entries(ai.criteria).map(([k, v]) =>
            v ? (
              <div key={k} className="rounded-md border p-1.5">
                <div className="text-[9px] uppercase tracking-wider opacity-70">
                  {k}
                </div>
                <div className="font-bold">{v.band.toFixed(1)}</div>
                <div className="text-[10px] text-muted-foreground line-clamp-2">
                  {v.feedback}
                </div>
              </div>
            ) : null,
          )}
        </div>
      )}

      {ai?.pronunciationFixes && ai.pronunciationFixes.length > 0 && (
        <div className="rounded-xl border bg-card p-3 break-inside-avoid">
          <div className="text-[11px] uppercase tracking-wider font-bold text-rose-700 mb-1.5 inline-flex items-center gap-1.5">
            <Volume2 className="h-3 w-3" /> Sửa phát âm
          </div>
          <div className="grid sm:grid-cols-2 gap-1.5">
            {ai.pronunciationFixes.map((p, i) => (
              <div key={i} className="rounded-md border p-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold">{p.word}</span>
                  <span className="font-mono text-primary text-[10px]">{p.ipa}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{p.tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {ai?.corrections && ai.corrections.length > 0 && (
        <div className="rounded-xl border bg-card p-3 break-inside-avoid">
          <div className="text-[11px] uppercase tracking-wider font-bold text-sage-700 mb-1.5">
            Lỗi & cách sửa
          </div>
          <div className="space-y-1.5">
            {ai.corrections.map((c, i) => (
              <div key={i} className="rounded-md border p-1.5 text-xs space-y-0.5">
                <p className="text-rose-600 line-through">{c.original}</p>
                <p className="text-sage-700 font-semibold">✅ {c.corrected}</p>
                <p className="text-[11px] text-muted-foreground">{c.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {ai?.summary && (
        <p className="text-xs italic text-muted-foreground">{ai.summary}</p>
      )}
    </div>
  );
}

function PartBlock({
  label,
  questions,
  transcript,
  audioUrl,
}: {
  label: string;
  questions: string[];
  transcript: string;
  audioUrl?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-3 space-y-2 break-inside-avoid">
      <div className="text-[11px] uppercase tracking-wider font-bold text-leaf-deep">
        {label}
      </div>
      <ul className="text-xs list-disc pl-4 space-y-0.5 text-muted-foreground">
        {questions.map((q, i) => (
          <li key={i}>{q}</li>
        ))}
      </ul>
      {audioUrl ? (
        <audio controls src={audioUrl} className="w-full h-9 print:hidden" preload="metadata" />
      ) : (
        <p className="text-[11px] italic text-muted-foreground print:hidden">
          (Không có bản ghi để phát lại — bạn chưa ghi âm hoặc đã chuyển trang)
        </p>
      )}
      {transcript ? (
        <p className="text-xs rounded-md border-l-2 border-sage-400 bg-sage-50/40 dark:bg-sage-950/20 pl-2.5 py-1.5 italic">
          "{transcript}"
        </p>
      ) : (
        <p className="text-[11px] italic text-muted-foreground">(Không có transcript)</p>
      )}
    </div>
  );
}

/** Floating button to enter/exit fullscreen during the mock test. */
function FsToggle({ isFs, onClick }: { isFs: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 z-[60] grid h-11 w-11 place-items-center rounded-full border bg-card/95 backdrop-blur shadow-lg hover:bg-accent transition-colors"
      title={isFs ? "Thoát toàn màn hình (Esc)" : "Vào toàn màn hình"}
      aria-label={isFs ? "Thoát toàn màn hình" : "Vào toàn màn hình"}
    >
      {isFs ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
    </button>
  );
}
