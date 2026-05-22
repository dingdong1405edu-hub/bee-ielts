"use client";
import { cn } from "@/lib/utils";

/** Minimum shape a question needs to be rendered inside a form/table block. */
export interface FormQuestion {
  id: string;
  prompt: string;
  correctAnswer: string;
}

export type QuestionUnit<T> =
  | { kind: "form"; items: T[]; startNum: number; layout: "text" | "table" }
  | { kind: "single"; q: T; num: number };

/**
 * Split a flat question list into render units. A run of consecutive
 * questions sharing the same non-empty `formGroup` becomes one "form" unit;
 * a formGroup starting with "tbl" is laid out as a table, otherwise as a
 * flowing passage. Every other question is "single".
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
      units.push({ kind: "form", items, startNum, layout: fg.startsWith("tbl") ? "table" : "text" });
    } else {
      units.push({ kind: "single", q: questions[i], num: i + 1 });
      i++;
    }
  }
  return units;
}

/** An inline numbered answer input, shared by the flowing and table layouts. */
function BlankInput({
  num,
  value,
  correctAnswer,
  onChange,
  disabled,
  submitted,
}: {
  num: number;
  value: string;
  correctAnswer: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  submitted?: boolean;
}) {
  const correct = value.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
  return (
    <span className="inline-flex items-center gap-1 align-middle mx-0.5">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-600 text-white text-[11px] font-bold shrink-0">
        {num}
      </span>
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "inline-block min-w-[110px] rounded-full border-2 outline-none bg-background px-3 py-0.5 text-sm font-medium",
          submitted
            ? correct
              ? "border-success"
              : "border-destructive"
            : "border-emerald-600/60 focus:border-emerald-600",
        )}
      />
      {submitted && !correct && (
        <span className="text-xs font-bold text-success">✓ {correctAnswer}</span>
      )}
    </span>
  );
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
        const parts = it.prompt.split(/(_{2,}|\{N\})/g);
        let replaced = false;
        return (
          <span key={it.id}>
            {parts.map((p, i) => {
              if (!replaced && (/_{2,}/.test(p) || /\{N\}/.test(p))) {
                replaced = true;
                return (
                  <BlankInput
                    key={i}
                    num={startNum + idx}
                    value={answers[it.id] || ""}
                    correctAnswer={it.correctAnswer}
                    onChange={(v) => onChange(it.id, v)}
                    disabled={disabled}
                    submitted={submitted}
                  />
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

/**
 * Renders a pasted table-completion task. The stitched prompts form a
 * `\n`-rows / `|`-cells grid; the first row is the header and each `___`
 * marker (walked in reading order) becomes an inline numbered input.
 */
export function TableBlanks({
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
  const rows = items
    .map((it) => it.prompt)
    .join("")
    .split("\n")
    .map((r) => r.split("|"));
  let blankIdx = 0;
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full border-collapse text-[14px]">
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => {
                const parts = cell.trim().split(/(_{2,}|\{N\})/g);
                const content = parts.map((p, pi) => {
                  if (/_{2,}/.test(p) || /\{N\}/.test(p)) {
                    const it = items[blankIdx];
                    const num = startNum + blankIdx;
                    blankIdx++;
                    if (!it) return null;
                    return (
                      <BlankInput
                        key={pi}
                        num={num}
                        value={answers[it.id] || ""}
                        correctAnswer={it.correctAnswer}
                        onChange={(v) => onChange(it.id, v)}
                        disabled={disabled}
                        submitted={submitted}
                      />
                    );
                  }
                  return <span key={pi}>{p}</span>;
                });
                return ri === 0 ? (
                  <th key={ci} className="border px-3 py-2.5 text-left font-bold bg-muted/50">
                    {content}
                  </th>
                ) : (
                  <td key={ci} className="border px-3 py-2.5 text-left align-top leading-loose">
                    {content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
