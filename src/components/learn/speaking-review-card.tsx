"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, Lightbulb, Play, Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Per-question score card in the luyennoi.com style: a tinted block with
 * the question, a colored band circle on the right, four criterion pills
 * underneath, plus a collapsible "Cải thiện câu này" panel with the
 * AI's opener + advice + inline-annotated transcript. Color coding:
 * band ≥ 7 → green, 5-6.9 → amber, < 5 → gray. When the band is the
 * lowest among siblings the parent paints a yellow "Câu yếu nhất" ring
 * around the entire card.
 */
export interface QuestionTip {
  question: string;
  band?: number;
  criteria?: {
    fluencyCoherence?: number;
    lexicalResource?: number;
    grammaticalRange?: number;
    pronunciation?: number;
  };
  transcript?: string;
  opener?: string;
  advice?: string;
}

export interface Correction {
  original: string;
  corrected: string;
  explanation: string;
}

export function bandTone(band: number | undefined | null) {
  if (band == null || !Number.isFinite(band) || band <= 0) {
    return { bg: "bg-zinc-400", text: "text-white", border: "border-zinc-400" };
  }
  if (band >= 7) {
    return { bg: "bg-emerald-500", text: "text-white", border: "border-emerald-400" };
  }
  if (band >= 5) {
    return { bg: "bg-amber-400", text: "text-amber-950", border: "border-amber-300" };
  }
  return { bg: "bg-zinc-300", text: "text-zinc-700", border: "border-zinc-300" };
}

export function pillTone(band: number | undefined | null) {
  if (band == null || !Number.isFinite(band) || band <= 0) {
    return "bg-zinc-300 text-zinc-700";
  }
  if (band >= 7) return "bg-emerald-500 text-white";
  if (band >= 5) return "bg-amber-300 text-amber-950";
  return "bg-zinc-200 text-zinc-700";
}

/** Big round band display (mimics luyennoi.com's score circle). */
export function BandCircle({ band, size = "md" }: { band: number | undefined; size?: "sm" | "md" | "lg" }) {
  const tone = bandTone(band);
  const dim =
    size === "sm" ? "h-10 w-10 text-base" : size === "lg" ? "h-16 w-16 text-2xl" : "h-12 w-12 text-lg";
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-extrabold shadow-md",
        dim,
        tone.bg,
        tone.text,
      )}
    >
      {band == null || !Number.isFinite(band) ? "0.0" : band.toFixed(1)}
    </div>
  );
}

/** Four-criteria pill row (Trôi chảy / Từ vựng / Ngữ pháp / Phát âm). */
export function CriteriaPills({
  criteria,
  weakest,
}: {
  criteria?: QuestionTip["criteria"];
  /** Highlight the lowest of the four with a saturated bg + ring. */
  weakest?: boolean;
}) {
  const items = [
    ["Trôi chảy", criteria?.fluencyCoherence],
    ["Từ vựng", criteria?.lexicalResource],
    ["Ngữ pháp", criteria?.grammaticalRange],
    ["Phát âm", criteria?.pronunciation],
  ] as const;
  const known = items.filter(([, v]) => v != null && Number.isFinite(v as number));
  const minVal = known.length
    ? Math.min(...known.map(([, v]) => v as number))
    : -1;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(([label, val]) => {
        const v = val as number | undefined;
        const isLow = weakest && v != null && v === minVal;
        return (
          <span
            key={label}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
              pillTone(v),
              isLow && "ring-2 ring-amber-500 shadow",
            )}
          >
            {label}:{" "}
            <span className="font-extrabold">
              {v == null || !Number.isFinite(v) ? "0" : v}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/**
 * Transcript text with `corrections.original` substrings rendered as
 * strikethrough red, immediately followed by the green `corrected`
 * version inline — same effect as luyennoi.com's inline "uh job, uh"
 * style. Case-insensitive substring match; first occurrence per
 * correction. Falls back to plain text if no corrections.
 */
export function AnnotatedTranscript({
  text,
  corrections = [],
}: {
  text: string;
  corrections?: Correction[];
}) {
  if (!text) {
    return (
      <p className="text-sm italic text-muted-foreground">
        Không có bản ghi cho câu này.
      </p>
    );
  }
  if (!corrections.length) {
    return <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>;
  }
  // Walk through the text linearly. For each segment, find the earliest
  // matching correction and split around it. Repeat until exhausted.
  const lower = text.toLowerCase();
  type Match = { start: number; end: number; original: string; corrected: string };
  const matches: Match[] = [];
  const used = new Set<number>();
  for (const c of corrections) {
    if (!c.original) continue;
    const needle = c.original.toLowerCase();
    let from = 0;
    while (from < lower.length) {
      const idx = lower.indexOf(needle, from);
      if (idx === -1) break;
      // Don't overlap
      if (![...used].some((i) => i >= idx && i < idx + needle.length)) {
        matches.push({ start: idx, end: idx + needle.length, original: c.original, corrected: c.corrected });
        for (let i = idx; i < idx + needle.length; i++) used.add(i);
        break;
      }
      from = idx + 1;
    }
  }
  matches.sort((a, b) => a.start - b.start);
  if (matches.length === 0) {
    return <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>;
  }
  const out: React.ReactNode[] = [];
  let cursor = 0;
  matches.forEach((m, i) => {
    if (m.start > cursor) out.push(<span key={`t-${i}`}>{text.slice(cursor, m.start)}</span>);
    out.push(
      <span
        key={`m-${i}`}
        className="inline rounded bg-red-100 text-red-700 line-through decoration-red-500/70 px-0.5"
        title={m.corrected}
      >
        {text.slice(m.start, m.end)}
      </span>,
    );
    out.push(
      <span
        key={`c-${i}`}
        className="inline rounded bg-emerald-100 text-emerald-800 px-1 mx-0.5 font-semibold"
      >
        {m.corrected}
      </span>,
    );
    cursor = m.end;
  });
  if (cursor < text.length) out.push(<span key="tail">{text.slice(cursor)}</span>);
  return <p className="text-sm leading-relaxed whitespace-pre-wrap">{out}</p>;
}

export function QuestionScoreCard({
  index,
  tip,
  corrections,
  isWeakest,
}: {
  index: number;
  tip: QuestionTip;
  corrections?: Correction[];
  isWeakest?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn(
        "rounded-2xl border-2 bg-card transition-all",
        isWeakest ? "border-amber-400 ring-2 ring-amber-300/40 shadow-md" : "border-border",
      )}
    >
      {isWeakest && (
        <div className="px-4 pt-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider">
            <Star className="h-3 w-3 fill-current" /> Câu yếu nhất
          </span>
        </div>
      )}
      <div className="p-4 flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Câu {index + 1}
            </div>
            <button
              onClick={() => setOpen((o) => !o)}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              {open ? "Ẩn gợi ý" : "Cải thiện câu này"}
              {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p className="text-sm font-semibold leading-snug">{tip.question}</p>
          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border p-3">
            <div className="flex items-start gap-2">
              <Play className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <AnnotatedTranscript text={tip.transcript ?? ""} corrections={corrections} />
              </div>
            </div>
          </div>
          <CriteriaPills criteria={tip.criteria} weakest={isWeakest} />
          {open && (tip.opener || tip.advice) && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 p-3 space-y-1.5">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                <Lightbulb className="h-3.5 w-3.5" /> Gợi ý cải thiện
              </div>
              {tip.opener && (
                <p className="text-sm italic text-emerald-800 dark:text-emerald-300">
                  &quot;{tip.opener}&quot;
                </p>
              )}
              {tip.advice && (
                <p className="text-xs text-foreground/80 leading-relaxed">{tip.advice}</p>
              )}
            </div>
          )}
        </div>
        <BandCircle band={tip.band} size="md" />
      </div>
    </div>
  );
}

/** Top-of-page summary band + criteria — used in review pages. */
export function SpeakingSummaryHeader({
  overall,
  criteria,
  date,
}: {
  overall: number | undefined;
  criteria: QuestionTip["criteria"];
  date?: string;
}) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent border-2 border-primary/20 p-5">
      <div className="flex items-start gap-4 flex-wrap">
        <BandCircle band={overall} size="lg" />
        <div className="flex-1 min-w-0">
          {date && (
            <div className="text-xs text-muted-foreground font-bold">{date}</div>
          )}
          <div className="font-extrabold text-lg">Speaking — band {(overall ?? 0).toFixed(1)}</div>
          <div className="mt-2">
            <CriteriaPills criteria={criteria} weakest={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
