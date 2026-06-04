"use client";
/**
 * Shared chrome for every IELTS-style Listening surface: the standalone
 * practice player, the band-climber wrapper, and the mock test's 4-section
 * flow. Mirrors the LexiPrep-inspired layout from the design spec the user
 * shared: sticky brand+timer header → audio strip with volume + scrubber →
 * part heading + instructions → bordered content card with inline pill
 * inputs → bottom part-nav strip → floating prev/next arrows.
 *
 * Parts are passed in as a `parts[]` array. For single-test practice it's
 * length 1 (one "Part" tab in the strip). For the mock it's length 4 and
 * the caller can opt into IELTS-style locks via `playOnce` + `forwardOnly`.
 *
 * Audio + question-state ownership stays with the caller — this component
 * is presentational and routes events back through callbacks. The point is
 * unified look-and-feel; the per-surface mechanics (10-min review timer,
 * play-once lock, etc.) live in the parent.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Volume2,
  AlertTriangle,
  Send,
  Search,
  Lock,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Play,
} from "lucide-react";
import { cn, formatDuration, isAnswerCorrect } from "@/lib/utils";
import { FormBlanks, TableBlanks, groupQuestions } from "@/components/learn/form-blanks";

export type ShellQType =
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

export interface ShellListeningQ {
  id: string;
  type: ShellQType;
  prompt: string;
  options: string[] | null;
  correctAnswer: string;
  formGroup?: string | null;
  displayNumber?: number | null;
}

export interface ListeningPart {
  id: string;
  /** 1-based — drives the "Part N" heading and the bottom strip. */
  index: number;
  /** Continuous numbering: first global question number in this part. */
  startNum: number;
  title?: string | null;
  audioUrl: string;
  transcript: string | null;
  /** Optional image shown above the questions (e.g. map). */
  contentImageUrl?: string | null;
  questions: ShellListeningQ[];
  /** Per-part instructions (e.g. "Complete the notes below. Write ONE WORD…"). */
  instructions?: string | null;
}

export interface ListeningShellProps {
  brandLogo?: React.ReactNode;
  brandName?: string;
  /** Test title shown in the header next to the brand. */
  title: string;
  parts: ListeningPart[];
  /** Index into `parts` (NOT the 1-based part.index). */
  activeIdx: number;
  onActiveIdxChange: (next: number) => void;
  answers: Record<string, string>;
  onChangeAnswer: (qId: string, value: string) => void;
  /** Submit handler — receives nothing; parent owns answers state. */
  onSubmit: () => void;
  submitted?: boolean;
  /** Countdown mode. When non-null, shows "X phút còn lại" + a red flash near zero. */
  remainingSec?: number | null;
  /** Practice mode counter when remainingSec is null. */
  elapsedSec?: number;
  /**
   * Mock-style lock: each part's audio is one-shot, no scrubber, and the
   * shell renders a "Đã khoá audio" placeholder once `lockedPartIds`
   * contains this part. Caller flips parts into the locked set on `onEnded`.
   */
  playOnce?: boolean;
  lockedPartIds?: ReadonlySet<string>;
  /** Called the moment audio for the active part begins (parent uses it to
   *  mark "played" + start clamping replays). */
  onPartPlay?: (partId: string) => void;
  /** Called when active part's audio finishes. Drives the play-once lock. */
  onPartEnded?: (partId: string) => void;
  /** Mock-style: parts can only advance forward via the "Next" button. */
  forwardOnly?: boolean;
  /** Override the right-side submit button label. Defaults to "Nộp bài". */
  submitLabel?: string;
}

const VN_LABEL = (n: number) => (n === 1 ? "Part 1" : `Part ${n}`);

export function ListeningShell({
  brandLogo,
  brandName = "Bee IELTS",
  title,
  parts,
  activeIdx,
  onActiveIdxChange,
  answers,
  onChangeAnswer,
  onSubmit,
  submitted = false,
  remainingSec = null,
  elapsedSec = 0,
  playOnce = false,
  lockedPartIds,
  onPartPlay,
  onPartEnded,
  forwardOnly = false,
  submitLabel = "Nộp bài",
}: ListeningShellProps) {
  const current = parts[activeIdx];

  // For the bottom strip — answered count per part so the "Part 2: 0 of 10"
  // pills accurately track progress for inactive parts.
  const answeredPerPart = useMemo(
    () =>
      parts.map(
        (p) => p.questions.filter((q) => (answers[q.id] || "").trim()).length,
      ),
    [parts, answers],
  );

  // Bottom-strip part switcher. Forward-only means we never let the learner
  // jump back to an already-played part (mock test rule); free-nav means any
  // pill is clickable. The shell still always allows clicking *forward* into
  // a part the parent has marked unreachable by simply not advancing if the
  // caller rejects via not updating activeIdx — but in practice all callers
  // accept forward moves.
  const canJumpTo = (idx: number) => {
    if (idx === activeIdx) return true;
    if (forwardOnly) return idx > activeIdx;
    return true;
  };

  return (
    <div className="fixed inset-0 z-[40] flex flex-col bg-background text-foreground">
      <ShellHeader
        brandLogo={brandLogo}
        brandName={brandName}
        title={title}
        remainingSec={remainingSec}
        elapsedSec={elapsedSec}
        submitted={submitted}
        onSubmit={onSubmit}
        submitLabel={submitLabel}
      />

      <AudioStrip
        key={current.id}
        part={current}
        playOnce={playOnce}
        locked={!!lockedPartIds?.has(current.id)}
        onPlay={onPartPlay}
        onEnded={onPartEnded}
      />

      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-28">
        <div className="max-w-4xl mx-auto space-y-5">
          <PartHeading part={current} />
          {current.instructions && (
            <p className="text-[15px] text-foreground/90 whitespace-pre-wrap">
              {current.instructions}
            </p>
          )}
          <PartBody
            part={current}
            answers={answers}
            onChange={onChangeAnswer}
            disabled={submitted}
            submitted={submitted}
          />
        </div>
      </div>

      <BottomNav
        parts={parts}
        activeIdx={activeIdx}
        onChange={(i) => canJumpTo(i) && onActiveIdxChange(i)}
        answeredPerPart={answeredPerPart}
        forwardOnly={forwardOnly}
      />

      {/* Floating prev/next arrows — same as the LexiPrep-style screenshot.
          Disabled at the edges; forwardOnly blocks the back arrow. */}
      <FloatingArrows
        activeIdx={activeIdx}
        total={parts.length}
        onPrev={
          forwardOnly || activeIdx === 0
            ? null
            : () => onActiveIdxChange(activeIdx - 1)
        }
        onNext={
          activeIdx === parts.length - 1
            ? null
            : () => onActiveIdxChange(activeIdx + 1)
        }
      />
    </div>
  );
}

/* -------------------------------------------------------------- *
 *  Header — brand + countdown + Review / Submit buttons          *
 * -------------------------------------------------------------- */
function ShellHeader({
  brandLogo,
  brandName,
  title,
  remainingSec,
  elapsedSec,
  submitted,
  onSubmit,
  submitLabel,
}: {
  brandLogo?: React.ReactNode;
  brandName: string;
  title: string;
  remainingSec: number | null;
  elapsedSec: number;
  submitted: boolean;
  onSubmit: () => void;
  submitLabel: string;
}) {
  const showCountdown = remainingSec != null;
  const lowTime = showCountdown && (remainingSec ?? 0) <= 5 * 60;
  return (
    <header className="border-b bg-card/95 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-3 px-4 md:px-6 h-14">
        <div className="flex items-center gap-2 min-w-0">
          {brandLogo ?? (
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              🐝
            </div>
          )}
          <div className="text-sm font-bold truncate">
            <span className="text-primary">{brandName}</span>
            <span className="text-muted-foreground mx-1.5">/</span>
            <span className="text-foreground/90">{title}</span>
          </div>
        </div>
        <div className="flex-1" />
        <div
          className={cn(
            "hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold",
            showCountdown
              ? lowTime
                ? "bg-rose-500/10 text-rose-600 animate-pulse"
                : "bg-muted text-foreground/80"
              : "bg-muted text-foreground/80",
          )}
        >
          <Clock className="h-4 w-4" />
          {showCountdown ? (
            <span>{formatDuration(remainingSec ?? 0)} còn lại</span>
          ) : (
            <span>Đã làm {formatDuration(elapsedSec)}</span>
          )}
        </div>
        <button
          type="button"
          className="hidden md:grid h-9 w-9 place-items-center rounded-lg border bg-card hover:bg-accent transition-colors text-muted-foreground"
          aria-label="Ghi chú nhanh"
          title="Ghi chú nhanh"
        >
          <AlertTriangle className="h-4 w-4" />
        </button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl gap-1.5"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
            }
          }}
        >
          <Search className="h-3.5 w-3.5" /> Review
        </Button>
        {!submitted && (
          <Button
            size="sm"
            onClick={onSubmit}
            className="rounded-xl gap-1.5 bg-primary"
          >
            {submitLabel} <Send className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </header>
  );
}

/* -------------------------------------------------------------- *
 *  Audio strip — volume slider + scrubber + remaining time       *
 * -------------------------------------------------------------- */
function AudioStrip({
  part,
  playOnce,
  locked,
  onPlay,
  onEnded,
}: {
  part: ListeningPart;
  playOnce: boolean;
  locked: boolean;
  onPlay?: (partId: string) => void;
  onEnded?: (partId: string) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [volume, setVolume] = useState(0.85);
  const [duration, setDuration] = useState(0);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const hasReal = !!part.audioUrl && !part.audioUrl.startsWith("/audio/sample");

  // Reset playback state whenever the active part changes — the audio el is
  // keyed on part.id outside, but the strip state lives here.
  useEffect(() => {
    setPos(0);
    setDuration(0);
    setPlaying(false);
  }, [part.id]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Auto-play the part's audio as soon as the strip mounts. The user gesture
  // that drove the navigation (clicking the part tab / "Sang Section X")
  // generally satisfies browser autoplay policy. If it fails we fall back to
  // a visible play button so the learner can recover.
  useEffect(() => {
    if (!hasReal || locked) return;
    const el = audioRef.current;
    if (!el) return;
    const id = setTimeout(() => {
      el.play()
        .then(() => {
          setPlaying(true);
          onPlay?.(part.id);
        })
        .catch(() => {
          // Autoplay blocked — UI shows the manual play button.
        });
    }, 60);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part.id, hasReal, locked]);

  const manualPlay = async () => {
    const el = audioRef.current;
    if (!el || locked) return;
    try {
      await el.play();
      setPlaying(true);
      onPlay?.(part.id);
    } catch {
      /* ignore */
    }
  };

  const onSeek = (next: number) => {
    if (playOnce || locked) return;
    const el = audioRef.current;
    if (!el || !duration) return;
    el.currentTime = next;
    setPos(next);
  };

  const remaining = Math.max(0, duration - pos);
  const fmtAudio = (s: number) => {
    if (!isFinite(s)) return "00:00";
    const total = Math.floor(s);
    const m = Math.floor(total / 60).toString().padStart(2, "0");
    const sec = (total % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <div className="border-b bg-card px-4 md:px-8 py-2.5">
      <div className="max-w-4xl mx-auto flex items-center gap-3">
        {hasReal && (
          <audio
            ref={audioRef}
            src={part.audioUrl}
            preload="metadata"
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
            onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => {
              setPlaying(false);
              onEnded?.(part.id);
            }}
            className="hidden"
          />
        )}

        {locked ? (
          <div className="flex-1 flex items-center justify-center gap-2 text-sm font-bold text-muted-foreground py-1.5">
            <Lock className="h-4 w-4" /> Đã nghe xong — không thể nghe lại
          </div>
        ) : !hasReal ? (
          // No real audio source — fall back to a tiny "Phát audio" stub so
          // the strip stays present. (TTS-based fallback used to live here;
          // the practice player still handles it independently in its body
          // for the no-real-audio test data.)
          <div className="flex-1 flex items-center justify-center gap-2 text-xs text-muted-foreground py-1.5">
            <Headphones className="h-4 w-4" /> Audio test — sẽ phát khi có file
          </div>
        ) : (
          <>
            {!playing && pos === 0 && (
              <button
                type="button"
                onClick={manualPlay}
                aria-label="Phát audio"
                className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground hover:opacity-90 shrink-0"
              >
                <Play className="h-3.5 w-3.5 ml-0.5" />
              </button>
            )}
            <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 accent-primary"
              aria-label="Âm lượng"
            />
            {playOnce ? (
              // No scrub bar in mock mode — IELTS rule. Show a thin progress
              // line + the remaining time so the candidate still has feedback.
              <div className="flex-1 mx-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-[width]"
                  style={{ width: duration ? `${(pos / duration) * 100}%` : "0%" }}
                />
              </div>
            ) : (
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={0.1}
                value={pos}
                onChange={(e) => onSeek(parseFloat(e.target.value))}
                className="flex-1 accent-primary"
                aria-label="Vị trí audio"
              />
            )}
            <span className="text-xs font-mono text-muted-foreground tabular-nums shrink-0 min-w-[3.5rem] text-right">
              -{fmtAudio(remaining)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- *
 *  Part heading — "Part N" / "Questions a-b" / instructions      *
 * -------------------------------------------------------------- */
function PartHeading({ part }: { part: ListeningPart }) {
  const last = part.startNum + part.questions.length - 1;
  return (
    <div className="space-y-1">
      <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
        {part.title || `Part ${part.index}`}
      </h2>
      <p className="text-base md:text-lg font-bold text-primary">
        Questions {part.startNum}-{last}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------- *
 *  Part body — bordered card with questions / FormBlanks         *
 * -------------------------------------------------------------- */
function PartBody({
  part,
  answers,
  onChange,
  disabled,
  submitted,
}: {
  part: ListeningPart;
  answers: Record<string, string>;
  onChange: (id: string, v: string) => void;
  disabled?: boolean;
  submitted?: boolean;
}) {
  const units = groupQuestions(part.questions);
  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      {part.contentImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={part.contentImageUrl}
          alt=""
          className="w-full max-h-[26rem] object-contain bg-muted/20 border-b"
        />
      )}
      <div className="p-5 md:p-6 space-y-4">
        {units.map((unit, ui) => {
          if (unit.kind === "form") {
            const Block = unit.layout === "table" ? TableBlanks : FormBlanks;
            const start = part.startNum + unit.startNum - 1;
            return (
              <div key={`form-${ui}`}>
                <Block
                  items={unit.items}
                  startNum={start}
                  answers={answers}
                  onChange={onChange}
                  disabled={disabled}
                  submitted={submitted}
                />
              </div>
            );
          }
          const q = unit.q;
          const num = part.startNum + unit.num - 1;
          const displayNum = q.displayNumber ?? num;
          const userAns = answers[q.id] || "";
          const isCorrect = isAnswerCorrect(userAns, q.correctAnswer, q.type);
          return (
            <div
              key={q.id}
              data-question-id={q.id}
              className={cn(
                "space-y-2.5 border-l-4 pl-3.5 py-1",
                submitted
                  ? isCorrect
                    ? "border-emerald-500"
                    : "border-rose-500"
                  : "border-primary/30",
              )}
            >
              <div className="flex items-start gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-xs font-extrabold">
                  {displayNum}
                </span>
                <p className="font-medium flex-1 leading-relaxed">{q.prompt}</p>
              </div>
              {q.type === "MATCHING_HEADINGS" || q.type === "MATCHING" ? (
                <HeadingPicker
                  options={q.options ?? []}
                  value={userAns}
                  correct={q.correctAnswer}
                  submitted={!!submitted}
                  onChange={(v) => onChange(q.id, v)}
                  label={q.type === "MATCHING" ? "Danh sách câu nối" : "Danh sách Heading"}
                  placeholder={q.type === "MATCHING" ? "— Chọn A/B/C/… —" : "— Chọn heading —"}
                />
              ) : q.options ? (
                <div className="space-y-2 ml-8">
                  {q.options.map((opt) => (
                    <label
                      key={opt}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors",
                        !disabled && "hover:bg-accent",
                        userAns === opt && "border-primary bg-primary/5",
                        submitted &&
                          opt === q.correctAnswer &&
                          "border-emerald-500 bg-emerald-500/5",
                        submitted &&
                          userAns === opt &&
                          opt !== q.correctAnswer &&
                          "border-rose-500 bg-rose-500/5",
                      )}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={opt}
                        disabled={disabled}
                        checked={userAns === opt}
                        onChange={(e) => onChange(q.id, e.target.value)}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="ml-8">
                  <Input
                    placeholder="Câu trả lời…"
                    value={userAns}
                    disabled={disabled}
                    onChange={(e) => onChange(q.id, e.target.value)}
                    className="rounded-full border-2 border-primary/40 focus-visible:border-primary"
                  />
                </div>
              )}
              {submitted && !isCorrect && (
                <p className="text-xs ml-8 text-muted-foreground">
                  Đáp án đúng: <strong className="text-emerald-600">{q.correctAnswer}</strong>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- *
 *  Bottom part navigator — "Part 1 [1] 2 3 4 5 …  Part 2: 0/10"  *
 * -------------------------------------------------------------- */
function BottomNav({
  parts,
  activeIdx,
  onChange,
  answeredPerPart,
  forwardOnly,
}: {
  parts: ListeningPart[];
  activeIdx: number;
  onChange: (idx: number) => void;
  answeredPerPart: number[];
  forwardOnly: boolean;
}) {
  return (
    <div className="border-t bg-card sticky bottom-0 z-10">
      <div className="px-3 md:px-6 py-2 flex items-stretch gap-2 overflow-x-auto">
        {parts.map((p, i) => {
          const active = i === activeIdx;
          const reachable = forwardOnly ? i >= activeIdx : true;
          if (active) {
            // Active part — expand into numbered pills (1, 2, 3, …) for quick
            // jumping. We're not implementing per-question scroll spy yet, so
            // the pill click no-ops aside from highlighting the part.
            return (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-xl border bg-background px-3 py-1.5 shrink-0"
              >
                <span className="text-sm font-bold whitespace-nowrap">
                  {VN_LABEL(p.index)}
                </span>
                <div className="flex items-center gap-1">
                  {p.questions.map((q, qi) => {
                    const num = p.startNum + qi;
                    const filled = !!(q && (q.id in {} || false));
                    void filled;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => {
                          const el = document.querySelector(
                            `[data-question-id="${q.id}"]`,
                          );
                          if (el)
                            el.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
                        }}
                        className={cn(
                          "grid h-7 min-w-[28px] place-items-center rounded-full text-xs font-bold transition-colors",
                          qi === 0
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent",
                        )}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }
          return (
            <button
              key={p.id}
              type="button"
              disabled={!reachable}
              onClick={() => reachable && onChange(i)}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm shrink-0 transition-colors",
                reachable
                  ? "bg-card hover:bg-accent cursor-pointer"
                  : "bg-muted/40 text-muted-foreground/60 cursor-not-allowed",
              )}
            >
              <span className="font-bold">{VN_LABEL(p.index)}:</span>
              <span className="text-xs">
                {answeredPerPart[i]} of {p.questions.length} questions
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- *
 *  Floating prev/next arrows — bottom-right corner               *
 * -------------------------------------------------------------- */
function FloatingArrows({
  activeIdx,
  total,
  onPrev,
  onNext,
}: {
  activeIdx: number;
  total: number;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
}) {
  void activeIdx;
  void total;
  return (
    <div className="fixed bottom-24 right-4 md:right-8 z-20 flex flex-col gap-2">
      <button
        type="button"
        disabled={!onPrev}
        onClick={() => onPrev?.()}
        aria-label="Trước"
        className={cn(
          "grid h-10 w-10 place-items-center rounded-full border-2 shadow-lg transition-colors",
          onPrev
            ? "bg-card hover:bg-accent border-border text-foreground"
            : "bg-muted/40 border-transparent text-muted-foreground/40 cursor-not-allowed",
        )}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        disabled={!onNext}
        onClick={() => onNext?.()}
        aria-label="Tiếp"
        className={cn(
          "grid h-10 w-10 place-items-center rounded-full border-2 shadow-lg transition-colors",
          onNext
            ? "bg-primary hover:opacity-90 border-primary text-primary-foreground"
            : "bg-muted/40 border-transparent text-muted-foreground/40 cursor-not-allowed",
        )}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------- *
 *  Matching Headings dropdown — same UX as reading/listening     *
 * -------------------------------------------------------------- */
function HeadingPicker({
  options,
  value,
  correct,
  submitted,
  onChange,
  label,
  placeholder,
}: {
  options: string[];
  value: string;
  correct: string;
  submitted: boolean;
  onChange: (v: string) => void;
  label: string;
  placeholder: string;
}) {
  const items = options.map((opt) => {
    const m = opt.match(/^([A-Z]|[ivxIVX]+)\.\s*(.*)$/);
    if (!m) return { key: opt, label: opt };
    const raw = m[1];
    const isLetter = /^[A-Z]$/.test(raw);
    return { key: isLetter ? raw : raw.toLowerCase(), label: m[2] };
  });
  return (
    <div className="ml-8 space-y-2">
      <div className="rounded-lg border bg-muted/30 px-3 py-2">
        <div className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1">
          {label}
        </div>
        <ul className="space-y-0.5 text-sm leading-relaxed">
          {items.map((it) => (
            <li key={it.key}>
              <span className="font-bold mr-1">{it.key}.</span> {it.label}
            </li>
          ))}
        </ul>
      </div>
      <select
        value={value}
        disabled={submitted}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-10 w-full rounded-lg border-2 bg-background px-3 text-sm font-bold",
          submitted && value === correct && "border-emerald-500",
          submitted && value !== correct && "border-rose-500",
        )}
      >
        <option value="">{placeholder}</option>
        {items.map((it) => (
          <option key={it.key} value={it.key}>
            {it.key}. {it.label}
          </option>
        ))}
      </select>
      {submitted && value !== correct && (
        <p className="text-xs text-muted-foreground">
          Đáp án đúng: <strong className="text-emerald-600">{correct}</strong>
        </p>
      )}
    </div>
  );
}
