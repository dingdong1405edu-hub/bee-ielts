/**
 * Answer-key parser for the "paper-based" assignment MVP.
 *
 * A teacher uploads a PDF (đề bài) + optional MP3 (nghe) and types the answer
 * key as free text — e.g. "1A, 2B, 3C, 4 TRUE, 5 government". This turns that
 * text into a list of questions the grader understands:
 *
 *   - Single letter A–H            → MCQ           (options A…max, correct = letter)
 *   - TRUE / FALSE / NOT GIVEN     → TRUE_FALSE_NOT_GIVEN (or YES/NO variant)
 *   - anything else (a word/phrase)→ SHORT_ANSWER  (a "/"-list = accepted variants)
 *
 * Entries may be separated by commas, semicolons or newlines, and the number
 * may be followed by "." ")" "-" ":" or nothing at all ("1A"). Grading is
 * exact-match for MCQ/TF and case-insensitive for short answers — see
 * `isAnswerCorrect` in lib/utils.
 */
import type { QuestionType } from "@prisma/client";

export interface ParsedAnswer {
  /** Question number as typed by the teacher (drives displayNumber). */
  n: number;
  /** Raw answer text as typed (before normalisation). */
  raw: string;
  type: QuestionType;
  /** Normalised correct answer stored on the Question. */
  correctAnswer: string;
  /** Choices to render (MCQ / TF); omitted for free-text short answers. */
  options?: string[];
}

export interface ParseResult {
  answers: ParsedAnswer[];
  /** Human-readable problems (unparseable lines, duplicate numbers). */
  errors: string[];
}

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

/** Build MCQ options A…letter, but always at least A–D. */
function mcqOptions(letter: string): string[] {
  const upTo = Math.max(3, LETTERS.indexOf(letter)); // index 3 = "D"
  return LETTERS.slice(0, upTo + 1);
}

/** Classify one answer token → { type, correctAnswer, options? }. */
function classify(rawAnswer: string): Omit<ParsedAnswer, "n" | "raw"> {
  const a = rawAnswer.trim();
  const upper = a.toUpperCase();

  // Single MCQ letter.
  if (/^[A-H]$/.test(upper)) {
    return { type: "MCQ", correctAnswer: upper, options: mcqOptions(upper) };
  }

  // True / False / Not Given (+ short forms) and the Yes/No variant.
  const tfMap: Record<string, string> = {
    TRUE: "TRUE", T: "TRUE",
    FALSE: "FALSE", F: "FALSE",
    "NOT GIVEN": "NOT GIVEN", NG: "NOT GIVEN", NOTGIVEN: "NOT GIVEN",
  };
  const ynMap: Record<string, string> = {
    YES: "YES", Y: "YES",
    NO: "NO", N: "NO",
    "NOT GIVEN": "NOT GIVEN", NG: "NOT GIVEN", NOTGIVEN: "NOT GIVEN",
  };
  if (upper in tfMap) {
    return {
      type: "TRUE_FALSE_NOT_GIVEN",
      correctAnswer: tfMap[upper],
      options: ["TRUE", "FALSE", "NOT GIVEN"],
    };
  }
  if (upper in ynMap) {
    return {
      type: "TRUE_FALSE_NOT_GIVEN",
      correctAnswer: ynMap[upper],
      options: ["YES", "NO", "NOT GIVEN"],
    };
  }

  // Free-text answer (fill-in / short answer). Keep the teacher's original case
  // for display; grading lowercases. "a/b" means either is accepted.
  return { type: "SHORT_ANSWER", correctAnswer: a };
}

/**
 * Parse a free-text answer key into structured answers. Never throws — bad
 * lines are reported in `errors` and skipped so the teacher can fix them.
 */
export function parseAnswerKey(input: string): ParseResult {
  const answers: ParsedAnswer[] = [];
  const errors: string[] = [];
  const seen = new Set<number>();

  // Split on commas, semicolons and newlines.
  const tokens = input
    .split(/[\n,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  for (const token of tokens) {
    // "<number><optional sep><answer>" — e.g. "1A", "1. A", "10) NOT GIVEN".
    const m = token.match(/^(\d+)\s*[.)\-:]?\s*(.+)$/);
    if (!m) {
      errors.push(`Không đọc được: "${token}"`);
      continue;
    }
    const n = parseInt(m[1], 10);
    const rawAnswer = m[2].trim();
    if (!rawAnswer) {
      errors.push(`Câu ${n}: thiếu đáp án`);
      continue;
    }
    if (seen.has(n)) errors.push(`Câu ${n}: bị lặp số — dùng bản cuối cùng`);
    seen.add(n);
    answers.push({ n, raw: rawAnswer, ...classify(rawAnswer) });
  }

  return { answers, errors };
}

/** Short label for a parsed type — used in the builder preview. */
export function typeLabel(type: QuestionType): string {
  switch (type) {
    case "MCQ":
      return "Trắc nghiệm";
    case "TRUE_FALSE_NOT_GIVEN":
    case "TRUE_FALSE":
      return "Đúng/Sai";
    case "SHORT_ANSWER":
    case "FILL_BLANK":
      return "Điền từ";
    default:
      return type;
  }
}

/**
 * Convert parsed answers → the `custom_questions` payload for
 * POST /api/assignments. `prompt` is a placeholder ("Câu N") because the real
 * question text lives in the uploaded PDF; `displayNumber` keeps the on-screen
 * number aligned with the paper even if numbering has gaps.
 */
export function toCustomQuestions(answers: ParsedAnswer[]) {
  return answers.map((a) => ({
    type: a.type,
    prompt: `Câu ${a.n}`,
    options: a.options,
    correctAnswer: a.correctAnswer,
    displayNumber: a.n,
  }));
}
