"use client";

/**
 * ManualReadingBuilder — teacher hand-authors a native Reading test (no PDF/AI).
 * It produces the SAME `{ parts: NumberedReadingPart[] }` shape the AI path fills,
 * so the existing save path (config.reading.parts + custom_questions) persists it
 * with zero API changes. Answers are entered through type-specific controls so the
 * stored value is ALWAYS the exact token the learner ReadingShell + grader expect
 * (roman for headings, letter for info/features, full text for MCQ, etc.) — no
 * post-hoc normalisation needed. Question numbers are kept continuous (1..N) across
 * parts so the learner side slices the flat list back into parts correctly.
 */
import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { ReadingExamQuestion, NumberedReadingPart } from "@/lib/groq";

type ReadingValue = { parts: NumberedReadingPart[] };

const TYPES: { value: string; label: string }[] = [
  { value: "MCQ", label: "Trắc nghiệm (chọn 1 đáp án)" },
  { value: "TRUE_FALSE_NOT_GIVEN", label: "True / False / Not Given" },
  { value: "FILL_BLANK", label: "Điền từ vào chỗ trống" },
  { value: "SHORT_ANSWER", label: "Trả lời ngắn" },
  { value: "MATCHING_HEADINGS", label: "Nối tiêu đề đoạn (Headings)" },
  { value: "MATCHING_INFO", label: "Nối thông tin với đoạn (A, B, C…)" },
  { value: "MATCHING_FEATURES", label: "Nối đặc điểm/người (A, B, C…)" },
  { value: "MATCHING", label: "Nối / ghép (chọn 1 phương án)" },
  { value: "MATCHING_SENTENCE_ENDINGS", label: "Nối vế câu (Sentence endings)" },
];
const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii", "xiii", "xiv"];
const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

/** A blank question of a given type, with sensible default options. */
function blankQuestion(type: string): ReadingExamQuestion {
  const base: ReadingExamQuestion = { number: 0, type, prompt: "", options: null, answer: "", explanation: "" };
  if (type === "MCQ" || type === "MATCHING" || type === "MATCHING_SENTENCE_ENDINGS") base.options = ["", "", "", ""];
  else if (type === "MATCHING_INFO") base.options = LETTERS.slice(0, 6);
  return base;
}

export function ManualReadingBuilder({
  value,
  onChange,
  max,
}: {
  value: ReadingValue;
  onChange: (v: ReadingValue) => void;
  max: number;
}) {
  const parts = value.parts;
  const total = parts.reduce((n, p) => n + p.questions.length, 0);
  const atLimit = total >= max;

  // A headings/features question added AFTER the shared list was typed starts with
  // options:null; re-broadcast the part's shared list onto every such question on
  // EVERY mutation, so its learner dropdown is never empty (empty = always wrong).
  const broadcastShared = (p: NumberedReadingPart): NumberedReadingPart => {
    let questions = p.questions;
    for (const type of ["MATCHING_HEADINGS", "MATCHING_FEATURES"]) {
      const canonical = questions.find((q) => q.type === type && q.options && q.options.length > 0)?.options;
      if (!canonical) continue;
      questions = questions.map((q) => (q.type === type && !(q.options && q.options.length > 0) ? { ...q, options: canonical } : q));
    }
    return questions === p.questions ? p : { ...p, questions };
  };

  /** Renumber every question 1..N across parts (+ broadcast shared lists), push up. */
  const commit = (next: NumberedReadingPart[]) => {
    let n = 0;
    onChange({
      parts: next.map((p) => {
        const w = broadcastShared(p);
        return { ...w, questions: w.questions.map((q) => ({ ...q, number: ++n })) };
      }),
    });
  };
  const patchPart = (pi: number, patch: Partial<NumberedReadingPart>) =>
    commit(parts.map((p, i) => (i === pi ? { ...p, ...patch } : p)));
  const patchQ = (pi: number, qi: number, patch: Partial<ReadingExamQuestion>) =>
    commit(parts.map((p, i) => (i === pi ? { ...p, questions: p.questions.map((q, j) => (j === qi ? { ...q, ...patch } : q)) } : p)));
  const addQ = (pi: number) => {
    if (atLimit) return;
    commit(parts.map((p, i) => (i === pi ? { ...p, questions: [...p.questions, blankQuestion("MCQ")] } : p)));
  };
  const delQ = (pi: number, qi: number) =>
    commit(parts.map((p, i) => (i === pi ? { ...p, questions: p.questions.filter((_, j) => j !== qi) } : p)));
  const addPart = () => commit([...parts, { title: "", passage: "", figures: [], questions: [] }]);
  const delPart = (pi: number) => commit(parts.filter((_, i) => i !== pi));

  // ---- Shared "list" options for a part (Headings / Features) -------------
  // Stored by writing the SAME options array onto every matching question in the
  // part, so the learner reference block renders once and answers map cleanly.
  const sharedList = (p: NumberedReadingPart, type: string, strip: RegExp): string[] => {
    const q = p.questions.find((x) => x.type === type && x.options && x.options.length > 0);
    return (q?.options ?? []).map((o) => o.replace(strip, "").trim());
  };
  const setSharedList = (pi: number, type: string, items: string[], prefix: (i: number) => string, strip: RegExp) => {
    const options = items.map((t, i) => `${prefix(i)} ${t}`.trim());
    const tokens = type === "MATCHING_HEADINGS" ? ROMAN : LETTERS;
    commit(
      parts.map((p, i) => {
        if (i !== pi) return p;
        const oldItems = sharedList(p, type, strip); // texts in the OLD order
        return {
          ...p,
          questions: p.questions.map((q) => {
            if (q.type !== type) return q;
            // Preserve the teacher's choice by ITEM TEXT (not positional token) so
            // reordering/deleting a heading doesn't silently point at another one.
            const oldPos = tokens.indexOf(q.answer);
            const oldText = oldPos >= 0 ? oldItems[oldPos] : undefined;
            const newPos = oldText !== undefined ? items.findIndex((t) => t === oldText) : -1;
            return { ...q, options, answer: newPos >= 0 ? tokens[newPos] ?? "" : "" };
          }),
        };
      }),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Tự soạn bài đọc + câu hỏi. Mỗi bài đọc là một <strong>Part</strong>. Chọn dạng câu hỏi, nhập nội dung và đáp án đúng.
        </p>
        <span className={total > max ? "text-xs font-bold text-destructive" : "text-xs font-semibold text-muted-foreground"}>
          {total}/{max} câu
        </span>
      </div>

      {parts.map((part, pi) => {
        const headings = sharedList(part, "MATCHING_HEADINGS", /^\s*[ivxlcdm]+[.)]\s*/i);
        const features = sharedList(part, "MATCHING_FEATURES", /^\s*[A-H][.)]\s*/i);
        const hasHeadings = part.questions.some((q) => q.type === "MATCHING_HEADINGS");
        const hasFeatures = part.questions.some((q) => q.type === "MATCHING_FEATURES");
        return (
          <div key={pi} className="space-y-3 rounded-xl border-2 border-leaf/30 bg-leaf/5 p-3">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-leaf px-2.5 py-0.5 text-xs font-extrabold text-white">Part {pi + 1}</span>
              <Input
                value={part.title}
                onChange={(e) => patchPart(pi, { title: e.target.value })}
                className="h-8 flex-1 text-sm font-bold"
                placeholder="Tiêu đề bài đọc"
              />
              <span className="shrink-0 text-xs text-muted-foreground">{part.questions.length} câu</span>
              {parts.length > 1 && (
                <button type="button" onClick={() => delPart(pi)} title="Xoá bài đọc này" className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Bài đọc (passage)</label>
              <Textarea
                value={part.passage}
                onChange={(e) => patchPart(pi, { passage: e.target.value })}
                rows={6}
                placeholder="Dán nội dung bài đọc vào đây…"
                className="text-sm"
              />
            </div>

            {hasHeadings && (
              <SharedListEditor
                title="Danh sách tiêu đề (List of Headings) — mỗi dòng 1 tiêu đề, tự đánh i, ii, iii…"
                items={headings}
                onChange={(items) => setSharedList(pi, "MATCHING_HEADINGS", items, (i) => `${ROMAN[i] ?? i + 1}.`, /^\s*[ivxlcdm]+[.)]\s*/i)}
              />
            )}
            {hasFeatures && (
              <SharedListEditor
                title="Danh sách lựa chọn (List of Options A, B, C…) — mỗi dòng 1 mục"
                items={features}
                onChange={(items) => setSharedList(pi, "MATCHING_FEATURES", items, (i) => `${LETTERS[i] ?? "?"}.`, /^\s*[A-H][.)]\s*/i)}
              />
            )}

            <ul className="space-y-2.5">
              {part.questions.map((q, qi) => (
                <li key={qi} className="rounded-lg border bg-card p-3">
                  <div className="flex items-start gap-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{q.number}</span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={q.type}
                          onChange={(e) => patchQ(pi, qi, blankQuestionPatch(e.target.value))}
                          className="h-8 rounded-md border bg-background px-2 text-xs font-medium"
                        >
                          {TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                        </select>
                        <button type="button" onClick={() => delQ(pi, qi)} className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Xoá câu">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <Textarea
                        value={q.prompt}
                        onChange={(e) => patchQ(pi, qi, { prompt: e.target.value })}
                        rows={2}
                        placeholder={promptPlaceholder(q.type)}
                        className="text-sm"
                      />
                      <AnswerEditor
                        q={q}
                        headings={headings}
                        features={features}
                        onPatch={(patch) => patchQ(pi, qi, patch)}
                      />
                      <Input
                        value={q.explanation}
                        onChange={(e) => patchQ(pi, qi, { explanation: e.target.value })}
                        className="h-8 text-xs"
                        placeholder="Lời giải (tuỳ chọn)"
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <Button type="button" variant="outline" size="sm" onClick={() => addQ(pi)} disabled={atLimit} className="rounded-lg">
              <Plus className="h-3.5 w-3.5" /> Thêm câu hỏi
            </Button>
          </div>
        );
      })}

      <Button type="button" variant="ghost" size="sm" onClick={addPart} className="rounded-lg">
        <Plus className="h-3.5 w-3.5" /> Thêm bài đọc (Part)
      </Button>
    </div>
  );
}

/** When the type changes, reset options/answer to that type's defaults. */
function blankQuestionPatch(type: string): Partial<ReadingExamQuestion> {
  const b = blankQuestion(type);
  return { type: b.type, options: b.options, answer: "" };
}
function promptPlaceholder(type: string): string {
  if (type === "FILL_BLANK") return "Câu hỏi — dùng ____ cho chỗ trống điền từ";
  if (type === "MATCHING_HEADINGS") return "Nhãn đoạn văn, ví dụ: Đoạn A";
  if (type === "MATCHING_INFO") return "Thông tin cần nối với đoạn văn";
  return "Nội dung câu hỏi";
}

function SharedListEditor({ title, items, onChange }: { title: string; items: string[]; onChange: (items: string[]) => void }) {
  return (
    <div className="space-y-1 rounded-lg border bg-muted/20 p-2.5">
      <label className="text-xs font-semibold text-muted-foreground">{title}</label>
      <Textarea
        value={items.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
        rows={Math.max(3, items.length + 1)}
        placeholder={"Tiêu đề 1\nTiêu đề 2\nTiêu đề 3"}
        className="text-sm"
      />
    </div>
  );
}

/** The answer control for one question — type-specific so the stored value is the
 *  exact token the learner side + grader expect. */
function AnswerEditor({
  q,
  headings,
  features,
  onPatch,
}: {
  q: ReadingExamQuestion;
  headings: string[];
  features: string[];
  onPatch: (patch: Partial<ReadingExamQuestion>) => void;
}) {
  const answerRow = (control: ReactNode) => (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-leaf">Đáp án đúng:</span>
      {control}
    </div>
  );

  if (q.type === "TRUE_FALSE_NOT_GIVEN") {
    return answerRow(
      <select value={q.answer} onChange={(e) => onPatch({ answer: e.target.value })} className="h-8 rounded-md border bg-background px-2 text-sm font-semibold">
        <option value="">—</option>
        <option value="True">TRUE</option>
        <option value="False">FALSE</option>
        <option value="Not Given">NOT GIVEN</option>
      </select>,
    );
  }

  if (q.type === "FILL_BLANK" || q.type === "SHORT_ANSWER") {
    return answerRow(
      <Input value={q.answer} onChange={(e) => onPatch({ answer: e.target.value })} className="h-8 w-56 text-sm font-semibold" placeholder="Đáp án — dùng / cho nhiều đáp án" />,
    );
  }

  if (q.type === "MATCHING_HEADINGS") {
    return answerRow(
      <select value={q.answer} onChange={(e) => onPatch({ answer: e.target.value })} className="h-8 rounded-md border bg-background px-2 text-sm font-semibold">
        <option value="">—</option>
        {headings.map((h, i) => (<option key={i} value={ROMAN[i] ?? String(i + 1)}>{ROMAN[i] ?? i + 1}. {h.slice(0, 30)}</option>))}
      </select>,
    );
  }

  if (q.type === "MATCHING_FEATURES") {
    return answerRow(
      <select value={q.answer} onChange={(e) => onPatch({ answer: e.target.value })} className="h-8 rounded-md border bg-background px-2 text-sm font-semibold">
        <option value="">—</option>
        {features.map((f, i) => (<option key={i} value={LETTERS[i] ?? "?"}>{LETTERS[i] ?? "?"}. {f.slice(0, 30)}</option>))}
      </select>,
    );
  }

  if (q.type === "MATCHING_INFO") {
    const opts = q.options && q.options.length > 0 ? q.options : LETTERS.slice(0, 6);
    return (
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Số đoạn văn:</span>
          <select
            value={opts.length}
            onChange={(e) => onPatch({ options: LETTERS.slice(0, parseInt(e.target.value, 10)), answer: LETTERS.slice(0, parseInt(e.target.value, 10)).includes(q.answer) ? q.answer : "" })}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            {[3, 4, 5, 6, 7, 8].map((n) => (<option key={n} value={n}>{n} đoạn (A–{LETTERS[n - 1]})</option>))}
          </select>
        </div>
        {answerRow(
          <select value={q.answer} onChange={(e) => onPatch({ answer: e.target.value })} className="h-8 rounded-md border bg-background px-2 text-sm font-semibold">
            <option value="">—</option>
            {opts.map((l) => (<option key={l} value={l}>{l}</option>))}
          </select>,
        )}
      </div>
    );
  }

  // MCQ / MATCHING / MATCHING_SENTENCE_ENDINGS — full-text options + pick one.
  const options = q.options ?? [];
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground">Các lựa chọn (chọn nút tròn = đáp án đúng):</label>
      {options.map((opt, oi) => (
        <div key={oi} className="flex items-center gap-2">
          <input
            type="radio"
            checked={q.answer !== "" && q.answer === opt}
            onChange={() => onPatch({ answer: opt })}
            className="h-4 w-4 shrink-0"
            title="Đánh dấu đáp án đúng"
          />
          <Input
            value={opt}
            onChange={(e) => {
              const next = options.map((o, j) => (j === oi ? e.target.value : o));
              // keep the answer pointing at the same choice if its text changes
              onPatch({ options: next, answer: q.answer === opt ? e.target.value : q.answer });
            }}
            className="h-8 flex-1 text-sm"
            placeholder={`Lựa chọn ${oi + 1}`}
          />
          {options.length > 2 && (
            <button type="button" onClick={() => onPatch({ options: options.filter((_, j) => j !== oi), answer: q.answer === opt ? "" : q.answer })} className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
      {options.length < 8 && (
        <Button type="button" variant="ghost" size="sm" onClick={() => onPatch({ options: [...options, ""] })} className="h-7 rounded-md text-xs">
          <Plus className="h-3 w-3" /> Thêm lựa chọn
        </Button>
      )}
    </div>
  );
}
