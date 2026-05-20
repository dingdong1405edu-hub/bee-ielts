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
import { Trash2, Plus, Loader2, GraduationCap, BookOpen } from "lucide-react";

type Bank = "PRACTICE" | "MOCK";
type QType = "MCQ" | "MATCHING_HEADINGS" | "FILL_BLANK" | "TRUE_FALSE_NOT_GIVEN";

type Q = {
  type: QType;
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"];

const TYPE_LABEL: Record<QType, string> = {
  MCQ: "Trắc nghiệm (Multiple choice)",
  MATCHING_HEADINGS: "Nối tiêu đề (Matching Headings)",
  FILL_BLANK: "Điền vào chỗ trống (Completion)",
  TRUE_FALSE_NOT_GIVEN: "Xác nhận thông tin (True / False / Not Given)",
};

const blankQ = (type: QType): Q => ({
  type,
  prompt: "",
  options: type === "MCQ" || type === "MATCHING_HEADINGS" ? ["", "", "", ""] : [],
  correctAnswer: "",
  explanation: "",
});

/** Reading-test creation form. `bank` is locked from the wrapping route. */
export function ReadingTestForm({ bank }: { bank: Bank }) {
  const router = useRouter();
  const isMock = bank === "MOCK";
  const listHref = isMock ? "/admin/reading/mock" : "/admin/reading";
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [passage, setPassage] = useState("");
  const [questions, setQuestions] = useState<Q[]>([blankQ("MCQ")]);

  const patchQ = (qi: number, patch: Partial<Q>) =>
    setQuestions((qs) => qs.map((q, i) => (i === qi ? { ...q, ...patch } : q)));

  const submit = async () => {
    if (!title.trim()) return toast.error("Nhập tiêu đề");
    if (passage.trim().length < 50) return toast.error("Đoạn văn quá ngắn (tối thiểu 50 ký tự)");
    if (questions.length === 0) return toast.error("Cần ít nhất 1 câu hỏi");

    const payload: { type: QType; prompt: string; options?: string[]; correctAnswer: string; explanation?: string }[] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.prompt.trim()) return toast.error(`Câu ${i + 1}: thiếu nội dung câu hỏi`);

      if (q.type === "MCQ") {
        const opts = q.options.map((o) => o.trim()).filter(Boolean);
        if (opts.length < 2) return toast.error(`Câu ${i + 1}: cần ít nhất 2 lựa chọn`);
        if (!q.correctAnswer || !opts.includes(q.correctAnswer))
          return toast.error(`Câu ${i + 1}: chọn đáp án đúng`);
        payload.push({ type: "MCQ", prompt: q.prompt.trim(), options: opts, correctAnswer: q.correctAnswer, explanation: q.explanation.trim() || undefined });
      } else if (q.type === "MATCHING_HEADINGS") {
        const headings = q.options.map((o) => o.trim()).filter(Boolean);
        if (headings.length < 2) return toast.error(`Câu ${i + 1}: cần ít nhất 2 tiêu đề`);
        const idx = parseInt(q.correctAnswer, 10);
        if (Number.isNaN(idx) || idx < 0 || idx >= headings.length)
          return toast.error(`Câu ${i + 1}: chọn tiêu đề đúng`);
        const numbered = headings.map((h, hi) => `${ROMAN[hi]}. ${h}`);
        payload.push({ type: "MATCHING_HEADINGS", prompt: q.prompt.trim(), options: numbered, correctAnswer: ROMAN[idx], explanation: q.explanation.trim() || undefined });
      } else if (q.type === "TRUE_FALSE_NOT_GIVEN") {
        if (!["True", "False", "Not Given"].includes(q.correctAnswer))
          return toast.error(`Câu ${i + 1}: chọn đáp án đúng`);
        payload.push({ type: "TRUE_FALSE_NOT_GIVEN", prompt: q.prompt.trim(), options: ["True", "False", "Not Given"], correctAnswer: q.correctAnswer, explanation: q.explanation.trim() || undefined });
      } else {
        if (!q.correctAnswer.trim()) return toast.error(`Câu ${i + 1}: nhập đáp án đúng`);
        payload.push({ type: "FILL_BLANK", prompt: q.prompt.trim(), correctAnswer: q.correctAnswer.trim(), explanation: q.explanation.trim() || undefined });
      }
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), passage: passage.trim(), bank, questions: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi");
      toast.success(isMock ? "Đã thêm vào kho đề thi thử" : "Đã thêm vào kho luyện tập");
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
          Thêm bài Reading {isMock ? "— Thi thử" : "— Luyện tập"}
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
        </CardContent>
      </Card>

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
          {questions.map((q, qi) => (
            <div key={qi} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Câu {qi + 1}</span>
                {questions.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => setQuestions(questions.filter((_, i) => i !== qi))}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>

              <div>
                <Label>Dạng câu hỏi</Label>
                <select
                  value={q.type}
                  onChange={(e) => {
                    const type = e.target.value as QType;
                    const keepOpts = (type === "MCQ" || type === "MATCHING_HEADINGS") && q.options.length > 0;
                    patchQ(qi, { type, options: keepOpts ? q.options : blankQ(type).options, correctAnswer: "" });
                  }}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  {(Object.keys(TYPE_LABEL) as QType[]).map((t) => (
                    <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>{q.type === "MATCHING_HEADINGS" ? "Đoạn văn / câu cần nối tiêu đề" : "Nội dung câu hỏi"}</Label>
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
                          : "Nội dung câu hỏi..."
                  }
                />
              </div>

              {q.type === "MCQ" && <McqOptions q={q} qi={qi} patchQ={patchQ} />}
              {q.type === "MATCHING_HEADINGS" && <HeadingOptions q={q} qi={qi} patchQ={patchQ} />}

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
                    placeholder="Từ / cụm từ điền vào chỗ trống"
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
          Lưu
        </Button>
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

function HeadingOptions({ q, qi, patchQ }: { q: Q; qi: number; patchQ: (qi: number, patch: Partial<Q>) => void }) {
  return (
    <div className="space-y-2">
      <Label>Danh sách tiêu đề</Label>
      {q.options.map((opt, oi) => (
        <div key={oi} className="flex items-center gap-2">
          <input
            type="radio"
            name={`correct-${qi}`}
            checked={q.correctAnswer === String(oi)}
            onChange={() => patchQ(qi, { correctAnswer: String(oi) })}
            className="h-4 w-4 shrink-0"
            title="Đánh dấu tiêu đề đúng"
          />
          <span className="text-sm font-bold w-7 shrink-0 text-muted-foreground">{ROMAN[oi]}.</span>
          <Input
            placeholder={`Tiêu đề ${oi + 1}`}
            value={opt}
            onChange={(e) => {
              const options = [...q.options];
              options[oi] = e.target.value;
              patchQ(qi, { options });
            }}
          />
          {q.options.length > 2 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const options = q.options.filter((_, i) => i !== oi);
                patchQ(qi, { options, correctAnswer: "" });
              }}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => patchQ(qi, { options: [...q.options, ""] })}>
        <Plus className="h-4 w-4" /> Thêm tiêu đề
      </Button>
      <p className="text-xs text-muted-foreground">Chọn ô tròn bên trái để đánh dấu tiêu đề đúng cho đoạn này.</p>
    </div>
  );
}
