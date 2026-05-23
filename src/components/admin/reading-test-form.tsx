"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Loader2, GraduationCap, BookOpen, List, AlignLeft } from "lucide-react";
import { ImageUrlField } from "./image-url-field";
import { DeleteTestButton } from "./delete-test-button";
import { countBlanks, buildFormQuestions } from "@/lib/form-completion";

type Bank = "PRACTICE" | "MOCK";
type QType = "MCQ" | "MATCHING_HEADINGS" | "FILL_BLANK" | "TRUE_FALSE_NOT_GIVEN" | "MULTI_SELECT";

type Q = {
  type: QType;
  prompt: string;
  options: string[];
  /** For MATCHING_HEADINGS this is the index (as string) into the shared heading list. */
  correctAnswer: string;
  explanation: string;
  /** Optional admin-set displayed number ("" = use auto). */
  displayNumber: string;
};

/** Lowercase roman numerals for the List of Headings (i, ii, iii, …). */
function toRoman(n: number): string {
  const map: [number, string][] = [
    [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"],
  ];
  let out = "";
  let num = n;
  for (const [v, s] of map) while (num >= v) { out += s; num -= v; }
  return out;
}
const ROMAN = Array.from({ length: 30 }, (_, i) => toRoman(i + 1));

/** Capital letters for paragraph labels (Paragraph A, B, C, …). */
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const TYPE_LABEL: Record<QType, string> = {
  MCQ: "Trắc nghiệm 1 đáp án (Multiple choice)",
  MULTI_SELECT: "Chọn nhiều đáp án (Choose TWO letters A–E)",
  MATCHING_HEADINGS: "Nối tiêu đề (Matching Headings)",
  FILL_BLANK: "Điền vào chỗ trống (Completion)",
  TRUE_FALSE_NOT_GIVEN: "Xác nhận thông tin (True / False / Not Given)",
};

const blankQ = (type: QType): Q => ({
  type,
  prompt: "",
  options: type === "MCQ" ? ["", "", "", ""] : type === "MULTI_SELECT" ? ["", "", "", "", ""] : [],
  correctAnswer: "",
  explanation: "",
  displayNumber: "",
});

/** DB-shaped reading test passed in when editing an existing record. */
export type ReadingInitial = {
  id: string;
  title: string;
  passage: string;
  imageUrl: string | null;
  questions: {
    type: string;
    prompt: string;
    options: string[] | null;
    correctAnswer: string;
    explanation: string | null;
    formGroup: string | null;
    displayNumber: number | null;
  }[];
};

function coerceType(t: string): QType {
  if (t === "MCQ" || t === "MATCHING_HEADINGS" || t === "FILL_BLANK" || t === "TRUE_FALSE_NOT_GIVEN") return t;
  if (t.startsWith("MATCHING")) return "MATCHING_HEADINGS";
  if (t.startsWith("TRUE_FALSE")) return "TRUE_FALSE_NOT_GIVEN";
  return "FILL_BLANK";
}

type ReadingFormState = {
  questions: Q[];
  headings: string[];
  formPassage: string;
  formAnswers: string[];
};

/**
 * Convert DB questions into the form's editable shape. Matching Headings
 * questions share one List of Headings (lifted into `headings`); pasted
 * form-completion questions (those with a formGroup) are stitched back into
 * a single passage + answer list; the rest stay as loose questions.
 */
function toFormState(initial?: ReadingInitial): ReadingFormState {
  if (!initial || initial.questions.length === 0) {
    return { questions: [blankQ("MCQ")], headings: ["", "", "", ""], formPassage: "", formAnswers: [] };
  }
  // Form-completion paste questions use an "fg"/"tbl" formGroup; multi-select
  // questions use an "ms" formGroup but stay inline as ordinary loose questions.
  const formQs = initial.questions.filter((q) => q.formGroup && !q.formGroup.startsWith("ms"));
  const regular = initial.questions.filter((q) => !q.formGroup || q.formGroup.startsWith("ms"));
  let headings: string[] = [];
  const questions: Q[] = regular.map((q) => {
    const explanation = q.explanation ?? "";
    const displayNumber = q.displayNumber != null ? String(q.displayNumber) : "";
    if (q.formGroup?.startsWith("ms")) {
      // Multi-select: stored correctAnswer is the correct option texts; the
      // editor works with their indices into the options list.
      const opts = q.options ?? [];
      const correctTexts = q.correctAnswer.split("\n").map((s) => s.trim()).filter(Boolean);
      const idxs = correctTexts.map((t) => opts.indexOf(t)).filter((n) => n >= 0);
      return { type: "MULTI_SELECT", prompt: q.prompt, options: opts, correctAnswer: idxs.join("\n"), explanation, displayNumber };
    }
    const type = coerceType(q.type);
    if (type === "MATCHING_HEADINGS") {
      const hs = (q.options ?? []).map((o) => o.replace(/^[ivxlcdm]+\.\s*/i, "").trim());
      // Keep the most complete list seen so every stored answer index resolves.
      if (hs.length > headings.length) headings = hs;
      const idx = ROMAN.indexOf(q.correctAnswer);
      return { type, prompt: q.prompt, options: [], correctAnswer: idx >= 0 ? String(idx) : "", explanation, displayNumber };
    }
    if (type === "MCQ") {
      return { type, prompt: q.prompt, options: q.options && q.options.length ? q.options : ["", ""], correctAnswer: q.correctAnswer, explanation, displayNumber };
    }
    return { type, prompt: q.prompt, options: [], correctAnswer: q.correctAnswer, explanation, displayNumber };
  });
  // A form-only test has no loose questions; a brand-new editor gets one blank.
  const finalQuestions = questions.length > 0 ? questions : formQs.length > 0 ? [] : [blankQ("MCQ")];
  return {
    questions: finalQuestions,
    headings: headings.length >= 2 ? headings : ["", "", "", ""],
    formPassage: formQs.length ? formQs.map((q) => q.prompt).join("").replace(/_{2,}/g, "..........") : "",
    formAnswers: formQs.map((q) => q.correctAnswer),
  };
}

/** Paragraph letter for the Matching Headings question at index `qi`. */
function mhLetterAt(questions: Q[], qi: number): string {
  let c = 0;
  for (let i = 0; i < qi; i++) if (questions[i].type === "MATCHING_HEADINGS") c++;
  return LETTERS[c] ?? "?";
}

/** Reading-test create/edit form. Pass `initial` to edit an existing record. */
export function ReadingTestForm({ bank, initial }: { bank: Bank; initial?: ReadingInitial }) {
  const router = useRouter();
  const isEdit = !!initial;
  const isMock = bank === "MOCK";
  const listHref = isMock ? "/admin/reading/mock" : "/admin/reading";
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [passage, setPassage] = useState(initial?.passage ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [init] = useState(() => toFormState(initial));
  const [questions, setQuestions] = useState<Q[]>(init.questions);
  const [headings, setHeadings] = useState<string[]>(init.headings);
  const [formPassage, setFormPassage] = useState(init.formPassage);
  const [formAnswers, setFormAnswers] = useState<string[]>(init.formAnswers);

  const hasMatching = questions.some((q) => q.type === "MATCHING_HEADINGS");
  const blankCount = countBlanks(formPassage);

  const patchQ = (qi: number, patch: Partial<Q>) =>
    setQuestions((qs) => qs.map((q, i) => (i === qi ? { ...q, ...patch } : q)));

  const setFormAnswerAt = (i: number, v: string) =>
    setFormAnswers((prev) => {
      const next = [...prev];
      while (next.length <= i) next.push("");
      next[i] = v;
      return next;
    });

  const setHeadingAt = (hi: number, v: string) =>
    setHeadings((hs) => hs.map((x, j) => (j === hi ? v : x)));

  /** Remove a shared heading and keep every paragraph's chosen index valid. */
  const removeHeading = (hi: number) => {
    setHeadings((hs) => hs.filter((_, i) => i !== hi));
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.type !== "MATCHING_HEADINGS" || q.correctAnswer === "") return q;
        const idx = parseInt(q.correctAnswer, 10);
        if (idx === hi) return { ...q, correctAnswer: "" };
        if (idx > hi) return { ...q, correctAnswer: String(idx - 1) };
        return q;
      }),
    );
  };

  const changeType = (qi: number, type: QType) => {
    const q = questions[qi];
    const patch: Partial<Q> = { type, correctAnswer: "" };
    patch.options =
      type === "MCQ"
        ? (q.options.length ? q.options : blankQ("MCQ").options)
        : type === "MULTI_SELECT"
          ? (q.options.length ? q.options : blankQ("MULTI_SELECT").options)
          : [];
    if (type === "MATCHING_HEADINGS" && !q.prompt.trim()) {
      patch.prompt = `Paragraph ${mhLetterAt(questions, qi)}`;
    }
    patchQ(qi, patch);
  };

  const submit = async () => {
    if (!title.trim()) return toast.error("Nhập tiêu đề");
    if (passage.trim().length < 50) return toast.error("Đoạn văn quá ngắn (tối thiểu 50 ký tự)");

    // Build the shared List of Headings once — used by every Matching Headings question.
    const headingRemap = new Map<number, number>();
    const finalHeadings: string[] = [];
    if (hasMatching) {
      headings.forEach((h, i) => {
        const t = h.trim();
        if (t) {
          headingRemap.set(i, finalHeadings.length);
          finalHeadings.push(t);
        }
      });
      if (finalHeadings.length < 2) return toast.error("Danh sách Heading cần ít nhất 2 mục");
    }
    const numberedHeadings = finalHeadings.map((h, i) => `${ROMAN[i]}. ${h}`);

    const payload: { type: QType; prompt: string; options?: string[]; correctAnswer: string; explanation?: string; formGroup?: string; displayNumber?: number | null }[] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.prompt.trim()) return toast.error(`Câu ${i + 1}: thiếu nội dung câu hỏi`);

      // Admin override for the displayed question number (e.g. "16" so Part 2
      // continues IELTS numbering). Blank = use auto-number on the runner.
      const dnRaw = q.displayNumber.trim();
      let displayNumber: number | null = null;
      if (dnRaw) {
        const n = parseInt(dnRaw, 10);
        if (!Number.isFinite(n) || n < 1 || n > 999)
          return toast.error(`Câu ${i + 1}: số hiển thị phải là số nguyên 1–999`);
        displayNumber = n;
      }

      if (q.type === "MCQ") {
        const opts = q.options.map((o) => o.trim()).filter(Boolean);
        if (opts.length < 2) return toast.error(`Câu ${i + 1}: cần ít nhất 2 lựa chọn`);
        if (!q.correctAnswer || !opts.includes(q.correctAnswer))
          return toast.error(`Câu ${i + 1}: chọn đáp án đúng`);
        payload.push({ type: "MCQ", prompt: q.prompt.trim(), options: opts, correctAnswer: q.correctAnswer, explanation: q.explanation.trim() || undefined, displayNumber });
      } else if (q.type === "MATCHING_HEADINGS") {
        const origIdx = parseInt(q.correctAnswer, 10);
        const newIdx = Number.isNaN(origIdx) ? undefined : headingRemap.get(origIdx);
        if (newIdx === undefined) return toast.error(`Câu ${i + 1}: chọn heading đúng cho đoạn này`);
        payload.push({ type: "MATCHING_HEADINGS", prompt: q.prompt.trim(), options: numberedHeadings, correctAnswer: ROMAN[newIdx], explanation: q.explanation.trim() || undefined, displayNumber });
      } else if (q.type === "TRUE_FALSE_NOT_GIVEN") {
        if (!["True", "False", "Not Given"].includes(q.correctAnswer))
          return toast.error(`Câu ${i + 1}: chọn đáp án đúng`);
        payload.push({ type: "TRUE_FALSE_NOT_GIVEN", prompt: q.prompt.trim(), options: ["True", "False", "Not Given"], correctAnswer: q.correctAnswer, explanation: q.explanation.trim() || undefined, displayNumber });
      } else if (q.type === "MULTI_SELECT") {
        // Choose TWO/THREE letters — stored as one question; the picked option
        // texts are joined by newline so a plain exact-match grades it.
        const finalOpts = q.options.map((o) => o.trim()).filter(Boolean);
        if (finalOpts.length < 3) return toast.error(`Câu ${i + 1}: cần ít nhất 3 lựa chọn`);
        const idxs = [
          ...new Set(q.correctAnswer.split("\n").map((s) => parseInt(s, 10)).filter((n) => !Number.isNaN(n))),
        ];
        const corrects = idxs
          .map((idx) => (q.options[idx] ?? "").trim())
          .filter((t) => t.length > 0 && finalOpts.includes(t));
        if (corrects.length < 2) return toast.error(`Câu ${i + 1}: đánh dấu ít nhất 2 đáp án đúng`);
        const sorted = [...new Set(corrects)].sort((a, b) => finalOpts.indexOf(a) - finalOpts.indexOf(b));
        payload.push({
          type: "MCQ",
          prompt: q.prompt.trim(),
          options: finalOpts,
          correctAnswer: sorted.join("\n"),
          explanation: q.explanation.trim() || undefined,
          formGroup: "ms-" + Date.now().toString(36) + i,
          displayNumber,
        });
      } else {
        if (!q.correctAnswer.trim()) return toast.error(`Câu ${i + 1}: nhập đáp án đúng`);
        payload.push({ type: "FILL_BLANK", prompt: q.prompt.trim(), correctAnswer: q.correctAnswer.trim(), explanation: q.explanation.trim() || undefined, displayNumber });
      }
    }

    // Pasted form-completion → one FILL_BLANK question per blank (shared formGroup).
    let formPayload: typeof payload = [];
    if (formPassage.trim()) {
      if (blankCount < 1)
        return toast.error("Đoạn điền chỗ trống chưa có chỗ trống — dùng chuỗi dấu chấm cho mỗi chỗ");
      for (let i = 0; i < blankCount; i++) {
        if (!(formAnswers[i] || "").trim())
          return toast.error(`Điền chỗ trống: thiếu đáp án cho chỗ trống ${i + 1}`);
      }
      formPayload = buildFormQuestions(formPassage, formAnswers, "fg" + Date.now().toString(36));
    }

    if (formPayload.length + payload.length === 0)
      return toast.error("Cần ít nhất 1 câu hỏi — thêm câu hỏi hoặc dán đoạn điền chỗ trống");

    setLoading(true);
    try {
      const res = await fetch(isEdit ? `/api/admin/reading/${initial!.id}` : "/api/admin/reading", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          passage: passage.trim(),
          imageUrl: imageUrl.trim() || null,
          bank,
          questions: [...formPayload, ...payload],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi");
      toast.success(isEdit ? "Đã lưu thay đổi" : isMock ? "Đã thêm vào kho đề thi thử" : "Đã thêm vào kho luyện tập");
      router.push(listHref);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">
          {isEdit ? "Sửa bài Reading" : "Thêm bài Reading"} {isMock ? "— Thi thử" : "— Luyện tập"}
        </h1>
        <Badge variant="outline" className="text-sm">
          {isMock ? <GraduationCap className="h-3.5 w-3.5" /> : <BookOpen className="h-3.5 w-3.5" />}
          Kho: {isMock ? "Đề thi thử" : "Luyện tập"}
        </Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>Thông tin</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Tiêu đề</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: The History of Tea" />
          </div>
          <div>
            <Label>Đoạn văn (passage)</Label>
            <Textarea value={passage} onChange={(e) => setPassage(e.target.value)} className="min-h-[220px]" placeholder="Dán nội dung bài đọc..." />
          </div>
          <ImageUrlField
            value={imageUrl}
            onChange={setImageUrl}
            aiContext={title}
            label="Ảnh bìa (tuỳ chọn)"
            hint="Ảnh bìa hiển thị ở thẻ chọn đề và phía trên đoạn văn. Dán URL, tải ảnh lên, hoặc để AI tạo."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlignLeft className="h-5 w-5 text-primary" /> Điền chỗ trống — dán cả đoạn
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Dán nguyên một đoạn điền chỗ trống (sentence / summary completion). Mỗi chỗ trống là
            một chuỗi dấu chấm. Người học sẽ thấy đoạn liền mạch với ô điền ngay trong dòng.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Đoạn văn điền chỗ trống</Label>
            <Textarea
              value={formPassage}
              onChange={(e) => setFormPassage(e.target.value)}
              className="min-h-[180px] font-mono text-[13px]"
              placeholder={
                "VD:\nModern cities increasingly rely on 1. .......... to manage traffic, while 2. .......... sensors track air quality across the urban area."
              }
            />
            <p className="text-xs text-muted-foreground mt-1">
              Mỗi chỗ trống đánh dấu bằng một chuỗi dấu chấm liền nhau (vd{" "}
              <span className="font-mono">..........</span>) hoặc gạch dưới. Số “1.”, “2.”… trước
              chỗ trống sẽ tự được thay bằng ô điền. Để trống nếu bài không có dạng này.
            </p>
          </div>
          {formPassage.trim() && (
            <div>
              <Label>Đáp án — {blankCount} chỗ trống</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Nhiều đáp án đúng cho một chỗ? Ngăn cách bằng dấu “/” — VD “8 / eight”.
              </p>
              {blankCount === 0 ? (
                <p className="text-xs text-destructive mt-1">
                  Chưa phát hiện chỗ trống nào — mỗi chỗ trống cần một chuỗi dấu chấm.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 mt-1">
                  {Array.from({ length: blankCount }).map((_, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                        {i + 1}
                      </span>
                      <Input
                        value={formAnswers[i] ?? ""}
                        onChange={(e) => setFormAnswerAt(i, e.target.value)}
                        placeholder={`Đáp án ${i + 1}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {hasMatching && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5 text-primary" /> Danh sách Heading (dùng chung)
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setHeadings([...headings, ""])}>
                <Plus className="h-4 w-4" /> Thêm heading
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Danh sách heading đánh số La Mã (i, ii, iii…). Mỗi câu Matching Headings bên dưới
              sẽ chọn 1 heading từ danh sách này.
            </p>
            {headings.map((h, hi) => (
              <div key={hi} className="flex items-center gap-2">
                <span className="text-sm font-bold w-8 shrink-0 text-muted-foreground">{ROMAN[hi]}.</span>
                <Input
                  value={h}
                  placeholder={`Nội dung heading ${hi + 1}`}
                  onChange={(e) => setHeadingAt(hi, e.target.value)}
                />
                {headings.length > 2 && (
                  <Button variant="ghost" size="sm" onClick={() => removeHeading(hi)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Câu hỏi</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setQuestions([...questions, blankQ("MCQ")])}>
              <Plus className="h-4 w-4" /> Thêm câu
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Chưa có câu hỏi lẻ. Bài này có thể chỉ dùng phần “Điền chỗ trống — dán cả đoạn” ở trên.
            </p>
          )}
          {questions.map((q, qi) => {
            const mhLetter = q.type === "MATCHING_HEADINGS" ? mhLetterAt(questions, qi) : null;
            return (
              <div key={qi} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    Câu {qi + 1}
                    {mhLetter && <span className="text-primary"> · Đoạn {mhLetter}</span>}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setQuestions(questions.filter((_, i) => i !== qi))}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Label>Dạng câu hỏi</Label>
                    <select
                      value={q.type}
                      onChange={(e) => changeType(qi, e.target.value as QType)}
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      {(Object.keys(TYPE_LABEL) as QType[]).map((t) => (
                        <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Số hiển thị</Label>
                    <Input
                      inputMode="numeric"
                      placeholder={`Tự ${qi + 1}`}
                      value={q.displayNumber}
                      onChange={(e) =>
                        patchQ(qi, { displayNumber: e.target.value.replace(/[^0-9]/g, "").slice(0, 3) })
                      }
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Số học viên thấy. VD “16” cho Part 2. Để trống = tự đánh.
                    </p>
                  </div>
                </div>

                <div>
                  <Label>{q.type === "MATCHING_HEADINGS" ? "Tên đoạn văn (hiển thị cạnh ô chọn)" : "Nội dung câu hỏi"}</Label>
                  <Textarea
                    value={q.prompt}
                    onChange={(e) => patchQ(qi, { prompt: e.target.value })}
                    placeholder={
                      q.type === "FILL_BLANK"
                        ? "Dùng ___ cho chỗ trống. VD: Tea was first drunk in ___."
                        : q.type === "TRUE_FALSE_NOT_GIVEN"
                          ? "Một nhận định để người học xác nhận."
                          : q.type === "MATCHING_HEADINGS"
                            ? "VD: Paragraph A"
                            : q.type === "MULTI_SELECT"
                              ? "VD: Which TWO of the following statements are true?"
                              : "Nội dung câu hỏi..."
                    }
                  />
                </div>

                {q.type === "MCQ" && <McqOptions q={q} qi={qi} patchQ={patchQ} />}
                {q.type === "MULTI_SELECT" && <MultiCorrectOptions q={q} qi={qi} patchQ={patchQ} />}
                {q.type === "MATCHING_HEADINGS" && (
                  <HeadingPicker headings={headings} value={q.correctAnswer} onChange={(v) => patchQ(qi, { correctAnswer: v })} />
                )}

                {q.type === "TRUE_FALSE_NOT_GIVEN" && (
                  <div>
                    <Label>Đáp án đúng</Label>
                    <select
                      value={q.correctAnswer}
                      onChange={(e) => patchQ(qi, { correctAnswer: e.target.value })}
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="">— Chọn —</option>
                      <option value="True">True</option>
                      <option value="False">False</option>
                      <option value="Not Given">Not Given</option>
                    </select>
                  </div>
                )}

                {q.type === "FILL_BLANK" && (
                  <div>
                    <Label>Đáp án đúng</Label>
                    <Input
                      value={q.correctAnswer}
                      onChange={(e) => patchQ(qi, { correctAnswer: e.target.value })}
                      placeholder="VD: 8 / eight"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Có nhiều đáp án đúng? Ngăn cách bằng dấu “/” — VD “8 / eight”, học viên gõ
                      cái nào cũng được điểm.
                    </p>
                  </div>
                )}

                <div>
                  <Label>Giải thích (tuỳ chọn)</Label>
                  <Textarea value={q.explanation} onChange={(e) => patchQ(qi, { explanation: e.target.value })} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => router.push(listHref)}>Huỷ</Button>
        <Button onClick={submit} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Lưu thay đổi" : "Lưu"}
        </Button>
        {isEdit && (
          <div className="ml-auto">
            <DeleteTestButton
              endpoint={`/api/admin/reading/${initial!.id}`}
              name={initial!.title}
              kind="bài Reading"
              redirectTo={listHref}
              size="default"
              label="Xoá bài này"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function McqOptions({ q, qi, patchQ }: { q: Q; qi: number; patchQ: (qi: number, patch: Partial<Q>) => void }) {
  return (
    <div className="space-y-2">
      <Label>Các lựa chọn</Label>
      {q.options.map((opt, oi) => (
        <div key={oi} className="flex items-center gap-2">
          <input
            type="radio"
            name={`correct-${qi}`}
            checked={!!opt.trim() && q.correctAnswer === opt}
            onChange={() => patchQ(qi, { correctAnswer: opt })}
            className="h-4 w-4 shrink-0"
            title="Đánh dấu đáp án đúng"
          />
          <Input
            placeholder={`Lựa chọn ${oi + 1}`}
            value={opt}
            onChange={(e) => {
              const options = [...q.options];
              const old = options[oi];
              options[oi] = e.target.value;
              patchQ(qi, { options, correctAnswer: q.correctAnswer === old ? e.target.value : q.correctAnswer });
            }}
          />
          {q.options.length > 2 && (
            <Button variant="ghost" size="sm" onClick={() => patchQ(qi, { options: q.options.filter((_, i) => i !== oi) })}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => patchQ(qi, { options: [...q.options, ""] })}>
        <Plus className="h-4 w-4" /> Thêm lựa chọn
      </Button>
      <p className="text-xs text-muted-foreground">Chọn ô tròn bên trái để đánh dấu đáp án đúng.</p>
    </div>
  );
}

/**
 * Option editor for a "Choose TWO letters" question: every option has a
 * checkbox to mark it correct. The correct answers are stored on the form's
 * `correctAnswer` as newline-joined option indices.
 */
function MultiCorrectOptions({
  q,
  qi,
  patchQ,
}: {
  q: Q;
  qi: number;
  patchQ: (qi: number, patch: Partial<Q>) => void;
}) {
  const correctIdx = new Set(
    q.correctAnswer.split("\n").map((s) => parseInt(s, 10)).filter((n) => !Number.isNaN(n)),
  );
  const saveCorrect = (s: Set<number>) =>
    patchQ(qi, { correctAnswer: [...s].sort((a, b) => a - b).join("\n") });

  const toggle = (oi: number) => {
    const s = new Set(correctIdx);
    if (s.has(oi)) s.delete(oi);
    else s.add(oi);
    saveCorrect(s);
  };

  const removeOption = (oi: number) => {
    const options = q.options.filter((_, i) => i !== oi);
    const next = new Set([...correctIdx].filter((i) => i !== oi).map((i) => (i > oi ? i - 1 : i)));
    patchQ(qi, { options, correctAnswer: [...next].sort((a, b) => a - b).join("\n") });
  };

  return (
    <div className="space-y-2">
      <Label>Các lựa chọn — tích ô vuông để đánh dấu các đáp án ĐÚNG</Label>
      {q.options.map((opt, oi) => (
        <div key={oi} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={correctIdx.has(oi)}
            onChange={() => toggle(oi)}
            className="h-4 w-4 shrink-0"
            title="Đánh dấu đáp án đúng"
          />
          <span className="w-5 shrink-0 text-sm font-bold text-muted-foreground">
            {String.fromCharCode(65 + oi)}.
          </span>
          <Input
            placeholder={`Lựa chọn ${String.fromCharCode(65 + oi)}`}
            value={opt}
            onChange={(e) => {
              const options = [...q.options];
              options[oi] = e.target.value;
              patchQ(qi, { options });
            }}
          />
          {q.options.length > 3 && (
            <Button variant="ghost" size="sm" onClick={() => removeOption(oi)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => patchQ(qi, { options: [...q.options, ""] })}>
        <Plus className="h-4 w-4" /> Thêm lựa chọn
      </Button>
      <p className="text-xs text-muted-foreground">
        Đã đánh dấu <strong>{correctIdx.size}</strong> đáp án đúng — học viên phải chọn đúng{" "}
        {correctIdx.size || "?"} đáp án. IELTS thường là “Choose TWO” với 5 lựa chọn A–E.
      </p>
    </div>
  );
}

/** Dropdown for a Matching Headings paragraph — picks one heading from the shared list. */
function HeadingPicker({
  headings,
  value,
  onChange,
}: {
  headings: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const filled = headings.some((h) => h.trim());
  return (
    <div>
      <Label>Heading đúng cho đoạn này</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
      >
        <option value="">— Chọn heading —</option>
        {headings.map((h, hi) =>
          h.trim() ? (
            <option key={hi} value={String(hi)}>
              {ROMAN[hi]}. {h}
            </option>
          ) : null,
        )}
      </select>
      {!filled && (
        <p className="text-xs text-destructive mt-1">
          Hãy nhập “Danh sách Heading” ở khung phía trên trước.
        </p>
      )}
    </div>
  );
}
