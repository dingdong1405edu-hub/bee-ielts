import { cn } from "@/lib/utils";

interface Annotation {
  category?: string;
  excerpt: string;
  issue: string;
  suggestion: string;
}

/** Underline + text colour for each error category. */
const CATEGORY_MARK: Record<string, string> = {
  grammar: "decoration-rose-500 text-rose-600 dark:text-rose-400",
  vocabulary: "decoration-violet-500 text-violet-600 dark:text-violet-400",
  coherence: "decoration-amber-500 text-amber-600 dark:text-amber-400",
  task: "decoration-sky-500 text-sky-600 dark:text-sky-400",
};

/**
 * Renders the candidate's essay with every error excerpt highlighted inline —
 * bold + a coloured underline. Hovering a highlight shows the issue and the
 * suggested fix. Errors that can't be located verbatim are simply not marked.
 */
export function AnnotatedEssay({
  essay,
  annotations,
}: {
  essay: string;
  annotations: Annotation[];
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
    parts.push(
      <mark
        key={i}
        title={`⚠️ ${r.ann.issue}\n✅ ${r.ann.suggestion}`}
        className={cn(
          "cursor-help bg-transparent font-bold underline decoration-2 underline-offset-2",
          CATEGORY_MARK[cat] ?? CATEGORY_MARK.grammar,
        )}
      >
        {text.slice(r.start, r.end)}
      </mark>,
    );
    cursor = r.end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));

  return <p className="whitespace-pre-wrap text-sm leading-relaxed">{parts}</p>;
}
