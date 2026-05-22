"use client";
import { useEffect, useRef, useState } from "react";
import { Clock, Send, GripVertical, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReadingGroupHeader, computeQuestionGroups } from "@/components/learn/reading-group-header";
import { FormBlanks } from "@/components/learn/form-blanks";
import {
  HighlightablePassage,
  HighlightToolbar,
  type Highlight,
  type HighlightTool,
} from "@/components/learn/highlightable-passage";
import { formatDuration, cn } from "@/lib/utils";

export type QType =
  | "MCQ"
  | "FILL_BLANK"
  | "TRUE_FALSE"
  | "TRUE_FALSE_NOT_GIVEN"
  | "MATCHING"
  | "MATCHING_HEADINGS"
  | "MATCHING_INFO"
  | "MATCHING_FEATURES"
  | "MATCHING_SENTENCE_ENDINGS"
  | "SHORT_ANSWER";

export interface ShellQ {
  id: string;
  type: QType;
  prompt: string;
  options: string[] | null;
  correctAnswer: string;
  formGroup?: string | null;
}

export interface ShellPart {
  id: string;
  title: string;
  level?: string;
  passage: string;
  imageUrl?: string | null;
  questions: ShellQ[];
}

interface Props {
  testTitle: string;
  parts: ShellPart[];
  timeLimit: number;
  onSubmit: (answers: Record<string, string>) => void;
  submitting?: boolean;
  /** Practise mode: đếm xuôi thời gian đã làm, không tự nộp khi hết giờ. */
  countUp?: boolean;
}

export function ReadingShell({ testTitle, parts, timeLimit, onSubmit, submitting, countUp }: Props) {
  const [activePart, setActivePart] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState(timeLimit);
  const [elapsed, setElapsed] = useState(0);
  const [leftWidth, setLeftWidth] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [tool, setTool] = useState<HighlightTool>("none");
  const [highlightsByPart, setHighlightsByPart] = useState<Record<string, Highlight[]>>({});

  // global timer — đếm xuôi (practise) hoặc đếm ngược + tự nộp khi hết giờ (thi thử)
  useEffect(() => {
    const t = setInterval(() => {
      if (countUp) {
        setElapsed((e) => e + 1);
        return;
      }
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          onSubmit(answers);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // splitter drag handlers (desktop only)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftWidth(Math.max(28, Math.min(72, pct)));
    };
    const onUp = () => {
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const startDrag = () => {
    draggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const setAnswer = (qId: string, value: string) =>
    setAnswers((a) => ({ ...a, [qId]: value }));

  const setPartHighlights = (partId: string, next: Highlight[]) =>
    setHighlightsByPart((h) => ({ ...h, [partId]: next }));

  const currentPart = parts[activePart];
  const totalAnswered = (p: ShellPart) =>
    p.questions.filter((q) => (answers[q.id] || "").trim()).length;

  // compute starting question index across parts
  const partOffsets = parts.reduce<number[]>((acc, p, i) => {
    if (i === 0) return [1];
    return [...acc, acc[i - 1] + parts[i - 1].questions.length];
  }, []);
  const startIdxOfPart = partOffsets[activePart];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background no-print-bg">
      {/* TOP BAR */}
      <header className="flex items-center justify-between gap-2 border-b bg-card px-3 py-2 md:gap-3 md:px-6 md:py-2.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="grid h-7 w-7 md:h-8 md:w-8 place-items-center rounded-lg gradient-brand text-white font-extrabold text-xs md:text-sm shrink-0">B</div>
          <div className="text-xs md:text-sm font-bold truncate">
            <span className="hidden sm:inline text-muted-foreground">Bee IELTS / </span>
            <span>{testTitle}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
          <div className="hidden md:block">
            <HighlightToolbar tool={tool} setTool={setTool} />
          </div>
          <div className="flex items-center gap-1 md:gap-1.5 text-xs md:text-base font-extrabold">
            <Clock className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
            {countUp ? (
              <>
                <span className="hidden sm:inline">
                  {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} đã làm
                </span>
                <span className="sm:hidden">
                  {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
                </span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">{Math.floor(remaining / 60)} minutes remaining</span>
                <span className="sm:hidden">
                  {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
                </span>
              </>
            )}
          </div>
          <Button
            onClick={() => onSubmit(answers)}
            disabled={submitting}
            size="sm"
            className="rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white h-8 md:h-9 px-3 md:px-4 text-xs md:text-sm"
          >
            Submit <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* Mobile highlight toolbar — sub-header */}
      <div className="md:hidden border-b bg-card px-2 py-1.5 flex items-center justify-center">
        <HighlightToolbar tool={tool} setTool={setTool} />
      </div>

      {/* SPLIT PANE */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden">
        {/* LEFT: passage */}
        <div
          className="overflow-y-auto px-5 md:px-8 py-6 hidden md:block"
          style={{ width: `${leftWidth}%` }}
        >
          <div className="max-w-prose mx-auto">
            <h2 className="text-center text-xl md:text-2xl font-extrabold tracking-tight mb-4">
              {currentPart.title}
            </h2>
            {currentPart.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentPart.imageUrl} alt="" className="w-full mb-4 max-h-72 rounded-lg border bg-muted/30 object-contain" />
            )}
            <HighlightablePassage
              passage={currentPart.passage}
              highlights={highlightsByPart[currentPart.id] ?? []}
              tool={tool}
              onChangeHighlights={(next) => setPartHighlights(currentPart.id, next)}
            />
          </div>
        </div>

        {/* Mobile: tab toggle to switch between passage & questions */}
        <MobileToggle
          currentPart={currentPart}
          answers={answers}
          setAnswer={setAnswer}
          startIndex={startIdxOfPart}
          tool={tool}
          highlights={highlightsByPart[currentPart.id] ?? []}
          setHighlights={(next) => setPartHighlights(currentPart.id, next)}
        />

        {/* SPLITTER */}
        <div
          onMouseDown={startDrag}
          className="hidden md:flex w-2 cursor-col-resize bg-border hover:bg-primary/40 active:bg-primary/60 transition-colors items-center justify-center relative group"
          aria-label="Resize panes"
          role="separator"
        >
          {/* Handle button — centered, always visible */}
          <div className="absolute z-10 grid h-12 w-7 place-items-center rounded-full border-2 border-primary bg-card shadow-md group-hover:bg-primary group-hover:border-primary group-hover:shadow-lg transition-all">
            <GripVertical className="h-4 w-4 text-primary group-hover:text-white" />
          </div>
        </div>

        {/* RIGHT: questions */}
        <div
          className="overflow-y-auto px-5 md:px-8 py-6 hidden md:block"
          style={{ width: `${100 - leftWidth}%` }}
        >
          <PartQuestions
            questions={currentPart.questions}
            startIndex={startIdxOfPart}
            answers={answers}
            onChange={setAnswer}
          />
        </div>
      </div>

      {/* BOTTOM PART NAV */}
      <BottomNav
        parts={parts}
        activePart={activePart}
        setActivePart={setActivePart}
        answers={answers}
      />
    </div>
  );
}

function PartQuestions({
  questions,
  startIndex,
  answers,
  onChange,
}: {
  questions: ShellQ[];
  startIndex: number;
  answers: Record<string, string>;
  onChange: (id: string, value: string) => void;
}) {
  const groups = computeQuestionGroups(questions);
  return (
    <div className="max-w-2xl mx-auto space-y-4 md:space-y-5">
      {groups.map((g) => {
        const groupQuestions = questions.slice(g.startIdx, g.endIdx + 1);
        const groupStart = startIndex + g.startIdx;
        const groupEnd = startIndex + g.endIdx;
        const hasList = g.type === "MATCHING_HEADINGS" || g.type === "MATCHING_FEATURES";
        // Pasted form-completion: every question shares one formGroup key —
        // render the whole block as one flowing passage with inline blanks.
        const fg = groupQuestions[0]?.formGroup;
        const isFormGroup =
          !!fg && groupQuestions.every((q) => q.formGroup === fg);
        // Sentence-completion run: every question has an inline blank, so the
        // sentences flow together as one continuous paragraph (no line breaks).
        const isInlineRun =
          (g.type === "FILL_BLANK" || g.type === "SHORT_ANSWER") &&
          groupQuestions.every((q) => /_{2,}|\{N\}/.test(q.prompt));
        return (
          <div key={g.startIdx} className="space-y-2">
            <ReadingGroupHeader type={g.type} start={groupStart} end={groupEnd} />
            {hasList && groupQuestions[0]?.options && groupQuestions[0].options.length > 0 && (
              <ReferenceList type={g.type} options={groupQuestions[0].options} />
            )}
            {isFormGroup ? (
              <FormBlanks
                items={groupQuestions}
                startNum={groupStart}
                answers={answers}
                onChange={onChange}
              />
            ) : isInlineRun ? (
              <InlineBlankGroup
                items={groupQuestions.map((q, j) => ({
                  q,
                  num: groupStart + j,
                  value: answers[q.id] || "",
                  onChange: (v: string) => onChange(q.id, v),
                }))}
              />
            ) : (
              <div className="space-y-4 md:space-y-5">
                {groupQuestions.map((q, j) => (
                  <QuestionInput
                    key={q.id}
                    q={q}
                    num={groupStart + j}
                    value={answers[q.id] || ""}
                    onChange={(v) => onChange(q.id, v)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ReferenceList({ type, options }: { type: string; options: string[] }) {
  const label =
    type === "MATCHING_HEADINGS" ? "List of Headings" :
    type === "MATCHING_FEATURES" ? "List of Options" :
    "Options";
  return (
    <div className="rounded-lg border bg-muted/30 px-4 py-3 my-2">
      <div className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-2">
        {label}
      </div>
      <ul className="space-y-1 text-sm leading-relaxed">
        {options.map((opt, i) => (
          <li key={i}>{opt}</li>
        ))}
      </ul>
    </div>
  );
}

function QuestionInput({
  q,
  num,
  value,
  onChange,
}: {
  q: ShellQ;
  num: number;
  value: string;
  onChange: (v: string) => void;
}) {
  // For matching headings / matching info: small dropdown with extracted letter
  if (q.type === "MATCHING_HEADINGS" || q.type === "MATCHING_INFO" || q.type === "MATCHING_FEATURES") {
    const opts = q.options ?? [];
    const values = opts.map((o) => {
      const m = o.match(/^([ivxIVX]+|[A-H])\.?\s/);
      return m ? m[1] : o;
    });
    return (
      <div className="flex items-start gap-3">
        <NumberPill num={num} />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-lg border-2 px-3 py-2 text-sm bg-background min-w-[90px] font-bold"
        >
          <option value="">—</option>
          {opts.map((opt, i) => (
            <option key={i} value={values[i]}>{values[i]}</option>
          ))}
        </select>
        <span className="flex-1 text-[15px] leading-relaxed pt-1">{q.prompt}</span>
      </div>
    );
  }

  if (q.type === "TRUE_FALSE_NOT_GIVEN") {
    return (
      <div className="flex items-start gap-3">
        <NumberPill num={num} />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-lg border-2 px-3 py-2 text-sm bg-background min-w-[120px] font-bold"
        >
          <option value="">—</option>
          <option value="True">TRUE</option>
          <option value="False">FALSE</option>
          <option value="Not Given">NOT GIVEN</option>
        </select>
        <span className="flex-1 text-[15px] leading-relaxed pt-1">{q.prompt}</span>
      </div>
    );
  }

  if (q.type === "TRUE_FALSE") {
    return (
      <div className="flex items-start gap-3">
        <NumberPill num={num} />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-lg border-2 px-3 py-2 text-sm bg-background min-w-[100px] font-bold"
        >
          <option value="">—</option>
          <option value="True">TRUE</option>
          <option value="False">FALSE</option>
        </select>
        <span className="flex-1 text-[15px] leading-relaxed pt-1">{q.prompt}</span>
      </div>
    );
  }

  // Inline blanks for FILL_BLANK / SHORT_ANSWER — render prompt with inline input
  if ((q.type === "FILL_BLANK" || q.type === "SHORT_ANSWER") && /_{2,}|\{N\}/.test(q.prompt)) {
    return <InlineBlankRow num={num} prompt={q.prompt} value={value} onChange={onChange} />;
  }

  if (q.type === "FILL_BLANK" || q.type === "SHORT_ANSWER") {
    return (
      <div className="flex items-start gap-3">
        <NumberPill num={num} />
        <div className="flex-1 space-y-2">
          <p className="text-[15px] leading-relaxed">{q.prompt}</p>
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Câu trả lời..."
            className="rounded-lg border-2 px-3 py-2 text-sm bg-background w-full max-w-[300px]"
          />
        </div>
      </div>
    );
  }

  if (q.type === "MATCHING_SENTENCE_ENDINGS" || q.type === "MCQ" || q.type === "MATCHING") {
    return (
      <div className="flex items-start gap-3">
        <NumberPill num={num} />
        <div className="flex-1 space-y-2">
          <p className="text-[15px] leading-relaxed">{q.prompt}</p>
          <div className="space-y-1.5">
            {(q.options ?? []).map((opt) => (
              <label
                key={opt}
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer text-sm",
                  value === opt && "border-primary bg-accent",
                )}
              >
                <input
                  type="radio"
                  name={q.id}
                  value={opt}
                  checked={value === opt}
                  onChange={(e) => onChange(e.target.value)}
                  className="h-4 w-4"
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default
  return (
    <div className="flex items-start gap-3">
      <NumberPill num={num} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded-lg border-2 px-3 py-2 text-sm bg-background"
      />
    </div>
  );
}

/**
 * One sentence-completion sentence rendered inline: the prompt text with a
 * single numbered blank input. Returns spans only (no block wrapper) so
 * several sentences can flow together inside one paragraph.
 */
function InlineBlankSentence({
  num,
  prompt,
  value,
  onChange,
}: {
  num: number;
  prompt: string;
  value: string;
  onChange: (v: string) => void;
}) {
  // Split prompt by blanks (`___` or `{N}`). Only the first blank is replaced
  // — each question carries exactly one answer.
  const parts = prompt.split(/(_{2,}|\{N\})/g);
  let replaced = false;
  return (
    <>
      {parts.map((p, i) => {
        if (!replaced && (/_{2,}/.test(p) || /\{N\}/.test(p))) {
          replaced = true;
          return (
            <span key={i} className="inline-flex items-center gap-1 align-middle mx-0.5">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-600 text-white text-[11px] font-bold shrink-0">
                {num}
              </span>
              <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="inline-block min-w-[120px] rounded-full border-2 border-emerald-600/60 focus:border-emerald-600 outline-none bg-background px-3 py-0.5 text-sm font-medium"
              />
            </span>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

/** Single inline-blank question (used inside a mixed group). */
function InlineBlankRow(props: { num: number; prompt: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="text-[15px] leading-relaxed">
      <InlineBlankSentence {...props} />
    </div>
  );
}

/**
 * A whole run of sentence-completion questions as ONE flowing paragraph —
 * the sentences run together without line breaks between them, the way an
 * IELTS summary-completion task reads.
 */
function InlineBlankGroup({
  items,
}: {
  items: { q: ShellQ; num: number; value: string; onChange: (v: string) => void }[];
}) {
  return (
    <p className="text-[15px] leading-[2.4]">
      {items.map(({ q, num, value, onChange }, idx) => (
        <span key={q.id}>
          {idx > 0 ? " " : null}
          <InlineBlankSentence num={num} prompt={q.prompt} value={value} onChange={onChange} />
        </span>
      ))}
    </p>
  );
}

function NumberPill({ num }: { num: number }) {
  return (
    <span className="shrink-0 grid h-6 w-6 place-items-center rounded-full bg-emerald-600 text-white text-xs font-extrabold">
      {num}
    </span>
  );
}

function BottomNav({
  parts,
  activePart,
  setActivePart,
  answers,
}: {
  parts: ShellPart[];
  activePart: number;
  setActivePart: (i: number) => void;
  answers: Record<string, string>;
}) {
  const partOffsets = parts.reduce<number[]>((acc, p, i) => {
    if (i === 0) return [1];
    return [...acc, acc[i - 1] + parts[i - 1].questions.length];
  }, []);
  return (
    <nav className="border-t bg-card px-2 py-2 md:px-6 md:py-3 overflow-x-auto">
      <div className="flex items-stretch gap-1.5 md:gap-3 min-w-max">
        {parts.map((p, i) => {
          const answered = p.questions.filter((q) => (answers[q.id] || "").trim()).length;
          const active = i === activePart;
          const start = partOffsets[i];
          return (
            <button
              key={p.id}
              onClick={() => setActivePart(i)}
              className={cn(
                "flex items-center gap-2 md:gap-3 rounded-xl border-2 px-2 py-1 md:px-3 md:py-1.5 transition-colors",
                active ? "border-primary bg-accent/30 min-w-[180px] md:min-w-[260px]" : "border-border hover:border-primary/30",
              )}
            >
              <span className={cn("font-bold text-xs md:text-sm shrink-0", active ? "text-primary" : "text-foreground")}>
                Part {i + 1}
              </span>
              {active ? (
                <div className="flex items-center gap-0.5 md:gap-1 flex-wrap">
                  {p.questions.map((q, qi) => {
                    const filled = !!(answers[q.id] || "").trim();
                    const num = start + qi;
                    return (
                      <span
                        key={q.id}
                        className={cn(
                          "grid h-5 w-5 md:h-6 md:w-6 place-items-center rounded-full text-[10px] md:text-[11px] font-bold border",
                          filled
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-background border-border text-muted-foreground",
                        )}
                      >
                        {num}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <span className="text-[10px] md:text-xs text-muted-foreground">
                  {answered}/{p.questions.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function MobileToggle({
  currentPart,
  answers,
  setAnswer,
  startIndex,
  tool,
  highlights,
  setHighlights,
}: {
  currentPart: ShellPart;
  answers: Record<string, string>;
  setAnswer: (id: string, v: string) => void;
  startIndex: number;
  tool: HighlightTool;
  highlights: Highlight[];
  setHighlights: (next: Highlight[]) => void;
}) {
  const [view, setView] = useState<"passage" | "questions">("passage");
  return (
    <div className="md:hidden flex-1 flex flex-col overflow-hidden">
      <div className="flex border-b bg-card">
        <button
          onClick={() => setView("passage")}
          className={cn("flex-1 py-2 text-sm font-bold", view === "passage" ? "border-b-2 border-primary text-primary" : "text-muted-foreground")}
        >
          <Eye className="h-4 w-4 inline mr-1" /> Passage
        </button>
        <button
          onClick={() => setView("questions")}
          className={cn("flex-1 py-2 text-sm font-bold", view === "questions" ? "border-b-2 border-primary text-primary" : "text-muted-foreground")}
        >
          Questions
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {view === "passage" ? (
          <>
            <h2 className="text-center text-xl font-extrabold tracking-tight mb-3">{currentPart.title}</h2>
            {currentPart.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentPart.imageUrl} alt="" className="w-full mb-3 max-h-60 rounded-lg border bg-muted/30 object-contain" />
            )}
            <HighlightablePassage
              passage={currentPart.passage}
              highlights={highlights}
              tool={tool}
              onChangeHighlights={setHighlights}
            />
          </>
        ) : (
          <PartQuestions
            questions={currentPart.questions}
            startIndex={startIndex}
            answers={answers}
            onChange={setAnswer}
          />
        )}
      </div>
    </div>
  );
}
