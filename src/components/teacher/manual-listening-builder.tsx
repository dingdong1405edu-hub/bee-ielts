"use client";

/**
 * ManualListeningBuilder — teacher hand-authors a native LISTENING test (like the
 * admin listening-practice editor), no PDF/AI. It produces:
 *   - `questions`: loose per-question items (MCQ / T-F-NG / fill / short / matching)
 *     whose stored answer is ALWAYS the exact token the learner ListeningShell +
 *     grader expect (full text for MCQ, roman for headings, letter for matching…).
 *   - `formPassage` + `formAnswers`: an optional "paste a note/form with blanks"
 *     block — each run of dots becomes one FILL_BLANK, rendered as one flowing
 *     block by the learner side (the admin listening hallmark).
 * The parent (CustomAssignmentBuilder) turns this into config.listening +
 * custom_questions at save time. Answer controls are reused from the proven
 * ManualReadingBuilder so grading integrity is identical.
 */
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { ReadingExamQuestion } from "@/lib/groq";
import { countBlanks } from "@/lib/form-completion";
import {
  AnswerEditor,
  SharedListEditor,
  blankQuestion,
  blankQuestionPatch,
  promptPlaceholder,
  ROMAN,
  LETTERS,
} from "@/components/teacher/manual-reading-builder";

export interface ManualListeningValue {
  questions: ReadingExamQuestion[];
  /** Optional note/form-completion paste — dots mark blanks. */
  formPassage: string;
  formAnswers: string[];
}

/** Listening-appropriate question types (a subset of the reading set). */
const LISTENING_TYPES: { value: string; label: string }[] = [
  { value: "MCQ", label: "Trắc nghiệm (chọn 1 đáp án)" },
  { value: "FILL_BLANK", label: "Điền từ vào chỗ trống" },
  { value: "SHORT_ANSWER", label: "Trả lời ngắn" },
  { value: "TRUE_FALSE_NOT_GIVEN", label: "True / False / Not Given" },
  { value: "MATCHING_HEADINGS", label: "Nối tiêu đề / speaker (i, ii, iii…)" },
  { value: "MATCHING_FEATURES", label: "Nối nhãn / đặc điểm (A, B, C…)" },
  { value: "MATCHING", label: "Nối / ghép (chọn 1 phương án)" },
];

/** Re-broadcast a shared heading/feature list onto every same-type question that
 *  still has null options (added after the list was typed) — an empty learner
 *  dropdown always grades wrong, so this keeps them all populated. */
function broadcastShared(questions: ReadingExamQuestion[]): ReadingExamQuestion[] {
  let out = questions;
  for (const type of ["MATCHING_HEADINGS", "MATCHING_FEATURES"]) {
    const canonical = out.find((q) => q.type === type && q.options && q.options.length > 0)?.options;
    if (!canonical) continue;
    out = out.map((q) => (q.type === type && !(q.options && q.options.length > 0) ? { ...q, options: canonical } : q));
  }
  return out;
}

export function ManualListeningBuilder({
  value,
  onChange,
  max,
}: {
  value: ManualListeningValue;
  onChange: (v: ManualListeningValue) => void;
  max: number;
}) {
  const questions = value.questions;
  const formBlanks = value.formPassage.trim() ? countBlanks(value.formPassage) : 0;
  const total = questions.length + formBlanks;
  const atLimit = total >= max;

  /** Broadcast shared lists + renumber 1..N, push up. */
  const commit = (next: ReadingExamQuestion[]) => {
    let n = 0;
    onChange({ ...value, questions: broadcastShared(next).map((q) => ({ ...q, number: ++n })) });
  };
  const patchQ = (qi: number, patch: Partial<ReadingExamQuestion>) =>
    commit(questions.map((q, j) => (j === qi ? { ...q, ...patch } : q)));
  const addQ = () => {
    if (atLimit) return;
    commit([...questions, blankQuestion("MCQ")]);
  };
  const delQ = (qi: number) => commit(questions.filter((_, j) => j !== qi));

  // Shared "list" options (Headings / Features) written onto every matching
  // question so the learner reference block renders once and answers map cleanly.
  const sharedList = (type: string, strip: RegExp): string[] => {
    const q = questions.find((x) => x.type === type && x.options && x.options.length > 0);
    return (q?.options ?? []).map((o) => o.replace(strip, "").trim());
  };
  const setSharedList = (type: string, items: string[], prefix: (i: number) => string, strip: RegExp) => {
    const options = items.map((t, i) => `${prefix(i)} ${t}`.trim());
    const tokens = type === "MATCHING_HEADINGS" ? ROMAN : LETTERS;
    const oldItems = sharedList(type, strip); // texts in the OLD order
    commit(
      questions.map((q) => {
        if (q.type !== type) return q;
        // Preserve the teacher's choice by ITEM TEXT (not positional token) so
        // reordering/deleting a heading doesn't silently point at another one.
        const oldPos = tokens.indexOf(q.answer);
        const oldText = oldPos >= 0 ? oldItems[oldPos] : undefined;
        const newPos = oldText !== undefined ? items.findIndex((t) => t === oldText) : -1;
        return { ...q, options, answer: newPos >= 0 ? tokens[newPos] ?? "" : "" };
      }),
    );
  };

  // Form-completion paste helpers.
  const setFormPassage = (formPassage: string) => onChange({ ...value, formPassage });
  const setFormAnswerAt = (i: number, v: string) => {
    const formAnswers = [...value.formAnswers];
    while (formAnswers.length <= i) formAnswers.push("");
    formAnswers[i] = v;
    onChange({ ...value, formAnswers });
  };

  const headings = sharedList("MATCHING_HEADINGS", /^\s*[ivxlcdm]+[.)]\s*/i);
  const features = sharedList("MATCHING_FEATURES", /^\s*[A-H][.)]\s*/i);
  const hasHeadings = questions.some((q) => q.type === "MATCHING_HEADINGS");
  const hasFeatures = questions.some((q) => q.type === "MATCHING_FEATURES");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Học viên nghe audio (tải lên ở trên) rồi làm câu hỏi bên dưới — <strong>giống hệt phần luyện tập Listening</strong>.
        </p>
        <span className={total > max ? "text-xs font-bold text-destructive" : "text-xs font-semibold text-muted-foreground"}>
          {total}/{max} câu
        </span>
      </div>

      {/* Form / note completion — paste a block, each run of dots is a blank */}
      <div className="space-y-2 rounded-xl border-2 border-sky-500/30 bg-sky-500/5 p-3">
        <label className="text-sm font-bold text-sky-700 dark:text-sky-300">Điền chỗ trống — dán cả đoạn / form (tuỳ chọn)</label>
        <Textarea
          value={value.formPassage}
          onChange={(e) => setFormPassage(e.target.value)}
          rows={5}
          placeholder={"Accommodation Form\nName: Mark 1. ..........\nLength of stay: 2. .......... nights"}
          className="font-mono text-[13px]"
        />
        <p className="text-[11px] text-muted-foreground">
          Mỗi chỗ trống đánh dấu bằng một chuỗi dấu chấm (VD <span className="font-mono">..........</span>). Số “1.”, “2.”… sẽ tự thành ô điền. Để trống nếu không dùng.
        </p>
        {formBlanks > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: formBlanks }).map((_, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sky-600 text-xs font-bold text-white">{i + 1}</span>
                <Input
                  value={value.formAnswers[i] ?? ""}
                  onChange={(e) => setFormAnswerAt(i, e.target.value)}
                  placeholder={`Đáp án ${i + 1}`}
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {hasHeadings && (
        <SharedListEditor
          title="Danh sách tiêu đề / speaker (i, ii, iii…) — mỗi dòng 1 mục"
          items={headings}
          onChange={(items) => setSharedList("MATCHING_HEADINGS", items, (i) => `${ROMAN[i] ?? i + 1}.`, /^\s*[ivxlcdm]+[.)]\s*/i)}
        />
      )}
      {hasFeatures && (
        <SharedListEditor
          title="Danh sách nhãn (A, B, C…) — mỗi dòng 1 mục"
          items={features}
          onChange={(items) => setSharedList("MATCHING_FEATURES", items, (i) => `${LETTERS[i] ?? "?"}.`, /^\s*[A-H][.)]\s*/i)}
        />
      )}

      <ul className="space-y-2.5">
        {questions.map((q, qi) => (
          <li key={qi} className="rounded-lg border bg-card p-3">
            <div className="flex items-start gap-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {formBlanks + qi + 1}
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={q.type}
                    onChange={(e) => patchQ(qi, blankQuestionPatch(e.target.value))}
                    className="h-8 rounded-md border bg-background px-2 text-xs font-medium"
                  >
                    {LISTENING_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                  </select>
                  <button type="button" onClick={() => delQ(qi)} className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Xoá câu">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Textarea
                  value={q.prompt}
                  onChange={(e) => patchQ(qi, { prompt: e.target.value })}
                  rows={2}
                  placeholder={promptPlaceholder(q.type)}
                  className="text-sm"
                />
                <AnswerEditor q={q} headings={headings} features={features} onPatch={(patch) => patchQ(qi, patch)} />
                <Input
                  value={q.explanation}
                  onChange={(e) => patchQ(qi, { explanation: e.target.value })}
                  className="h-8 text-xs"
                  placeholder="Lời giải (tuỳ chọn)"
                />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Button type="button" variant="outline" size="sm" onClick={addQ} disabled={atLimit} className="rounded-lg">
        <Plus className="h-3.5 w-3.5" /> Thêm câu hỏi
      </Button>
    </div>
  );
}
