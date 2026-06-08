"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ArrowLeft, ImageIcon, Type, CheckCircle2, Volume2, Pencil, Mic, Sparkles } from "lucide-react";
import { BandClimbToursEditor, type TourStepDraft } from "@/components/admin/band-climb-tours-editor";

type Skill = "READING" | "LISTENING" | "WRITING" | "SPEAKING";
type QType =
  | "IMAGE_CHOICE"
  | "TEXT_CHOICE"
  | "FILL_BLANK"
  | "PARAGRAPH_FILL"
  | "SPEAKING";

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
  // Admin-authored "tại sao đáp án này đúng" — surfaced in the player
  // verdict bar after the learner checks. Empty = no explanation row.
  // For SPEAKING the field doubles as guidance for the inline pronunciation
  // grader prompt (e.g. "target band 6.0, focus on past tense").
  explanation?: string;
  // IELTS Speaking Part-2 cue card bullets. Only SPEAKING questions can
  // have these; non-empty flips the player to Part-2 flow (1 min prep +
  // 2 min speak with auto-recording).
  cueCardPoints?: string[];
}
interface VocabItemDraft {
  term: string;
  definition: string;
  example?: string;
}

const blankQuestion = (type: QType = "TEXT_CHOICE"): QuestionDraft => {
  if (type === "FILL_BLANK") {
    // FILL_BLANK reuses `options` to store the acceptable answers:
    // options[0] = primary answer, options[1..] = optional alt-spellings.
    return { type, prompt: "", audioUrl: "", options: [{ label: "" }], correctIndex: 0, explanation: "" };
  }
  if (type === "PARAGRAPH_FILL") {
    // PARAGRAPH_FILL: prompt is a paragraph with N "___" markers. options[]
    // holds N answers in order — one per blank. options[i].label is the
    // accepted answer (alts separated by "/", e.g. "color/colour").
    return {
      type,
      prompt: "",
      audioUrl: "",
      options: [],
      correctIndex: 0,
      explanation: "",
    };
  }
  if (type === "IMAGE_CHOICE") {
    return {
      type,
      prompt: "",
      audioUrl: "",
      options: [
        { label: "", imageUrl: "" },
        { label: "", imageUrl: "" },
        { label: "", imageUrl: "" },
      ],
      correctIndex: 0,
      explanation: "",
    };
  }
  if (type === "SPEAKING") {
    // SPEAKING needs no options — learner records themselves answering the
    // prompt. correctIndex stays 0 as a no-op placeholder.
    return {
      type,
      prompt: "",
      audioUrl: "",
      options: [],
      correctIndex: 0,
      explanation: "",
      cueCardPoints: [],
    };
  }
  return {
    type,
    prompt: "",
    audioUrl: "",
    options: [{ label: "" }, { label: "" }, { label: "" }],
    correctIndex: 0,
    explanation: "",
  };
};

interface FormProps {
  stage: { id: string; title: string; fromBand: number; toBand: number };
  mode: "create" | "edit";
  initial?: {
    id: string;
    title: string;
    skill: Skill;
    questions: QuestionDraft[];
    tour?: TourStepDraft[] | null;
    vocabPack?: VocabItemDraft[] | null;
  };
  // Used in create-mode when admin clicks "Thêm mini-quiz" from inside a
  // specific skill hub — pre-selects the dropdown to that skill.
  defaultSkill?: Skill;
  // When true, suppress page-level chrome (back link, page header, sticky
  // save bar) — render only the form innards so the host can embed this
  // inside a modal on the chặng admin page.
  embedded?: boolean;
  // Callbacks the modal host listens to instead of letting the form
  // navigate away on save/cancel.
  onSaved?: () => void;
  onCancel?: () => void;
}

export function MiniQuizForm({
  stage,
  mode,
  initial,
  defaultSkill,
  embedded = false,
  onSaved,
  onCancel,
}: FormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [skill, setSkill] = useState<Skill>(initial?.skill ?? defaultSkill ?? "READING");
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    initial?.questions ?? [blankQuestion("TEXT_CHOICE")],
  );
  const [tour, setTour] = useState<TourStepDraft[]>(initial?.tour ?? []);
  const [vocabPack, setVocabPack] = useState<VocabItemDraft[]>(initial?.vocabPack ?? []);
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
  const addCuePoint = (qIdx: number) => {
    setQuestions((q) =>
      q.map((qq, i) =>
        i === qIdx
          ? { ...qq, cueCardPoints: [...(qq.cueCardPoints ?? []), ""] }
          : qq,
      ),
    );
  };
  const updateCuePoint = (qIdx: number, pIdx: number, value: string) => {
    setQuestions((q) =>
      q.map((qq, i) => {
        if (i !== qIdx) return qq;
        const next = [...(qq.cueCardPoints ?? [])];
        next[pIdx] = value;
        return { ...qq, cueCardPoints: next };
      }),
    );
  };
  const removeCuePoint = (qIdx: number, pIdx: number) => {
    setQuestions((q) =>
      q.map((qq, i) =>
        i === qIdx
          ? {
              ...qq,
              cueCardPoints: (qq.cueCardPoints ?? []).filter((_, j) => j !== pIdx),
            }
          : qq,
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
      // SPEAKING needs no options — learner records an answer instead.
      if (q.type === "SPEAKING") continue;
      // PARAGRAPH_FILL: number of options must equal number of "___" markers
      // in the prompt. Caught here so admin gets a friendly toast vs the
      // generic API 400.
      if (q.type === "PARAGRAPH_FILL") {
        const blanks = (q.prompt.match(/___/g) ?? []).length;
        if (blanks === 0) {
          toast.error(
            `Câu ${i + 1}: đoạn văn chưa có chỗ trống — dùng ___ để đánh dấu chỗ điền.`,
          );
          return;
        }
        if (q.options.length !== blanks) {
          toast.error(
            `Câu ${i + 1}: có ${blanks} chỗ trống nhưng ${q.options.length} đáp án — phải khớp.`,
          );
          return;
        }
        for (let j = 0; j < q.options.length; j++) {
          if (!q.options[j].label.trim()) {
            toast.error(`Câu ${i + 1}: chỗ trống #${j + 1} chưa có đáp án.`);
            return;
          }
        }
        continue;
      }
      // FILL_BLANK accepts ≥ 1 valid answer (primary + optional variants);
      // choice-type questions still need ≥ 2 options to be answerable.
      const minOpts = q.type === "FILL_BLANK" ? 1 : 2;
      if (q.options.length < minOpts) {
        toast.error(
          q.type === "FILL_BLANK"
            ? `Câu ${i + 1} chưa nhập đáp án.`
            : `Câu ${i + 1} cần ≥ 2 đáp án.`,
        );
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
      // Strip empty rows from the vocab pack — admin may leave half-typed
      // rows when navigating away.
      const cleanedVocabPack = vocabPack
        .map((v) => ({
          term: v.term.trim(),
          definition: v.definition.trim(),
          example: v.example?.trim() || undefined,
        }))
        .filter((v) => v.term && v.definition);
      const body = {
        bandStageId: stage.id,
        skill,
        title,
        bandClimbTips: tour.length > 0 ? tour : null,
        vocabPack: cleanedVocabPack.length > 0 ? cleanedVocabPack : null,
        questions: questions.map((q) => ({
          type: q.type,
          prompt: q.prompt,
          audioUrl: q.audioUrl?.trim() || undefined,
          options: q.options.map((o) => ({
            label: o.label,
            imageUrl: o.imageUrl?.trim() || undefined,
          })),
          correctIndex: q.correctIndex,
          explanation: q.explanation?.trim() || undefined,
          // Strip empty rows so a half-filled Part-2 cue card doesn't leak
          // empty bullets into the player.
          cueCardPoints:
            q.type === "SPEAKING"
              ? (q.cueCardPoints ?? [])
                  .map((p) => p.trim())
                  .filter(Boolean)
              : undefined,
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
        body: JSON.stringify(
          mode === "create"
            ? body
            : {
                title,
                skill,
                questions: body.questions,
                bandClimbTips: body.bandClimbTips,
                vocabPack: body.vocabPack,
              },
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi");
      toast.success(mode === "create" ? "Đã tạo mini-quiz." : "Đã lưu.");
      if (embedded && onSaved) {
        onSaved();
      } else {
        router.push(`/admin/band-climber/${stage.id}`);
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={embedded ? "space-y-4" : "max-w-4xl space-y-4"}>
      {!embedded && (
        <>
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
        </>
      )}

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

      {/* Bee tour editor — admin authors the 🐝 hướng dẫn shown before the
          quiz starts. Empty list = no overlay, quiz launches straight away. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bee tour — hướng dẫn trước khi làm quiz</CardTitle>
        </CardHeader>
        <CardContent>
          <BandClimbToursEditor steps={tour} onChange={setTour} />
        </CardContent>
      </Card>

      {/* Vocab pack — admin curates a short word list shown to learners on
          the pre-quiz preview screen. Empty list = no preview screen. */}
      <Card className="border-2 border-emerald-200">
        <CardHeader>
          <CardTitle className="text-base inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" /> File từ vựng cho bài này
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Hiện trước khi user vào quiz. Bấm 1 lần là user import được nguyên file vào "Học từ"
            thành bộ flashcard riêng. Để trống = không có màn hình preview.
          </p>
        </CardHeader>
        <CardContent>
          <VocabPackEditor items={vocabPack} onChange={setVocabPack} />
        </CardContent>
      </Card>

      {/* Questions list */}
      <div className="space-y-3">
        {questions.map((q, idx) => (
          <Card key={idx} className="border-2 border-honey/30">
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-honey text-ink text-sm font-bold">
                    {idx + 1}
                  </span>
                  Câu {idx + 1}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({q.type === "IMAGE_CHOICE"
                      ? "Ảnh"
                      : q.type === "FILL_BLANK"
                        ? "Điền chỗ trống"
                        : q.type === "PARAGRAPH_FILL"
                          ? "Đoạn văn điền từ"
                          : q.type === "SPEAKING"
                            ? "Ghi âm"
                            : "Văn bản"})
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
                  {q.type === "FILL_BLANK" && (
                    <span className="ml-1 normal-case text-[10px] font-normal text-amber-600">
                      — dùng <code>___</code> (3 underscores) để đánh dấu chỗ điền
                    </span>
                  )}
                  {q.type === "PARAGRAPH_FILL" && (
                    <span className="ml-1 normal-case text-[10px] font-normal text-rose-600">
                      — đoạn văn nhiều câu; mỗi chỗ điền dùng <code>___</code>. Đếm số <code>___</code> = số đáp án bên dưới.
                    </span>
                  )}
                  {q.type === "SPEAKING" && (
                    <span className="ml-1 normal-case text-[10px] font-normal text-leaf-deep">
                      — user sẽ ghi âm trả lời, không có đáp án đúng/sai
                    </span>
                  )}
                </span>
                {q.type === "PARAGRAPH_FILL" ? (
                  <textarea
                    value={q.prompt}
                    onChange={(e) =>
                      updateQuestion(idx, { prompt: e.target.value })
                    }
                    placeholder={
                      "VD: When I ___ a child, I lived in a small ___. Every morning my father ___ me to school by bicycle..."
                    }
                    className="block w-full min-h-[120px] rounded-md border-2 border-input bg-background px-3 py-2 text-sm leading-relaxed focus:border-primary focus:outline-none"
                  />
                ) : (
                  <Input
                    value={q.prompt}
                    onChange={(e) => updateQuestion(idx, { prompt: e.target.value })}
                    placeholder={
                      q.type === "IMAGE_CHOICE"
                        ? 'VD: Đâu là "cà phê"?'
                        : q.type === "FILL_BLANK"
                          ? "VD: He ___ to school every day."
                          : q.type === "SPEAKING"
                            ? "VD: Tell me about your hometown."
                            : 'VD: Chọn nghĩa đúng của "coffee"'
                    }
                  />
                )}
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

              {q.type === "SPEAKING" ? (
                <>
                  <div className="rounded-xl border-2 border-leaf/30 bg-leaf-tint/40 p-3 text-sm text-ink">
                    <div className="font-bold text-leaf-deep inline-flex items-center gap-1.5">
                      <Mic className="h-4 w-4" /> Dạng ghi âm
                    </div>
                    <p className="text-xs text-leaf-deep mt-1">
                      User ghi âm trả lời — AI sẽ chấm pronunciation + grammar ngay sau khi user
                      nói xong. Khi kết thúc cả quiz, user nghe lại được audio từng câu và được
                      chấm điểm tổng IELTS y chang phần Speaking luyện tập.
                    </p>
                  </div>
                  {/* Optional IELTS Part-2 cue card. Bullet points filled = the
                      player runs the 1-min-prep + 2-min-speak Part 2 flow on
                      this question; bullets empty = standard Part 1/3 record
                      flow. */}
                  <div className="rounded-xl border-2 border-honey/40 bg-honey-tint/40 dark:bg-honey/10 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="font-bold text-honey-deep dark:text-honey inline-flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4" /> Speaking Part 2 — Cue card (tùy chọn)
                      </div>
                      <span className="text-[10px] text-honey-deep dark:text-honey">
                        {(q.cueCardPoints?.length ?? 0) > 0
                          ? `Đã bật — ${q.cueCardPoints?.length} gạch đầu dòng`
                          : "Để trống = Part 1/3 thường"}
                      </span>
                    </div>
                    <p className="text-[11px] text-honey-deep dark:text-honey leading-snug">
                      Thêm các bullet "You should say" — khi user vào quiz sẽ có{" "}
                      <strong>1 phút chuẩn bị</strong> rồi <strong>2 phút nói tự động ghi âm</strong>{" "}
                      y chang Speaking Part 2 luyện tập. AI vẫn chấm theo 4 tiêu chí IELTS như câu
                      Speaking thường.
                    </p>
                    {(q.cueCardPoints ?? []).map((point, pIdx) => (
                      <div key={pIdx} className="flex items-center gap-2">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-honey text-ink text-xs font-bold">
                          {pIdx + 1}
                        </span>
                        <Input
                          value={point}
                          onChange={(e) => updateCuePoint(idx, pIdx, e.target.value)}
                          placeholder="VD: When it happened"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-600 shrink-0"
                          onClick={() => removeCuePoint(idx, pIdx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    {(q.cueCardPoints?.length ?? 0) < 6 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-honey/50 text-honey-deep hover:bg-honey-tint"
                        onClick={() => addCuePoint(idx)}
                      >
                        <Plus className="h-3 w-3" /> Thêm gạch đầu dòng
                      </Button>
                    )}
                  </div>
                </>
              ) : q.type === "FILL_BLANK" ? (
                <FillBlankAnswers
                  options={q.options}
                  onChange={(opts) => updateQuestion(idx, { options: opts })}
                />
              ) : q.type === "PARAGRAPH_FILL" ? (
                <ParagraphFillAnswers
                  prompt={q.prompt}
                  options={q.options}
                  onChange={(opts) => updateQuestion(idx, { options: opts })}
                />
              ) : (
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
                            isCorrect ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
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
              )}

              {/* Explanation — shown to learners in the verdict bar after they
                  check. Especially valuable for wrong answers so they walk
                  away knowing WHY, not just what. For SPEAKING this doubles
                  as a target-band/focus hint for the inline grader. */}
              <label className="block">
                <span className="text-xs font-bold uppercase text-amber-700 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  {q.type === "SPEAKING"
                    ? "Gợi ý chấm điểm cho AI (tùy chọn)"
                    : "Giải thích đáp án (tùy chọn)"}
                </span>
                <textarea
                  value={q.explanation ?? ""}
                  onChange={(e) => updateQuestion(idx, { explanation: e.target.value })}
                  placeholder={
                    q.type === "SPEAKING"
                      ? 'VD: "Mục tiêu band 5.5, tập trung kiểm tra thì quá khứ + từ vựng về du lịch."'
                      : 'VD: "Sai vì \'goes\' chỉ dùng cho ngôi thứ 3 số ít. Đúng phải là \'go\' với chủ ngữ \'they\'."'
                  }
                  rows={2}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y min-h-[60px]"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {q.type === "SPEAKING"
                    ? "Hint này được nhét vào prompt khi AI chấm câu speaking — giúp AI biết câu hỏi đang test cái gì."
                    : "Hiện ngay khi user kiểm tra — giúp user hiểu vì sao sai/đúng để học sâu hơn."}
                </p>
              </label>
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
        <Button variant="outline" onClick={() => addQuestion("FILL_BLANK")}>
          <Pencil className="h-4 w-4" /> Thêm câu — điền chỗ trống
        </Button>
        <Button
          variant="outline"
          onClick={() => addQuestion("PARAGRAPH_FILL")}
          className="border-rose-300 text-rose-700 hover:bg-rose-50"
        >
          <Sparkles className="h-4 w-4" /> Thêm câu — đoạn văn điền từ (Writing)
        </Button>
        <Button
          variant="outline"
          onClick={() => addQuestion("SPEAKING")}
          className="border-leaf/40 text-leaf-deep hover:bg-leaf-tint/50"
        >
          <Mic className="h-4 w-4" /> Thêm câu — ghi âm (Speaking)
        </Button>
      </div>

      {/* Save */}
      <div
        className={
          embedded
            ? "flex justify-end gap-2 pt-2"
            : "sticky bottom-2 z-10 flex justify-end gap-2 rounded-2xl border bg-card p-3 shadow-md"
        }
      >
        {embedded ? (
          <Button variant="outline" onClick={() => onCancel?.()} disabled={saving}>
            Hủy
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href={`/admin/band-climber/${stage.id}`}>Hủy</Link>
          </Button>
        )}
        <Button onClick={save} disabled={saving} variant="brand">
          {saving ? "Đang lưu..." : mode === "create" ? "Tạo mini-quiz" : "Lưu thay đổi"}
        </Button>
      </div>
    </div>
  );
}

/**
 * FILL_BLANK answer editor: options[0] is the primary correct answer; the
 * comma-separated textarea below lets admin add accepted alt-spellings
 * (e.g. "color, colour" or "30, thirty"). All variants are stored as
 * additional option rows so the API stays uniform.
 */
function FillBlankAnswers({
  options,
  onChange,
}: {
  options: OptionDraft[];
  onChange: (opts: OptionDraft[]) => void;
}) {
  const primary = options[0]?.label ?? "";
  const alts = options.slice(1).map((o) => o.label).join(", ");

  return (
    <div className="space-y-2 rounded-xl border-2 border-emerald-200 bg-emerald-50/30 p-3">
      <label className="block">
        <span className="text-xs font-bold uppercase text-emerald-700 flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Đáp án chính
        </span>
        <Input
          value={primary}
          onChange={(e) => {
            const next = [...options];
            if (next.length === 0) next.push({ label: e.target.value });
            else next[0] = { ...next[0], label: e.target.value };
            onChange(next);
          }}
          placeholder="VD: goes"
        />
      </label>
      <label className="block">
        <span className="text-xs font-bold uppercase text-muted-foreground">
          Đáp án khác chấp nhận (tùy chọn)
        </span>
        <Input
          value={alts}
          onChange={(e) => {
            const variants = e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
              .map((label) => ({ label }));
            const head = options[0] ?? { label: "" };
            onChange([head, ...variants]);
          }}
          placeholder='VD: "go, Goes" — cách nhau dấu phẩy'
        />
        <p className="text-[10px] text-muted-foreground mt-1">
          So sánh không phân biệt hoa/thường và khoảng trắng đầu/cuối.
        </p>
      </label>
    </div>
  );
}

/**
 * PARAGRAPH_FILL answer editor — one row per "___" marker in the prompt.
 * Auto-syncs options[] length to the blank count: typing a new ___ in the
 * paragraph adds an empty row; deleting one removes the trailing row.
 *
 * Per blank, admin types the accepted answer. Alternates use "/" separator
 * matching the existing Reading form-completion convention, e.g.
 * "color/colour" or "1/one".
 */
function ParagraphFillAnswers({
  prompt,
  options,
  onChange,
}: {
  prompt: string;
  options: OptionDraft[];
  onChange: (opts: OptionDraft[]) => void;
}) {
  const blankCount = (prompt.match(/___/g) ?? []).length;
  // Sync options[].length to blankCount on the fly so admin doesn't have
  // to remember to "add answer" manually.
  if (options.length !== blankCount) {
    // Pad with empty rows or truncate excess — defer via microtask so we
    // don't setState during render of the parent.
    queueMicrotask(() => {
      const next = options.slice(0, blankCount);
      while (next.length < blankCount) next.push({ label: "" });
      onChange(next);
    });
  }

  if (blankCount === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-rose-300 bg-rose-50/30 p-4 text-sm text-rose-700">
        Đoạn văn chưa có chỗ trống nào. Gõ <code className="font-mono font-bold">___</code> (3 underscore) vào đề ở phía trên để tạo chỗ điền.
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border-2 border-rose-200 bg-rose-50/30 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase text-rose-700 flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Đáp án cho {blankCount} chỗ trống
        </span>
        <span className="text-[10px] text-muted-foreground">
          Nhiều dạng đúng: phân tách bởi <code className="font-mono">/</code>
        </span>
      </div>
      {Array.from({ length: blankCount }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-rose-500 text-white text-xs font-extrabold">
            {i + 1}
          </span>
          <Input
            value={options[i]?.label ?? ""}
            onChange={(e) => {
              const next = [...options];
              while (next.length <= i) next.push({ label: "" });
              next[i] = { ...next[i], label: e.target.value };
              onChange(next);
            }}
            placeholder={`Đáp án cho chỗ trống #${i + 1} (vd: "was" hoặc "color/colour")`}
          />
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground mt-1">
        So sánh không phân biệt hoa/thường và khoảng trắng đầu/cuối. User phải điền ĐÚNG TẤT CẢ {blankCount} chỗ mới được tính là correct.
      </p>
    </div>
  );
}

/**
 * Vocab pack editor — admin adds a list of {term, definition, example}
 * rows that learners can preview before the quiz starts and one-tap
 * import into their personal flashcard library. Up to 80 items per pack.
 */
function VocabPackEditor({
  items,
  onChange,
}: {
  items: VocabItemDraft[];
  onChange: (next: VocabItemDraft[]) => void;
}) {
  const updateAt = (i: number, patch: Partial<VocabItemDraft>) =>
    onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const removeAt = (i: number) => onChange(items.filter((_, j) => j !== i));
  const add = () =>
    onChange([...items, { term: "", definition: "", example: "" }]);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = items.slice();
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {items.length === 0
            ? "Chưa có từ nào — bấm Thêm từ để bắt đầu, hoặc bỏ qua nếu bài này không cần file từ vựng."
            : `${items.length} từ — tối đa 80.`}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          disabled={items.length >= 80}
          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
        >
          <Plus className="h-4 w-4" /> Thêm từ
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center text-xs text-muted-foreground">
          Chưa có từ vựng.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it, i) => (
            <div
              key={i}
              className="rounded-lg border bg-card p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Từ {i + 1}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    className="h-7 w-7 p-0"
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => move(i, i + 1)}
                    disabled={i === items.length - 1}
                    className="h-7 w-7 p-0"
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeAt(i)}
                    className="h-7 w-7 p-0 text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">
                    Từ / cụm tiếng Anh
                  </span>
                  <Input
                    value={it.term}
                    onChange={(e) => updateAt(i, { term: e.target.value })}
                    placeholder="VD: pollinator"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">
                    Nghĩa tiếng Việt
                  </span>
                  <Input
                    value={it.definition}
                    onChange={(e) => updateAt(i, { definition: e.target.value })}
                    placeholder="VD: loài thụ phấn (n)"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                  Câu ví dụ tiếng Anh (tuỳ chọn)
                </span>
                <Input
                  value={it.example ?? ""}
                  onChange={(e) => updateAt(i, { example: e.target.value })}
                  placeholder="VD: Bees are vital pollinators for many crops."
                />
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
