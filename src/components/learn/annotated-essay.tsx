import { cn } from "@/lib/utils";

interface Annotation {
  category?: string;
  excerpt: string;
  issue: string;
  suggestion: string;
  /** The exact English text that should replace `excerpt` (track-changes view). */
  correction?: string;
}

/** Underline + text colour for each error category (highlight-only mode). */
const CATEGORY_MARK: Record<string, string> = {
  grammar: "decoration-rose-500 text-rose-600 dark:text-rose-400",
  vocabulary: "decoration-gold-500 text-gold-700 dark:text-gold-400",
  coherence: "decoration-sage-500 text-sage-700 dark:text-sage-400",
  task: "decoration-[#1CB0F6] text-[#1CB0F6] dark:text-[#6FCDFA]",
};

/** Background for the inserted (corrected) text in track-changes mode. */
const CATEGORY_INS: Record<string, string> = {
  grammar: "bg-emerald-200/80 text-emerald-900 dark:bg-emerald-500/25 dark:text-emerald-100",
  vocabulary: "bg-gold-200/80 text-gold-900 dark:bg-gold-500/25 dark:text-gold-100",
  coherence: "bg-sage-200/80 text-sage-900 dark:bg-sage-500/25 dark:text-sage-100",
  task: "bg-sky-200/80 text-sky-900 dark:bg-sky-500/25 dark:text-sky-100",
};

/**
 * Renders the candidate's essay with every error excerpt marked inline.
 *
 * Two modes:
 *  - default (`showCorrections` false): bold + coloured underline; hover shows
 *    the issue + fix. Used where space is tight.
 *  - track-changes (`showCorrections` true): YouPass-style diff — the wrong
 *    excerpt is struck through and the corrected text is shown right after it,
 *    highlighted by category. Errors with no `correction` fall back to the
 *    underline mark. Excerpts that can't be located verbatim are left as-is.
 */
export function AnnotatedEssay({
  essay,
  annotations,
  showCorrections = false,
}: {
  essay: string;
  annotations: Annotation[];
  showCorrections?: boolean;
}) {
  const text = essay.normalize("NFC");
  const lower = text.toLowerCase();

  // Locate each excerpt's first occurrence, then keep only non-overlapping ranges.
  const ranges: { start: number; end: number; ann: Annotation }[] = [];
  for (const ann of annotations) {
    const ex = (ann.excerpt ?? "").trim();
    if (ex.length < 2) continue;
    const idx = lower.indexOf(ex.toLowerCase());
    if (idx === -1) continue;
    ranges.push({ start: idx, end: idx + ex.length, ann });
  }
  ranges.sort((a, b) => a.start - b.start);
  const marks: typeof ranges = [];
  let lastEnd = 0;
  for (const r of ranges) {
    if (r.start >= lastEnd) {
      marks.push(r);
      lastEnd = r.end;
    }
  }

  if (marks.length === 0) {
    return <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>;
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  marks.forEach((r, i) => {
    if (r.start > cursor) parts.push(text.slice(cursor, r.start));
    const cat = r.ann.category ?? "grammar";
    const original = text.slice(r.start, r.end);
    const tip = `⚠️ ${r.ann.issue}\n✅ ${r.ann.suggestion}`;
    const correction = (r.ann.correction ?? "").trim();

    if (showCorrections && correction) {
      // Track-changes: strikethrough wrong text + highlighted correction.
      parts.push(
        <span key={i} title={tip} className="cursor-help whitespace-normal">
          <del className="text-rose-500/80 line-through decoration-rose-400 decoration-1 dark:text-rose-400/80">
            {original}
          </del>{" "}
          <ins className={cn("rounded px-1 font-bold no-underline", CATEGORY_INS[cat] ?? CATEGORY_INS.grammar)}>
            {correction}
          </ins>
        </span>,
      );
    } else {
      parts.push(
        <mark
          key={i}
          title={tip}
          className={cn(
            "cursor-help bg-transparent font-bold underline decoration-2 underline-offset-2",
            CATEGORY_MARK[cat] ?? CATEGORY_MARK.grammar,
          )}
        >
          {original}
        </mark>,
      );
    }
    cursor = r.end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));

  return <p className="whitespace-pre-wrap text-sm leading-relaxed">{parts}</p>;
}
