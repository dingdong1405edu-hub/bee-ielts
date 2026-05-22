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
import { Trash2, Plus, Loader2, GraduationCap, Headphones, AlignLeft } from "lucide-react";
import { ImageUrlField } from "./image-url-field";
import { AudioUrlField } from "./audio-url-field";
import { DeleteTestButton } from "./delete-test-button";

type Bank = "PRACTICE" | "MOCK";
type QType = "MCQ" | "FILL_BLANK" | "TRUE_FALSE_NOT_GIVEN" | "SHORT_ANSWER";

type Q = {
  type: QType;
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

type Payload = {
  type: QType;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  formGroup?: string;
};

const TYPE_LABEL: Record<QType, string> = {
  MCQ: "Trắc nghiệm (Multiple choice)",
  FILL_BLANK: "Điền vào chỗ trống (Completion)",
  TRUE_FALSE_NOT_GIVEN: "Xác nhận thông tin (True / False / Not Given)",
  SHORT_ANSWER: "Câu trả lời ngắn (Short answer)",
};

const blankQ = (type: QType): Q => ({
  type,
  prompt: "",
  options: type === "MCQ" ? ["", "", "", ""] : [],
  correctAnswer: "",
  explanation: "",
});

/** A blank in a pasted form: a run of dots, underscores, or ellipsis chars. */
const BLANK_RE = /\.{2,}|_{2,}|…+/g;

/** Count blank markers in a pasted form passage. */
function countBlanks(text: string): number {
  return (text.match(BLANK_RE) || []).length;
}

/** Drop a trailing question-number token ("1.", "(2)", "3)") from a segment. */
function stripTrailingNumber(seg: string): string {
  return seg.replace(/(\(\d+\)|\d+[.)])[ \t]*$/, "");
}

/**
 * Split a pasted form passage into one FILL_BLANK question per blank. Each
 * prompt is the text before its blank (question number removed) plus a `___`
 * marker; the last question also carries the trailing text.
 */
function buildFormQuestions(passage: string, answers: string[], formGroup: string): Payload[] {
  const segments = passage.split(BLANK_RE);
  const blanks = segments.length - 1;
  const out: Payload[] = [];
  for (let i = 0; i < blanks; i++) {
    let prompt = stripTrailingNumber(segments[i]) + "___";
    if (i === blanks - 1) prompt += segments[blanks];
    out.push({ type: "FILL_BLANK", prompt, correctAnswer: (answers[i] || "").trim(), formGroup });
  }
  return out;
}

/** DB-shaped listening test passed in when editing an existing record. */
export type ListeningInitial = {
  id: string;
  title: string;
  audioUrl: string;
  imageUrl: string | null;
  transcript: string | null;
  questions: {
    type: string;
    prompt: string;
    options: string[] | null;
    correctAnswer: string;
    explanation: string | null;
    formGroup: string | null;
  }[];
};

function coerceType(t: string): QType {
  if (t === "MCQ" || t === "FILL_BLANK" || t === "TRUE_FALSE_NOT_GIVEN" || t === "SHORT_ANSWER") return t;
  if (t.startsWith("TRUE_FALSE")) return "TRUE_FALSE_NOT_GIVEN";
  if (t === "MATCHING" || t.startsWith("MATCHING")) return "MCQ";
  return "FILL_BLANK";
}

/**
 * Split a loaded test into editable state: loose questions go to the question
 * editor; form-completion questions (those with a formGroup) are stitched back
 * into a single pasted passage + answer list.
 */
function toFormState(initial?: ListeningInitial): { questions: Q[]; formPassage: string; formAnswers: string[] } {
  if (!initial || initial.questions.length === 0) {
    return { questions: [blankQ("MCQ")], formPassage: "", formAnswers: [] };
  }
  const formQs = initial.questions.filter((q) => q.formGroup);
  const regular = initial.questions.filter((q) => !q.formGroup);
  const questions: Q[] = regular.map((q) => {
    const type = coerceType(q.type);
    const explanation = q.explanation ?? "";
    if (type === "MCQ") {
      return { type, prompt: q.prompt, options: q.options && q.options.length ? q.options : ["", ""], correctAnswer: q.correctAnswer, explanation };
    }
    return { type, prompt: q.prompt, options: [], correctAnswer: q.correctAnswer, explanation };
  });
  const formPassage = formQs.length
    ? formQs.map((q) => q.prompt).join("").replace(/_{2,}/g, "..........")
    : "";
  const formAnswers = formQs.map((q) => q.correctAnswer);
  // A form-only test has no loose questions; a brand-new editor gets one blank.
  const finalQuestions = questions.length > 0 ? questions : formQs.length > 0 ? [] : [blankQ("MCQ")];
  return { questions: finalQuestions, formPassage, formAnswers };
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
  const [transcript, setTranscript] = useState(initial?.transcript ?? "");
  const [init] = useState(() => toFormState(initial));
  const [questions, setQuestions] = useState<Q[]>(init.questions);
  const [formPassage, setFormPassage] = useState(init.formPassage);
  const [formAnswers, setFormAnswers] = useState<string[]>(init.formAnswers);

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

  const submit = async () => {
    if (!title.trim()) return toast.error("Nhập tiêu đề");
    if (!audioUrl.trim()) return toast.error("Thêm audio cho bài nghe (tải file lên hoặc dán URL công khai)");
    if (/^file:\/\//i.test(audioUrl.trim()))
      return toast.error("Link file:/// chỉ có trên máy bạn — hãy tải file âm thanh lên thay vì dán link đó");

    // Loose questions.
    const regularPayload: Payload[] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.prompt.trim()) return toast.error(`Câu ${i + 1}: thiếu nội dung câu hỏi`);

      if (q.type === "MCQ") {
        const opts = q.options.map((o) => o.trim()).filter(Boolean);
        if (opts.length < 2) return toast.error(`Câu ${i + 1}: cần ít nhất 2 lựa chọn`);
        if (!q.correctAnswer || !opts.includes(q.correctAnswer))
          return toast.error(`Câu ${i + 1}: chọn đáp án đúng`);
        regularPayload.push({ type: "MCQ", prompt: q.prompt.trim(), options: opts, correctAnswer: q.correctAnswer, explanation: q.explanation.trim() || undefined });
      } else if (q.type === "TRUE_FALSE_NOT_GIVEN") {
        if (!["True", "False", "Not Given"].includes(q.correctAnswer))
          return toast.error(`Câu ${i + 1}: chọn đáp án đúng`);
        regularPayload.push({ type: "TRUE_FALSE_NOT_GIVEN", prompt: q.prompt.trim(), options: ["True", "False", "Not Given"], correctAnswer: q.correctAnswer, explanation: q.explanation.trim() || undefined });
      } else {
        if (!q.correctAnswer.trim()) return toast.error(`Câu ${i + 1}: nhập đáp án đúng`);
        regularPayload.push({ type: q.type, prompt: q.prompt.trim(), correctAnswer: q.correctAnswer.trim(), explanation: q.explanation.trim() || undefined });
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

    if (formPayload.length + regularPayload.length === 0)
      return toast.error("Cần ít nhất 1 câu hỏi — thêm câu hỏi hoặc dán đoạn Form completion");

    // Form questions render first (they are usually Section 1).
    const payload = [...formPayload, ...regularPayload];

    setLoading(true);
    try {
      const res = await fetch(isEdit ? `/api/admin/listening/${initial!.id}` : "/api/admin/listening", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          audioUrl: audioUrl.trim(),
          imageUrl: imageUrl.trim() || null,
          transcript: transcript.trim() || undefined,
          bank,
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
          <div className="flex items-center justify-between">
            <CardTitle>Câu hỏi lẻ</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setQuestions([...questions, blankQ("MCQ")])}>
              <Plus className="h-4 w-4" /> Thêm câu
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Câu hỏi trắc nghiệm, T/F/NG, điền lẻ… (không bắt buộc nếu bài chỉ dùng phần dán đoạn ở trên).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.length === 0 && (
            <p className="text-sm text-muted-foreground">Chưa có câu hỏi lẻ nào.</p>
          )}
          {questions.map((q, qi) => (
            <div key={qi} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Câu {qi + 1}</span>
                <Button variant="ghost" size="sm" onClick={() => setQuestions(questions.filter((_, i) => i !== qi))}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>

              <div>
                <Label>Dạng câu hỏi</Label>
                <select
                  value={q.type}
                  onChange={(e) => {
                    const type = e.target.value as QType;
                    patchQ(qi, { type, options: blankQ(type).options, correctAnswer: "" });
                  }}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  {(Object.keys(TYPE_LABEL) as QType[]).map((t) => (
                    <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Nội dung câu hỏi</Label>
                <Textarea
                  value={q.prompt}
                  onChange={(e) => patchQ(qi, { prompt: e.target.value })}
                  placeholder={
                    q.type === "FILL_BLANK"
                      ? "Dùng ___ cho chỗ trống."
                      : q.type === "TRUE_FALSE_NOT_GIVEN"
                        ? "Một nhận định để người học xác nhận."
                        : "Nội dung câu hỏi..."
                  }
                />
              </div>

              {q.type === "MCQ" && <McqOptions q={q} qi={qi} patchQ={patchQ} />}

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
                    placeholder="Từ / cụm từ"
                  />
                </div>
              )}

              <div>
                <Label>Giải thích (tuỳ chọn)</Label>
                <Textarea value={q.explanation} onChange={(e) => patchQ(qi, { explanation: e.target.value })} />
              </div>
            </div>
          ))}
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
