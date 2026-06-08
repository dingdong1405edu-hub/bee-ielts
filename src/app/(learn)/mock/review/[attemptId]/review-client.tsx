"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Headphones,
  BookOpen,
  PenLine,
  Mic,
  CheckCircle2,
  XCircle,
  Trophy,
  Lightbulb,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, isAnswerCorrect } from "@/lib/utils";
import {
  QuestionScoreCard,
  CriteriaPills,
  BandCircle,
  type QuestionTip,
  type Correction,
} from "@/components/learn/speaking-review-card";
import type {
  ListeningPayload,
  ReadingPayload,
  WritingPayload,
  SpeakingPayload,
  ReviewQuestion,
  WritingAi,
  SpeakingAi,
} from "./page";

type SkillKey = "listening" | "reading" | "writing" | "speaking";

interface Attempt {
  id: string;
  completedAt: string;
  overallBand: number;
  summary: string;
  listeningBand: number;
  listeningCorrect: number;
  listeningTotal: number;
  listeningPayload: ListeningPayload;
  readingBand: number;
  readingCorrect: number;
  readingTotal: number;
  readingPayload: ReadingPayload;
  writingBand: number;
  writingPayload: WritingPayload;
  speakingBand: number;
  speakingPayload: SpeakingPayload;
}

/**
 * Mock review with skill-tab navigation. The active tab is mirrored to
 * the `?skill=` query so the result-screen deep links land on the right
 * pane. Each skill renders inline below the tab strip.
 */
export function MockReviewClient({ attempt }: { attempt: Attempt }) {
  const sp = useSearchParams();
  const router = useRouter();
  const initial = (sp.get("skill") as SkillKey) || "listening";
  const [active, setActive] = useState<SkillKey>(
    ["listening", "reading", "writing", "speaking"].includes(initial) ? initial : "listening",
  );

  const setSkill = (s: SkillKey) => {
    setActive(s);
    const url = new URL(window.location.href);
    url.searchParams.set("skill", s);
    router.replace(url.pathname + url.search, { scroll: false });
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary/10 to-accent border-2 border-primary/20">
        <CardContent className="p-5 flex items-center gap-4 flex-wrap">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl gradient-brand text-white shadow-md">
            <Trophy className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold">Xem lại bài thi thử</h1>
            <p className="text-xs text-muted-foreground">
              {new Intl.DateTimeFormat("vi-VN", {
                dateStyle: "long",
                timeStyle: "short",
              }).format(new Date(attempt.completedAt))}
              {" — "}Overall band {attempt.overallBand.toFixed(1)}
            </p>
          </div>
          <div className="text-3xl font-extrabold gradient-brand-text">
            {attempt.overallBand.toFixed(1)}
          </div>
        </CardContent>
      </Card>

      {/* Skill tab bar */}
      <div className="grid grid-cols-4 gap-2">
        <TabButton
          active={active === "listening"}
          onClick={() => setSkill("listening")}
          icon={Headphones}
          label="Listening"
          band={attempt.listeningBand}
          grad="from-amber-500 to-orange-500"
        />
        <TabButton
          active={active === "reading"}
          onClick={() => setSkill("reading")}
          icon={BookOpen}
          label="Reading"
          band={attempt.readingBand}
          grad="from-emerald-500 to-teal-500"
        />
        <TabButton
          active={active === "writing"}
          onClick={() => setSkill("writing")}
          icon={PenLine}
          label="Writing"
          band={attempt.writingBand}
          grad="from-honey to-honey-deep"
        />
        <TabButton
          active={active === "speaking"}
          onClick={() => setSkill("speaking")}
          icon={Mic}
          label="Speaking"
          band={attempt.speakingBand}
          grad="from-leaf to-leaf-deep"
        />
      </div>

      {active === "listening" && (
        <QuestionReview
          payload={attempt.listeningPayload}
          band={attempt.listeningBand}
          correct={attempt.listeningCorrect}
          total={attempt.listeningTotal}
          kind="listening"
        />
      )}
      {active === "reading" && (
        <QuestionReview
          payload={attempt.readingPayload}
          band={attempt.readingBand}
          correct={attempt.readingCorrect}
          total={attempt.readingTotal}
          kind="reading"
        />
      )}
      {active === "writing" && <WritingReview payload={attempt.writingPayload} band={attempt.writingBand} />}
      {active === "speaking" && (
        <SpeakingReview payload={attempt.speakingPayload} band={attempt.speakingBand} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  band,
  grad,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  band: number;
  grad: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl border-2 p-2.5 sm:p-3 transition-all text-left",
        active
          ? "border-primary bg-accent shadow-md"
          : "border-border bg-card hover:border-primary/30",
      )}
    >
      <div className="flex items-center gap-2">
        <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${grad} text-white`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="text-xs font-bold truncate hidden sm:inline">{label}</div>
      </div>
      <div className="mt-1.5 font-extrabold text-lg gradient-brand-text">{band.toFixed(1)}</div>
    </button>
  );
}

/** Shared Listening + Reading review — same shape, just different framing. */
function QuestionReview({
  payload,
  band,
  correct,
  total,
  kind,
}: {
  payload: ListeningPayload | ReadingPayload;
  band: number;
  correct: number;
  total: number;
  kind: "listening" | "reading";
}) {
  const passages = "passages" in payload ? payload.passages : null;
  const tests = "tests" in payload ? payload.tests : null;
  const questionsByTest = new Map<string, ReviewQuestion[]>();
  for (const q of payload.questions) {
    const arr = questionsByTest.get(q.testId) ?? [];
    arr.push(q);
    questionsByTest.set(q.testId, arr);
  }

  return (
    <div className="space-y-4">
      <Card className="bg-muted/30">
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="font-extrabold text-lg">
              {kind === "listening" ? "Listening" : "Reading"} — Band {band.toFixed(1)}
            </div>
            <div className="text-sm text-muted-foreground">
              {correct}/{total} câu đúng
            </div>
          </div>
        </CardContent>
      </Card>

      {passages?.map((p) => {
        const qs = questionsByTest.get(p.id) ?? [];
        return (
          <div key={p.id} className="space-y-3">
            <Card>
              <CardContent className="p-5 space-y-2">
                <h3 className="font-extrabold">{p.title}</h3>
                {p.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt="" className="w-full max-h-72 object-contain rounded-lg border bg-muted/30" />
                )}
                <div className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
                  {p.passage}
                </div>
              </CardContent>
            </Card>
            <div className="space-y-2">
              {qs.map((q, i) => (
                <QuestionRow key={q.id} q={q} num={q.displayNumber ?? i + 1} userAnswer={payload.answers[q.id] || ""} />
              ))}
            </div>
          </div>
        );
      })}

      {tests?.map((t) => {
        const qs = questionsByTest.get(t.id) ?? [];
        return (
          <div key={t.id} className="space-y-3">
            <Card>
              <CardContent className="p-5 space-y-2">
                <h3 className="font-extrabold">
                  {t.section ? `Section ${t.section} — ` : ""}
                  {t.title}
                </h3>
                {t.transcript && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-primary font-bold">Xem transcript</summary>
                    <div className="mt-2 whitespace-pre-wrap text-foreground/80 rounded-lg border bg-muted/20 p-3">
                      {t.transcript}
                    </div>
                  </details>
                )}
              </CardContent>
            </Card>
            <div className="space-y-2">
              {qs.map((q, i) => (
                <QuestionRow key={q.id} q={q} num={q.displayNumber ?? i + 1} userAnswer={payload.answers[q.id] || ""} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function QuestionRow({ q, num, userAnswer }: { q: ReviewQuestion; num: number; userAnswer: string }) {
  const ok = isAnswerCorrect(userAnswer, q.correctAnswer, q.type);
  return (
    <Card className={cn("border-2", ok ? "border-success/40" : "border-destructive/40")}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start gap-2">
          <span className="font-semibold text-primary shrink-0">{num}.</span>
          <p className="font-medium flex-1">{q.prompt}</p>
          {ok ? (
            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 text-destructive shrink-0" />
          )}
        </div>
        {q.options && q.options.length > 0 && (
          <div className="ml-7 space-y-1 text-sm">
            {q.options.map((opt) => (
              <div
                key={opt}
                className={cn(
                  "rounded-md border px-2 py-1.5",
                  opt === q.correctAnswer && "border-success bg-success/10 font-bold",
                  userAnswer === opt && opt !== q.correctAnswer && "border-destructive bg-destructive/10 line-through",
                )}
              >
                {opt}
              </div>
            ))}
          </div>
        )}
        {(!q.options || q.options.length === 0) && (
          <div className="ml-7 grid sm:grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Của bạn</div>
              <div className={cn("font-semibold", ok ? "text-success" : "text-destructive line-through")}>
                {userAnswer || "(trống)"}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Đáp án đúng</div>
              <div className="font-semibold text-success">{q.correctAnswer}</div>
            </div>
          </div>
        )}
        {q.explanation && (
          <div className="ml-7 rounded-md border bg-primary/5 p-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1 mb-0.5">
              <Lightbulb className="h-3.5 w-3.5" /> Giải thích
            </div>
            <p className="text-sm leading-relaxed">{q.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WritingReview({ payload, band }: { payload: WritingPayload; band: number }) {
  return (
    <div className="space-y-4">
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="font-extrabold text-lg">Writing — Band {band.toFixed(1)}</div>
          <div className="text-sm text-muted-foreground">{payload.combinedFeedback}</div>
        </CardContent>
      </Card>
      <WritingTaskBlock task={payload.task1} num={1} />
      <WritingTaskBlock task={payload.task2} num={2} />
    </div>
  );
}

function WritingTaskBlock({ task, num }: { task: WritingPayload["task1"] | WritingPayload["task2"]; num: 1 | 2 }) {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-extrabold">Task {num}</h3>
          <Badge variant="outline" className="text-base px-3 py-1">
            Band {task.band.toFixed(1)}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground whitespace-pre-wrap">{task.prompt}</div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Bài làm của bạn
          </div>
          <div className="rounded-lg border bg-muted/20 p-3 text-sm whitespace-pre-wrap">
            {task.essay || "(không viết gì)"}
          </div>
        </div>
        {task.ai?.criteria && (
          <div className="grid sm:grid-cols-2 gap-2">
            {Object.entries(task.ai.criteria).map(([k, v]) => (
              <div key={k} className="rounded-lg border p-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{labelCrit(k)}</div>
                  <div className="font-extrabold text-primary">{v.band.toFixed(1)}</div>
                </div>
                <p className="text-sm mt-1">{v.feedback}</p>
              </div>
            ))}
          </div>
        )}
        {task.ai?.annotations && task.ai.annotations.length > 0 && (
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Các chỗ cần sửa
            </div>
            <div className="space-y-2">
              {task.ai.annotations.map((a, i) => (
                <div key={i} className="rounded-lg border bg-destructive/5 p-3 text-sm">
                  <div className="font-semibold italic">"{a.excerpt}"</div>
                  <div className="mt-1 text-muted-foreground">{a.issue}</div>
                  <div className="mt-1 text-success font-medium">→ {a.suggestion}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {task.ai?.improvedVersion && (
          <details className="text-sm">
            <summary className="cursor-pointer text-primary font-bold">Xem bài mẫu band 7+</summary>
            <div className="mt-2 rounded-lg border bg-success/5 p-3 whitespace-pre-wrap">
              {task.ai.improvedVersion}
            </div>
          </details>
        )}
        <p className="text-xs italic text-muted-foreground">{task.summary}</p>
      </CardContent>
    </Card>
  );
}

function SpeakingReview({ payload, band }: { payload: SpeakingPayload; band: number }) {
  const overallCrit = payload.ai?.criteria
    ? {
        fluencyCoherence: payload.ai.criteria.fluencyCoherence?.band,
        lexicalResource: payload.ai.criteria.lexicalResource?.band,
        grammaticalRange: payload.ai.criteria.grammaticalRange?.band,
        pronunciation: payload.ai.criteria.pronunciation?.band,
      }
    : undefined;
  const tips: QuestionTip[] = (payload.ai?.questionTips as QuestionTip[] | undefined) ?? [];
  const tipsWithBand = tips.filter(
    (t) => t.band != null && Number.isFinite(t.band as number),
  );
  let weakestIndex = -1;
  if (tipsWithBand.length > 0) {
    const minBand = Math.min(...tipsWithBand.map((t) => t.band as number));
    weakestIndex = tips.findIndex((t) => t.band === minBand);
  }
  const corrections: Correction[] = (payload.ai?.corrections as Correction[] | undefined) ?? [];
  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary/10 to-accent border-2 border-primary/20">
        <CardContent className="p-5 flex items-start gap-4 flex-wrap">
          <BandCircle band={band} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-lg">Speaking — band {band.toFixed(1)}</div>
            <div className="text-sm text-muted-foreground">{payload.summary}</div>
            {overallCrit && (
              <div className="mt-2">
                <CriteriaPills criteria={overallCrit} weakest={false} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {tips.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-extrabold text-lg">Chấm theo từng câu</h3>
          {tips.map((tip, i) => (
            <QuestionScoreCard
              key={i}
              index={i}
              tip={tip}
              corrections={corrections}
              isWeakest={i === weakestIndex}
            />
          ))}
        </div>
      )}

      {payload.ai?.criteria && (
        <Card>
          <CardContent className="p-5 space-y-2">
            <h3 className="font-extrabold mb-1">4 tiêu chí — tổng quan</h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {Object.entries(payload.ai.criteria).map(([k, v]) => (
                <div key={k} className="rounded-lg border p-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{labelCrit(k)}</div>
                    <div className="font-extrabold text-primary">{v.band.toFixed(1)}</div>
                  </div>
                  <p className="text-sm mt-1">{v.feedback}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="font-extrabold">Câu hỏi đã được hỏi</h3>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Part 1</div>
            <ul className="list-disc pl-5 text-sm space-y-1">
              {payload.part1Questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Part 2 — Cue card
            </div>
            <div className="rounded-lg border bg-amber-50 dark:bg-amber-900/10 p-3 text-sm">
              <div className="font-semibold">{payload.part2CueCard.topic}</div>
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                {payload.part2CueCard.points.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Part 3</div>
            <ul className="list-disc pl-5 text-sm space-y-1">
              {payload.part3Questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {(payload.ai as SpeakingAi | null)?.corrections?.length ? (
        <Card>
          <CardContent className="p-5 space-y-2">
            <h3 className="font-extrabold">Các câu cần sửa</h3>
            {(payload.ai as SpeakingAi).corrections!.map((c, i) => (
              <div key={i} className="rounded-lg border bg-destructive/5 p-3 text-sm">
                <div className="italic line-through opacity-70">"{c.original}"</div>
                <div className="mt-1 font-semibold text-success">→ {c.corrected}</div>
                <div className="mt-1 text-muted-foreground">{c.explanation}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {(payload.ai as SpeakingAi | null)?.pronunciationFixes?.length ? (
        <Card>
          <CardContent className="p-5 space-y-2">
            <h3 className="font-extrabold">Phát âm cần luyện</h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {(payload.ai as SpeakingAi).pronunciationFixes!.map((p, i) => (
                <div key={i} className="rounded-lg border p-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{p.word}</span>
                    <span className="text-xs text-muted-foreground">{p.ipa}</span>
                  </div>
                  <p className="text-xs mt-0.5">{p.tip}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function labelCrit(k: string): string {
  switch (k) {
    case "taskAchievement":
      return "Task Achievement";
    case "coherenceCohesion":
      return "Coherence & Cohesion";
    case "lexicalResource":
      return "Lexical Resource";
    case "grammaticalRange":
      return "Grammatical Range";
    case "fluencyCoherence":
      return "Fluency & Coherence";
    case "pronunciation":
      return "Pronunciation";
    default:
      return k;
  }
}
