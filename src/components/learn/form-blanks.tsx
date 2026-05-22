"use client";
import { cn } from "@/lib/utils";

/** Minimum shape a question needs to be rendered inside a form-completion block. */
export interface FormQuestion {
  id: string;
  prompt: string;
  correctAnswer: string;
}

export type QuestionUnit<T> =
  | { kind: "form"; items: T[]; startNum: number }
  | { kind: "single"; q: T; num: number };

/**
 * Split a flat question list into render units. A run of consecutive
 * questions sharing the same non-empty `formGroup` becomes one "form" unit
 * (rendered as a single flowing passage); every other question is "single".
 */
export function groupQuestions<T extends { formGroup?: string | null }>(
  questions: T[],
): QuestionUnit<T>[] {
  const units: QuestionUnit<T>[] = [];
  let i = 0;
  while (i < questions.length) {
    const fg = questions[i].formGroup;
    if (fg) {
      const items: T[] = [];
      const startNum = i + 1;
      while (i < questions.length && questions[i].formGroup === fg) {
        items.push(questions[i]);
        i++;
      }
      units.push({ kind: "form", items, startNum });
    } else {
      units.push({ kind: "single", q: questions[i], num: i + 1 });
      i++;
    }
  }
  return units;
}

/**
 * Renders a pasted form-completion passage as ONE flowing block: the segment
 * prompts run together, line breaks from the original form are kept, and each
 * `___` marker becomes an inline numbered answer input.
 */
export function FormBlanks({
  items,
  startNum,
  answers,
  onChange,
  disabled,
  submitted,
}: {
  items: FormQuestion[];
  startNum: number;
  answers: Record<string, string>;
  onChange: (id: string, v: string) => void;
  disabled?: boolean;
  submitted?: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 text-[15px] leading-[2.4] whitespace-pre-wrap">
      {items.map((it, idx) => {
        const num = startNum + idx;
        const val = answers[it.id] || "";
        const correct = val.trim().toLowerCase() === it.correctAnswer.trim().toLowerCase();
        const parts = it.prompt.split(/(_{2,}|\{N\})/g);
        let replaced = false;
        return (
          <span key={it.id}>
            {parts.map((p, i) => {
              if (!replaced && (/_{2,}/.test(p) || /\{N\}/.test(p))) {
                replaced = true;
                return (
                  <span key={i} className="inline-flex items-center gap-1 align-middle mx-0.5">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-600 text-white text-[11px] font-bold shrink-0">
                      {num}
                    </span>
                    <input
                      value={val}
                      disabled={disabled}
                      onChange={(e) => onChange(it.id, e.target.value)}
                      className={cn(
                        "inline-block min-w-[130px] rounded-full border-2 outline-none bg-background px-3 py-0.5 text-sm font-medium",
                        submitted
                          ? correct
                            ? "border-success"
                            : "border-destructive"
                          : "border-emerald-600/60 focus:border-emerald-600",
                      )}
                    />
                    {submitted && !correct && (
                      <span className="text-xs font-bold text-success">✓ {it.correctAnswer}</span>
                    )}
                  </span>
                );
              }
              return <span key={i}>{p}</span>;
            })}
          </span>
        );
      })}
    </div>
  );
}
