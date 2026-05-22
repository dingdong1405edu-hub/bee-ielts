/**
 * Helpers for the "paste a whole passage / table" admin builders.
 *
 * The admin pastes a passage where each blank is a run of dots; it is split
 * into one FILL_BLANK question per blank, all sharing a `formGroup` key so
 * the learner side renders them together as one flowing block or table.
 */

/** A blank in a pasted passage: a run of dots, underscores, or ellipsis chars. */
export const BLANK_RE = /\.{2,}|_{2,}|…+/g;

/** Count the blank markers in a pasted passage. */
export function countBlanks(text: string): number {
  return (text.match(BLANK_RE) || []).length;
}

/** Remove the question-number token ("1.", "(2)", "3)") nearest a blank. */
export function stripQuestionNumber(seg: string): string {
  const re = /(\(\d+\)|\d+[.)])(?=\s|$)/g;
  let last: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(seg))) last = m;
  if (!last) return seg;
  let end = last.index + last[0].length;
  if (seg[end] === " ") end++; // also drop one following space
  return seg.slice(0, last.index) + seg.slice(end);
}

/** Parse a pasted table into a grid — cells split on Tab or "|", rows on newline. */
export function parseTablePaste(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => (line.includes("\t") ? line.split("\t") : line.split("|")).map((c) => c.trim()));
}

export interface FormBlankQuestion {
  type: "FILL_BLANK";
  prompt: string;
  correctAnswer: string;
  formGroup: string;
}

/**
 * Split a pasted passage into one FILL_BLANK question per blank. Each prompt
 * is the text before its blank (question number removed) plus a `___` marker;
 * the last question also carries the trailing text. Concatenating the prompts
 * reproduces the passage, which is how the learner side rebuilds the layout.
 */
export function buildFormQuestions(
  passage: string,
  answers: string[],
  formGroup: string,
): FormBlankQuestion[] {
  const segments = passage.split(BLANK_RE);
  const blanks = segments.length - 1;
  const out: FormBlankQuestion[] = [];
  for (let i = 0; i < blanks; i++) {
    let prompt = stripQuestionNumber(segments[i]) + "___";
    if (i === blanks - 1) prompt += segments[blanks];
    out.push({ type: "FILL_BLANK", prompt, correctAnswer: (answers[i] || "").trim(), formGroup });
  }
  return out;
}
