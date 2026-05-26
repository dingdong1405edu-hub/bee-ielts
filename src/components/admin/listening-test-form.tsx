"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Loader2, GraduationCap, Headphones, AlignLeft, Table, List, Sparkles, Upload } from "lucide-react";
import { ImageUrlField } from "./image-url-field";
import { AudioUrlField } from "./audio-url-field";
import { DeleteTestButton } from "./delete-test-button";
import { BandStageSelect } from "./band-stage-select";
import { countBlanks, parseTablePaste, buildFormQuestions } from "@/lib/form-completion";

type Bank = "PRACTICE" | "MOCK";
type QType = "MCQ" | "FILL_BLANK" | "TRUE_FALSE_NOT_GIVEN" | "SHORT_ANSWER" | "MATCHING_HEADINGS" | "MATCHING";

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

/** Capital letters used to label each MATCHING_HEADINGS speaker/segment (A, B, C…). */
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

type Payload = {
  type: QType;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  formGroup?: string;
  displayNumber?: number | null;
};

const TYPE_LABEL: Record<QType, string> = {
  MCQ: "Trắc nghiệm (Multiple choice)",
  FILL_BLANK: "Điền vào chỗ trống (Completion)",
  TRUE_FALSE_NOT_GIVEN: "Xác nhận thông tin (True / False / Not Given)",
  SHORT_ANSWER: "Câu trả lời ngắn (Short answer)",
  MATCHING_HEADINGS: "Nối tiêu đề (Matching Headings)",
  MATCHING: "Nối câu (Matching) — chọn A/B/C/…",
};

const blankQ = (type: QType): Q => ({
  type,
  prompt: "",
  options: type === "MCQ" ? ["", "", "", ""] : [],
  correctAnswer: "",
  explanation: "",
  displayNumber: "",
});

/** DB-shaped listening test passed in when editing an existing record. */
export type ListeningInitial = {
  id: string;
  title: string;
  audioUrl: string;
  imageUrl: string | null;
  contentImageUrl: string | null;
  transcript: string | null;
  /** IELTS section 1-4 — only used for MOCK tests. */
  section: number | null;
  bandStageId: string | null;
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
  if (
    t === "MCQ" ||
    t === "FILL_BLANK" ||
    t === "TRUE_FALSE_NOT_GIVEN" ||
    t === "SHORT_ANSWER" ||
    t === "MATCHING_HEADINGS" ||
    t === "MATCHING"
  )
    return t;
  if (t.startsWith("TRUE_FALSE")) return "TRUE_FALSE_NOT_GIVEN";
  if (t.startsWith("MATCHING")) return "MATCHING_HEADINGS";
  return "FILL_BLANK";
}

/**
 * Split a loaded test into editable state: loose questions go to the question
 * editor; form-completion questions (those with a formGroup) are stitched back
 * into a single pasted passage + answer list.
 */
type FormState = {
  questions: Q[];
  headings: string[];
  /** Shared option list for plain MATCHING questions (A, B, C…). */
  matchOptions: string[];
  formPassage: string;
  formAnswers: string[];
  tablePassage: string;
  tableAnswers: string[];
};

function toFormState(initial?: ListeningInitial): FormState {
  if (!initial || initial.questions.length === 0) {
    return {
      questions: [blankQ("MCQ")],
      headings: ["", "", "", ""],
      matchOptions: ["", "", "", ""],
      formPassage: "",
      formAnswers: [],
      tablePassage: "",
      tableAnswers: [],
    };
  }
  const tableQs = initial.questions.filter((q) => q.formGroup?.startsWith("tbl"));
  const formQs = initial.questions.filter((q) => q.formGroup && !q.formGroup.startsWith("tbl"));
  const regular = initial.questions.filter((q) => !q.formGroup);
  let headings: string[] = [];
  let matchOptions: string[] = [];
  const questions: Q[] = regular.map((q) => {
    const type = coerceType(q.type);
    const explanation = q.explanation ?? "";
    const displayNumber = q.displayNumber != null ? String(q.displayNumber) : "";
    if (type === "MATCHING_HEADINGS") {
      const hs = (q.options ?? []).map((o) => o.replace(/^[ivxlcdm]+\.\s*/i, "").trim());
      // Keep the most complete list seen so every stored answer index resolves.
      if (hs.length > headings.length) headings = hs;
      const idx = ROMAN.indexOf(q.correctAnswer);
      return { type, prompt: q.prompt, options: [], correctAnswer: idx >= 0 ? String(idx) : "", explanation, displayNumber };
    }
    if (type === "MATCHING") {
      const mo = (q.options ?? []).map((o) => o.replace(/^[A-Z]\.\s*/, "").trim());
      if (mo.length > matchOptions.length) matchOptions = mo;
      // correctAnswer is a single letter (A/B/…) — translate to an index.
      const idx = q.correctAnswer.length === 1 ? q.correctAnswer.toUpperCase().charCodeAt(0) - 65 : -1;
      return { type, prompt: q.prompt, options: [], correctAnswer: idx >= 0 ? String(idx) : "", explanation, displayNumber };
    }
    if (type === "MCQ") {
      return { type, prompt: q.prompt, options: q.options && q.options.length ? q.options : ["", ""], correctAnswer: q.correctAnswer, explanation, displayNumber };
    }
    return { type, prompt: q.prompt, options: [], correctAnswer: q.correctAnswer, explanation, displayNumber };
  });
  // Stitch a group's segment-prompts back into the pasted text (blanks as dots).
  const stitch = (qs: typeof regular) =>
    qs.map((q) => q.prompt).join("").replace(/_{2,}/g, "..........");
  const hasGrouped = formQs.length > 0 || tableQs.length > 0;
  // A grouped-only test has no loose questions; a brand-new editor gets one blank.
  const finalQuestions = questions.length > 0 ? questions : hasGrouped ? [] : [blankQ("MCQ")];
  return {
    questions: finalQuestions,
    headings: headings.length >= 2 ? headings : ["", "", "", ""],
    matchOptions: matchOptions.length >= 2 ? matchOptions : ["", "", "", ""],
    formPassage: formQs.length ? stitch(formQs) : "",
    formAnswers: formQs.map((q) => q.correctAnswer),
    tablePassage: tableQs.length ? stitch(tableQs) : "",
    tableAnswers: tableQs.map((q) => q.correctAnswer),
  };
}

/** Listening-test create/edit form. Pass `initial` to edit an existing record. */
export function ListeningTestForm({ bank, initial }: { bank: Bank; initial?: ListeningInitial }) {
  const router = useRouter();
  const isEdit = !!initial;
  const isMock = bank === "MOCK";
  const listHref = isMock ? "/admin/listening/mock" : "/admin/listening";
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [audioUrl, setAudioUrl] = useState(initial?.audioUrl ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [contentImageUrl, setContentImageUrl] = useState(initial?.contentImageUrl ?? "");
  const [transcript, setTranscript] = useState(initial?.transcript ?? "");
  const [section, setSection] = useState<number | "">(initial?.section ?? "");
  const [bandStageId, setBandStageId] = useState<string | null>(initial?.bandStageId ?? null);
  const [init] = useState(() => toFormState(initial));
  const [questions, setQuestions] = useState<Q[]>(init.questions);
  const [headings, setHeadings] = useState<string[]>(init.headings);
  const [matchOptions, setMatchOptions] = useState<string[]>(init.matchOptions);
  const [formPassage, setFormPassage] = useState(init.formPassage);
  const [formAnswers, setFormAnswers] = useState<string[]>(init.formAnswers);
  const [tablePassage, setTablePassage] = useState(init.tablePassage);
  const [tableAnswers, setTableAnswers] = useState<string[]>(init.tableAnswers);
  const [extractingTable, setExtractingTable] = useState(false);
  const tableImgRef = useRef<HTMLInputElement>(null);

  const blankCount = countBlanks(formPassage);
  const tableBlankCount = countBlanks(tablePassage);
  const hasMatching = questions.some((q) => q.type === "MATCHING_HEADINGS");
  const hasMatch = questions.some((q) => q.type === "MATCHING");

  /** Pop the OS file picker → compress → send to AI → fill table textarea + answers. */
  const extractTableFromFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files).slice(0, 4).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;
    setExtractingTable(true);
    try {
      const images: string[] = [];
      for (const f of arr) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = () => reject(new Error("read failed"));
          r.readAsDataURL(f);
        });
        const compressed = await new Promise<string>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const maxW = 2000;
            const scale = Math.min(1, maxW / img.width);
            const c = document.createElement("canvas");
            c.width = Math.round(img.width * scale);
            c.height = Math.round(img.height * scale);
            const ctx = c.getContext("2d");
            if (!ctx) return reject(new Error("no canvas"));
            ctx.drawImage(img, 0, 0, c.width, c.height);
            resolve(c.toDataURL("image/jpeg", 0.85));
          };
          img.onerror = () => reject(new Error("load failed"));
          img.src = dataUrl;
        });
        images.push(compressed);
      }
      const res = await fetch("/api/admin/extract-table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "AI không đọc được bảng");
      setTablePassage(data.tableText as string);
      setTableAnswers(Array.isArray(data.answers) ? data.answers : []);
      toast.success("AI đã tạo bảng — kiểm tra lại đáp án bên dưới");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tạo bảng thất bại");
    } finally {
      setExtractingTable(false);
      if (tableImgRef.current) tableImgRef.current.value = "";
    }
  };

  const patchQ = (qi: number, patch: Partial<Q>) =>
    setQuestions((qs) => qs.map((q, i) => (i === qi ? { ...q, ...patch } : q)));

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

  const setMatchOptionAt = (oi: number, v: string) =>
    setMatchOptions((opts) => opts.map((x, j) => (j === oi ? v : x)));

  /** Remove a shared MATCHING option and reindex every question's chosen letter. */
  const removeMatchOption = (oi: number) => {
    setMatchOptions((opts) => opts.filter((_, i) => i !== oi));
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.type !== "MATCHING" || q.correctAnswer === "") return q;
        const idx = parseInt(q.correctAnswer, 10);
        if (idx === oi) return { ...q, correctAnswer: "" };
        if (idx > oi) return { ...q, correctAnswer: String(idx - 1) };
        return q;
      }),
    );
  };

  /** Paragraph letter for the Matching Headings question at index `qi`. */
  const mhLetterAt = (qi: number): string => {
    let c = 0;
    for (let i = 0; i < qi; i++) if (questions[i].type === "MATCHING_HEADINGS") c++;
    return LETTERS[c] ?? "?";
  };

  /** Switch a question's type and prefill sensible defaults (MCQ options, MH label). */
  const changeType = (qi: number, type: QType) => {
    const q = questions[qi];
    const patch: Partial<Q> = { type, correctAnswer: "" };
    patch.options = type === "MCQ" ? (q.options.length ? q.options : blankQ("MCQ").options) : [];
    if (type === "MATCHING_HEADINGS" && !q.prompt.trim()) {
      patch.prompt = `Speaker ${mhLetterAt(qi)}`;
    }
    if (type === "MATCHING" && !q.prompt.trim()) {
      patch.prompt = "Câu cần nối…";
    }
    patchQ(qi, patch);
  };

  /** Set answer `i` in a numbered answer list, growing the array as needed. */
  const setAnswerAt =
    (setter: typeof setFormAnswers) => (i: number, v: string) =>
      setter((prev) => {
        const next = [...prev];
        while (next.length <= i) next.push("");
        next[i] = v;
        return next;
      });
  const setFormAnswerAt = setAnswerAt(setFormAnswers);
  const setTableAnswerAt = setAnswerAt(setTableAnswers);

  const submit = async () => {
    if (!title.trim()) return toast.error("Nhập tiêu đề");
    if (!audioUrl.trim()) return toast.error("Thêm audio cho bài nghe (tải file lên hoặc dán URL công khai)");
    if (/^file:\/\//i.test(audioUrl.trim()))
      return toast.error("Link file:/// chỉ có trên máy bạn — hãy tải file âm thanh lên thay vì dán link đó");
    if (isMock && (section === "" || section < 1 || section > 4))
      return toast.error("Chọn Section 1–4 cho đề thi thử (mỗi đề mock cần thuộc 1 section)");

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

    // Same idea for plain MATCHING questions — shared A/B/C list.
    const matchRemap = new Map<number, number>();
    const finalMatch: string[] = [];
    if (hasMatch) {
      matchOptions.forEach((o, i) => {
        const t = o.trim();
        if (t) {
          matchRemap.set(i, finalMatch.length);
          finalMatch.push(t);
        }
      });
      if (finalMatch.length < 2) return toast.error("Danh sách câu nối cần ít nhất 2 mục");
    }
    const letteredMatch = finalMatch.map((o, i) => `${LETTERS[i]}. ${o}`);

    // Loose questions.
    const regularPayload: Payload[] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.prompt.trim()) return toast.error(`Câu ${i + 1}: thiếu nội dung câu hỏi`);

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
        regularPayload.push({ type: "MCQ", prompt: q.prompt.trim(), options: opts, correctAnswer: q.correctAnswer, explanation: q.explanation.trim() || undefined, displayNumber });
      } else if (q.type === "MATCHING_HEADINGS") {
        const origIdx = parseInt(q.correctAnswer, 10);
        const newIdx = Number.isNaN(origIdx) ? undefined : headingRemap.get(origIdx);
        if (newIdx === undefined) return toast.error(`Câu ${i + 1}: chọn heading đúng cho đoạn này`);
        regularPayload.push({ type: "MATCHING_HEADINGS", prompt: q.prompt.trim(), options: numberedHeadings, correctAnswer: ROMAN[newIdx], explanation: q.explanation.trim() || undefined, displayNumber });
      } else if (q.type === "MATCHING") {
        const origIdx = parseInt(q.correctAnswer, 10);
        const newIdx = Number.isNaN(origIdx) ? undefined : matchRemap.get(origIdx);
        if (newIdx === undefined) return toast.error(`Câu ${i + 1}: chọn câu nối đúng (A/B/C/…)`);
        regularPayload.push({ type: "MATCHING", prompt: q.prompt.trim(), options: letteredMatch, correctAnswer: LETTERS[newIdx], explanation: q.explanation.trim() || undefined, displayNumber });
      } else if (q.type === "TRUE_FALSE_NOT_GIVEN") {
        if (!["True", "False", "Not Given"].includes(q.correctAnswer))
          return toast.error(`Câu ${i + 1}: chọn đáp án đúng`);
        regularPayload.push({ type: "TRUE_FALSE_NOT_GIVEN", prompt: q.prompt.trim(), options: ["True", "False", "Not Given"], correctAnswer: q.correctAnswer, explanation: q.explanation.trim() || undefined, displayNumber });
      } else {
        if (!q.correctAnswer.trim()) return toast.error(`Câu ${i + 1}: nhập đáp án đúng`);
        regularPayload.push({ type: q.type, prompt: q.prompt.trim(), correctAnswer: q.correctAnswer.trim(), explanation: q.explanation.trim() || undefined, displayNumber });
      }
    }

    // Form-completion block → one FILL_BLANK question per blank.
    let formPayload: Payload[] = [];
    if (formPassage.trim()) {
      if (blankCount < 1)
        return toast.error("Đoạn Form completion chưa có chỗ trống — dùng chuỗi dấu chấm cho mỗi chỗ");
      for (let i = 0; i < blankCount; i++) {
        if (!(formAnswers[i] || "").trim())
          return toast.error(`Form completion: thiếu đáp án cho chỗ trống ${i + 1}`);
      }
      formPayload = buildFormQuestions(formPassage, formAnswers, "fg" + Date.now().toString(36));
    }

    // Table-completion block → one FILL_BLANK question per blank (formGroup "tbl…").
    let tablePayload: Payload[] = [];
    if (tablePassage.trim()) {
      const tableText = parseTablePaste(tablePassage)
        .map((row) => row.join(" | "))
        .join("\n");
      const n = countBlanks(tableText);
      if (n < 1)
        return toast.error("Bảng chưa có chỗ trống — dùng chuỗi dấu chấm cho mỗi ô cần điền");
      for (let i = 0; i < n; i++) {
        if (!(tableAnswers[i] || "").trim())
          return toast.error(`Bảng: thiếu đáp án cho chỗ trống ${i + 1}`);
      }
      tablePayload = buildFormQuestions(tableText, tableAnswers, "tbl" + Date.now().toString(36));
    }

    if (formPayload.length + tablePayload.length + regularPayload.length === 0)
      return toast.error("Cần ít nhất 1 câu hỏi — thêm câu hỏi, dán đoạn hoặc dán bảng");

    // Grouped blocks render first (they are usually Section 1).
    const payload = [...formPayload, ...tablePayload, ...regularPayload];

    setLoading(true);
    try {
      const res = await fetch(isEdit ? `/api/admin/listening/${initial!.id}` : "/api/admin/listening", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          audioUrl: audioUrl.trim(),
          imageUrl: imageUrl.trim() || null,
          contentImageUrl: contentImageUrl.trim() || null,
          transcript: transcript.trim() || undefined,
          bank,
          section: isMock && section !== "" ? section : null,
          bandStageId,
          questions: payload,
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
          {isEdit ? "Sửa bài Listening" : "Thêm bài Listening"} {isMock ? "— Thi thử" : "— Luyện tập"}
        </h1>
        <Badge variant="outline" className="text-sm">
          {isMock ? <GraduationCap className="h-3.5 w-3.5" /> : <Headphones className="h-3.5 w-3.5" />}
          Kho: {isMock ? "Đề thi thử" : "Luyện tập"}
        </Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>Thông tin</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Tiêu đề</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: IELTS Listening — Section 1" />
          </div>
          {isMock && (
            <div>
              <Label>Section của IELTS</Label>
              <select
                value={section === "" ? "" : String(section)}
                onChange={(e) => setSection(e.target.value === "" ? "" : Number(e.target.value))}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">— Chọn section —</option>
                <option value="1">Section 1</option>
                <option value="2">Section 2</option>
                <option value="3">Section 3</option>
                <option value="4">Section 4</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Đề thi thử cần đủ 4 section. Mỗi bài MOCK phải gắn 1 section; khi học viên thi thử
                hệ thống bốc ngẫu nhiên 1 bài mỗi section (1–4) ghép thành đề Listening hoàn chỉnh.
              </p>
            </div>
          )}
          <AudioUrlField value={audioUrl} onChange={setAudioUrl} />
          <div>
            <Label>Transcript (tuỳ chọn)</Label>
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="min-h-[160px]"
              placeholder="Nội dung lời thoại — hiển thị sau khi nộp bài"
            />
          </div>
          <ImageUrlField
            value={imageUrl}
            onChange={setImageUrl}
            aiContext={title}
            label="Ảnh bìa (tuỳ chọn)"
            hint="Ảnh bìa hiển thị ở thẻ chọn đề và bên audio player. Dán URL, tải ảnh lên, hoặc để AI tạo."
          />
          <ImageUrlField
            value={contentImageUrl}
            onChange={setContentImageUrl}
            aiContext={title}
            label="Ảnh trong bài làm (tuỳ chọn)"
            hint="Ảnh hiển thị ngay trong phần làm bài — dùng cho dạng bản đồ, sơ đồ, bảng biểu mà câu hỏi nhắc tới. Tải ảnh từ máy lên hoặc dán URL."
          />
          <BandStageSelect value={bandStageId} onChange={setBandStageId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlignLeft className="h-5 w-5 text-primary" /> Điền chỗ trống — dán cả đoạn
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Dán nguyên một đoạn / form điền chỗ trống. Mỗi chỗ trống là một chuỗi dấu chấm.
            Người học sẽ thấy đoạn liền mạch với ô điền ngay trong dòng.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Đoạn văn / form</Label>
            <Textarea
              value={formPassage}
              onChange={(e) => setFormPassage(e.target.value)}
              className="min-h-[200px] font-mono text-[13px]"
              placeholder={
                "Accommodation Booking Form\nName: Mark Harrison\n\nLength of stay: 1. .......... nights\n\nRoom type preferred: Single room with a 2. .......... view"
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Table className="h-5 w-5 text-primary" /> Bảng điền chỗ trống — dán cả bảng
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Dán bảng (Word/Excel/Pages — cột tự cách bằng Tab), hoặc bấm{" "}
            <strong>“Tải ảnh để AI tạo bảng”</strong> để AI dựng lại bảng + đáp án từ ảnh
            chụp/scan. Mỗi ô cần điền là một chuỗi dấu chấm.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-primary">
              <Sparkles className="h-4 w-4" /> AI tạo bảng từ ảnh
            </div>
            <input
              ref={tableImgRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => extractTableFromFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              disabled={extractingTable}
              onClick={() => tableImgRef.current?.click()}
            >
              {extractingTable ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {extractingTable ? "AI đang đọc bảng…" : "Tải ảnh để AI tạo bảng"}
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Chụp/scan rõ phần bảng (kèm cả tiêu đề cột). AI sẽ điền vào ô “Bảng” và danh sách
              đáp án bên dưới — bạn kiểm tra lại trước khi lưu. Tối đa 4 ảnh.
            </p>
          </div>
          <div>
            <Label>Bảng</Label>
            <Textarea
              value={tablePassage}
              onChange={(e) => setTablePassage(e.target.value)}
              className="min-h-[180px] font-mono text-[13px]"
              placeholder={
                "Activity | Day | Price\nCity Walking Tour | Wednesday | Free\nLocal Museum Visit | Thursday | 7. £..........\nTraditional 8. .......... Show | Friday | £25"
              }
            />
            <p className="text-xs text-muted-foreground mt-1">
              Dán trực tiếp từ Word/Excel (các cột tự cách bằng Tab) hoặc gõ tay, ngăn cột bằng
              “|”. Mỗi ô trống là một chuỗi dấu chấm; số “7.”, “8.”… sẽ tự thành ô điền.
            </p>
          </div>
          {tablePassage.trim() && (
            <div>
              <Label>Đáp án — {tableBlankCount} chỗ trống</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Nhiều đáp án đúng cho một ô? Ngăn cách bằng dấu “/” — VD “8 / eight”.
              </p>
              {tableBlankCount === 0 ? (
                <p className="text-xs text-destructive mt-1">
                  Chưa phát hiện chỗ trống nào — mỗi ô cần điền cần một chuỗi dấu chấm.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 mt-1">
                  {Array.from({ length: tableBlankCount }).map((_, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                        {i + 1}
                      </span>
                      <Input
                        value={tableAnswers[i] ?? ""}
                        onChange={(e) => setTableAnswerAt(i, e.target.value)}
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

      {hasMatch && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5 text-primary" /> Danh sách câu nối (dùng chung)
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setMatchOptions([...matchOptions, ""])}>
                <Plus className="h-4 w-4" /> Thêm câu
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Danh sách câu nối đánh số A, B, C… Mỗi câu “Matching” bên dưới sẽ chọn 1 câu nối
              từ danh sách này. VD: A. Likes coffee · B. Prefers tea · C. Doesn’t drink at all.
            </p>
            {matchOptions.map((o, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <span className="text-sm font-bold w-8 shrink-0 text-muted-foreground">{LETTERS[oi]}.</span>
                <Input
                  value={o}
                  placeholder={`Nội dung câu nối ${LETTERS[oi] ?? oi + 1}`}
                  onChange={(e) => setMatchOptionAt(oi, e.target.value)}
                />
                {matchOptions.length > 2 && (
                  <Button variant="ghost" size="sm" onClick={() => removeMatchOption(oi)}>
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
            <CardTitle>Câu hỏi lẻ</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setQuestions([...questions, blankQ("MCQ")])}>
              <Plus className="h-4 w-4" /> Thêm câu
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Câu hỏi trắc nghiệm, T/F/NG, điền lẻ, Matching Headings… (không bắt buộc nếu bài chỉ dùng phần dán đoạn ở trên).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.length === 0 && (
            <p className="text-sm text-muted-foreground">Chưa có câu hỏi lẻ nào.</p>
          )}
          {questions.map((q, qi) => {
            const mhLetter = q.type === "MATCHING_HEADINGS" ? mhLetterAt(qi) : null;
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
                    Số học viên thấy. Để trống = tự đánh.
                  </p>
                </div>
              </div>

              <div>
                <Label>
                  {q.type === "MATCHING_HEADINGS"
                    ? "Tên đoạn / Speaker (hiển thị cạnh ô chọn)"
                    : q.type === "MATCHING"
                      ? "Câu cần nối (học viên sẽ chọn A/B/C/… cho câu này)"
                      : "Nội dung câu hỏi"}
                </Label>
                <Textarea
                  value={q.prompt}
                  onChange={(e) => patchQ(qi, { prompt: e.target.value })}
                  placeholder={
                    q.type === "FILL_BLANK"
                      ? "Dùng ___ cho chỗ trống."
                      : q.type === "TRUE_FALSE_NOT_GIVEN"
                        ? "Một nhận định để người học xác nhận."
                        : q.type === "MATCHING_HEADINGS"
                          ? "VD: Speaker A"
                          : q.type === "MATCHING"
                            ? "VD: Tom nói rằng…"
                            : "Nội dung câu hỏi..."
                  }
                />
              </div>

              {q.type === "MCQ" && <McqOptions q={q} qi={qi} patchQ={patchQ} />}

              {q.type === "MATCHING_HEADINGS" && (
                <HeadingPicker headings={headings} value={q.correctAnswer} onChange={(v) => patchQ(qi, { correctAnswer: v })} />
              )}

              {q.type === "MATCHING" && (
                <MatchPicker options={matchOptions} value={q.correctAnswer} onChange={(v) => patchQ(qi, { correctAnswer: v })} />
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

              {(q.type === "FILL_BLANK" || q.type === "SHORT_ANSWER") && (
                <div>
                  <Label>Đáp án đúng</Label>
                  <Input
                    value={q.correctAnswer}
                    onChange={(e) => patchQ(qi, { correctAnswer: e.target.value })}
                    placeholder="VD: 8 / eight"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Nhiều đáp án đúng? Ngăn cách bằng dấu “/” — VD “8 / eight”.
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
              endpoint={`/api/admin/listening/${initial!.id}`}
              name={initial!.title}
              kind="bài Listening"
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
      <Label>Heading đúng cho đoạn / speaker này</Label>
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

/** Dropdown for a plain MATCHING question — picks one A/B/C/… from the shared list. */
function MatchPicker({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const filled = options.some((o) => o.trim());
  return (
    <div>
      <Label>Câu nối đúng (A/B/C/…)</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
      >
        <option value="">— Chọn —</option>
        {options.map((o, oi) =>
          o.trim() ? (
            <option key={oi} value={String(oi)}>
              {LETTERS[oi]}. {o}
            </option>
          ) : null,
        )}
      </select>
      {!filled && (
        <p className="text-xs text-destructive mt-1">
          Hãy nhập “Danh sách câu nối” ở khung phía trên trước.
        </p>
      )}
    </div>
  );
}
