"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ArrowLeft, ImageIcon, Type, CheckCircle2, Volume2 } from "lucide-react";

type Skill = "READING" | "LISTENING" | "WRITING" | "SPEAKING";
type QType = "IMAGE_CHOICE" | "TEXT_CHOICE";

interface OptionDraft {
  label: string;
  imageUrl?: string;
}
interface QuestionDraft {
  type: QType;
  prompt: string;
  // Optional mp3/ogg URL — player shows a "Nghe" button above the prompt.
  audioUrl?: string;
  options: OptionDraft[];
  correctIndex: number;
}

const blankQuestion = (type: QType = "TEXT_CHOICE"): QuestionDraft => ({
  type,
  prompt: "",
  audioUrl: "",
  options: type === "IMAGE_CHOICE"
    ? [{ label: "", imageUrl: "" }, { label: "", imageUrl: "" }, { label: "", imageUrl: "" }]
    : [{ label: "" }, { label: "" }, { label: "" }],
  correctIndex: 0,
});

interface FormProps {
  stage: { id: string; title: string; fromBand: number; toBand: number };
  mode: "create" | "edit";
  initial?: {
    id: string;
    title: string;
    skill: Skill;
    questions: QuestionDraft[];
  };
  // Used in create-mode when admin clicks "Thêm mini-quiz" from inside a
  // specific skill hub — pre-selects the dropdown to that skill.
  defaultSkill?: Skill;
}

export function MiniQuizForm({ stage, mode, initial, defaultSkill }: FormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [skill, setSkill] = useState<Skill>(initial?.skill ?? defaultSkill ?? "READING");
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    initial?.questions ?? [blankQuestion("TEXT_CHOICE")],
  );
  const [saving, setSaving] = useState(false);

  const addQuestion = (type: QType) => {
    setQuestions((q) => [...q, blankQuestion(type)]);
  };
  const removeQuestion = (idx: number) => {
    setQuestions((q) => q.filter((_, i) => i !== idx));
  };
  const updateQuestion = (idx: number, patch: Partial<QuestionDraft>) => {
    setQuestions((q) => q.map((qq, i) => (i === idx ? { ...qq, ...patch } : qq)));
  };
  const updateOption = (qIdx: number, oIdx: number, patch: Partial<OptionDraft>) => {
    setQuestions((q) =>
      q.map((qq, i) =>
        i === qIdx
          ? { ...qq, options: qq.options.map((o, j) => (j === oIdx ? { ...o, ...patch } : o)) }
          : qq,
      ),
    );
  };
  const addOption = (qIdx: number) => {
    setQuestions((q) =>
      q.map((qq, i) =>
        i === qIdx ? { ...qq, options: [...qq.options, { label: "", imageUrl: "" }] } : qq,
      ),
    );
  };
  const removeOption = (qIdx: number, oIdx: number) => {
    setQuestions((q) =>
      q.map((qq, i) => {
        if (i !== qIdx) return qq;
        if (qq.options.length <= 2) return qq;
        const newOpts = qq.options.filter((_, j) => j !== oIdx);
        const newCorrect =
          qq.correctIndex === oIdx
            ? 0
            : qq.correctIndex > oIdx
              ? qq.correctIndex - 1
              : qq.correctIndex;
        return { ...qq, options: newOpts, correctIndex: newCorrect };
      }),
    );
  };

  const save = async () => {
    if (!title.trim()) {
      toast.error("Cần nhập tên mini-quiz.");
      return;
    }
    if (questions.length === 0) {
      toast.error("Cần ít nhất 1 câu hỏi.");
      return;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.prompt.trim()) {
        toast.error(`Câu ${i + 1} chưa có đề.`);
        return;
      }
      if (q.options.length < 2) {
        toast.error(`Câu ${i + 1} cần ≥ 2 đáp án.`);
        return;
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].label.trim()) {
          toast.error(`Câu ${i + 1} đáp án ${j + 1} chưa có nội dung.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const body = {
        bandStageId: stage.id,
        skill,
        title,
        questions: questions.map((q) => ({
          type: q.type,
          prompt: q.prompt,
          audioUrl: q.audioUrl?.trim() || undefined,
          options: q.options.map((o) => ({
            label: o.label,
            imageUrl: o.imageUrl?.trim() || undefined,
          })),
          correctIndex: q.correctIndex,
        })),
      };
      const endpoint =
        mode === "create"
          ? "/api/admin/mini-quizzes"
          : `/api/admin/mini-quizzes/${initial!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "create" ? body : { title, skill, questions: body.questions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi");
      toast.success(mode === "create" ? "Đã tạo mini-quiz." : "Đã lưu.");
      router.push(`/admin/band-climber/${stage.id}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/band-climber/${stage.id}`}>
            <ArrowLeft className="h-4 w-4" /> Quay lại chặng
          </Link>
        </Button>
      </div>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">
          {mode === "create" ? "Tạo mini-quiz mới" : "Sửa mini-quiz"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Chặng {stage.fromBand} → {stage.toBand} · {stage.title}
        </p>
      </div>

      {/* Quiz meta */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin chung</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-bold uppercase text-muted-foreground">Tên hiển thị</span>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Từ vựng đồ uống — A1"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase text-muted-foreground">Kỹ năng</span>
            <select
              value={skill}
              onChange={(e) => setSkill(e.target.value as Skill)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="READING">Reading</option>
              <option value="LISTENING">Listening</option>
              <option value="WRITING">Writing</option>
              <option value="SPEAKING">Speaking</option>
            </select>
          </label>
        </CardContent>
      </Card>

      {/* Questions list */}
      <div className="space-y-3">
        {questions.map((q, idx) => (
          <Card key={idx} className="border-2 border-violet-100">
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-violet-500 text-white text-sm font-bold">
                    {idx + 1}
                  </span>
                  Câu {idx + 1}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({q.type === "IMAGE_CHOICE" ? "Ảnh" : "Văn bản"})
                  </span>
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-rose-600"
                  onClick={() => removeQuestion(idx)}
                >
                  <Trash2 className="h-4 w-4" /> Xóa câu
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="block">
                <span className="text-xs font-bold uppercase text-muted-foreground">
                  Đề câu hỏi
                </span>
                <Input
                  value={q.prompt}
                  onChange={(e) => updateQuestion(idx, { prompt: e.target.value })}
                  placeholder={q.type === "IMAGE_CHOICE" ? 'VD: Đâu là "cà phê"?' : 'VD: Chọn nghĩa đúng của "coffee"'}
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                  <Volume2 className="h-3.5 w-3.5 text-amber-500" />
                  Audio URL (Listening — tùy chọn)
                </span>
                <Input
                  value={q.audioUrl ?? ""}
                  onChange={(e) => updateQuestion(idx, { audioUrl: e.target.value })}
                  placeholder="https://.../audio.mp3 — để trống nếu không cần audio"
                  type="url"
                />
                {q.audioUrl && (
                  <audio controls src={q.audioUrl} className="mt-1.5 h-9 w-full" />
                )}
              </label>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-muted-foreground">
                    Các đáp án (chọn ⭐ cho đáp án ĐÚNG)
                  </span>
                  <Button size="sm" variant="outline" onClick={() => addOption(idx)}>
                    <Plus className="h-3 w-3" /> Thêm đáp án
                  </Button>
                </div>
                {q.options.map((o, oIdx) => {
                  const isCorrect = q.correctIndex === oIdx;
                  return (
                    <div
                      key={oIdx}
                      className={`flex items-center gap-2 rounded-lg border-2 p-2 ${
                        isCorrect ? "border-emerald-400 bg-emerald-50" : "border-input"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => updateQuestion(idx, { correctIndex: oIdx })}
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                          isCorrect ? "bg-emerald-500 text-white" : "bg-zinc-200 text-zinc-500"
                        }`}
                        title="Đặt làm đáp án đúng"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <Input
                        value={o.label}
                        onChange={(e) => updateOption(idx, oIdx, { label: e.target.value })}
                        placeholder={`Đáp án ${oIdx + 1}`}
                      />
                      {q.type === "IMAGE_CHOICE" && (
                        <Input
                          value={o.imageUrl ?? ""}
                          onChange={(e) => updateOption(idx, oIdx, { imageUrl: e.target.value })}
                          placeholder="URL ảnh (https://...)"
                          className="max-w-[260px]"
                        />
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-600 shrink-0"
                        onClick={() => removeOption(idx, oIdx)}
                        disabled={q.options.length <= 2}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add question buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => addQuestion("TEXT_CHOICE")}>
          <Type className="h-4 w-4" /> Thêm câu — văn bản
        </Button>
        <Button variant="outline" onClick={() => addQuestion("IMAGE_CHOICE")}>
          <ImageIcon className="h-4 w-4" /> Thêm câu — ảnh
        </Button>
      </div>

      {/* Save */}
      <div className="sticky bottom-2 z-10 flex justify-end gap-2 rounded-2xl border bg-card p-3 shadow-md">
        <Button asChild variant="outline">
          <Link href={`/admin/band-climber/${stage.id}`}>Hủy</Link>
        </Button>
        <Button onClick={save} disabled={saving} variant="brand">
          {saving ? "Đang lưu..." : mode === "create" ? "Tạo mini-quiz" : "Lưu thay đổi"}
        </Button>
      </div>
    </div>
  );
}
