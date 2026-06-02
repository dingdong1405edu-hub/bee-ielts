"use client";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/**
 * Tour step shape persisted to <Test>.bandClimbTips (Json). Mirrors the
 * TourStep type consumed by BeeGuide. We keep it permissive on the admin
 * side so old/new fields coexist as the feature grows.
 */
export interface TourStepDraft {
  target: string; // "center" or a data-tour key
  /** When set, the BeeGuide spotlight will look up the question card with
   *  this id in the practice page DOM (`[data-question-id="..."]`). */
  targetQuestionId?: string | null;
  title: string;
  body: string;
  highlights?: { label: string; items: string[] }[];
  ctaLabel?: string;
}

/**
 * Admin repeater: edit the Bee 🐝 tour shown before this exercise starts
 * in the Vượt band flow. Each step has a target (center or a question
 * card), a title, a body paragraph and optional comma-separated highlight
 * chips. Pass an empty array as initial to start from scratch — leaving
 * it untouched persists `null` and falls back to the skill's default tour.
 */
export function BandClimbToursEditor({
  steps,
  onChange,
  questionChoices,
}: {
  steps: TourStepDraft[];
  onChange: (next: TourStepDraft[]) => void;
  /** Pass the test's questions (id + label) so admin can target one. */
  questionChoices?: { id: string; label: string }[];
}) {
  const updateAt = (i: number, patch: Partial<TourStepDraft>) =>
    onChange(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const removeAt = (i: number) => onChange(steps.filter((_, j) => j !== i));
  const moveUp = (i: number) => {
    if (i === 0) return;
    const next = steps.slice();
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    onChange(next);
  };
  const add = () =>
    onChange([
      ...steps,
      { target: "center", title: "", body: "", highlights: [], ctaLabel: "" },
    ]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label>Mẹo Bee 🐝 cho bài này</Label>
          <p className="text-xs text-muted-foreground">
            Mỗi bước = 1 bong bóng thoại Bee hiển thị trước khi user vào làm. Bỏ trống để dùng mẹo mặc định của kỹ năng.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-4 w-4" /> Thêm bước
        </Button>
      </div>

      {steps.length === 0 && (
        <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center text-xs text-muted-foreground">
          Chưa có bước nào — Bee sẽ dùng mẹo mặc định khi user vào bài này.
        </div>
      )}

      {steps.map((s, i) => (
        <div key={i} className="rounded-lg border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <GripVertical className="h-4 w-4" /> Bước {i + 1}
            </div>
            <div className="flex items-center gap-1">
              {i > 0 && (
                <Button type="button" size="sm" variant="ghost" onClick={() => moveUp(i)}>
                  ↑
                </Button>
              )}
              <Button type="button" size="sm" variant="ghost" onClick={() => removeAt(i)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Vị trí Bee</Label>
              <select
                value={s.targetQuestionId ? "__q" : s.target}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "__q") {
                    updateAt(i, {
                      target: "question",
                      targetQuestionId: questionChoices?.[0]?.id ?? null,
                    });
                  } else {
                    updateAt(i, { target: v, targetQuestionId: null });
                  }
                }}
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              >
                <option value="center">Giữa màn hình (lời chào / outro)</option>
                <optgroup label="Reading">
                  <option value="passage">Vùng đoạn văn</option>
                  <option value="questions">Vùng câu hỏi</option>
                </optgroup>
                <optgroup label="Listening">
                  <option value="audio">Trình phát audio</option>
                  <option value="content-image">Hình ảnh đề bài</option>
                  <option value="questions">Vùng câu hỏi (Listening)</option>
                </optgroup>
                <optgroup label="Writing">
                  <option value="prompt">Đề bài Writing</option>
                  <option value="writing-area">Vùng viết bài</option>
                </optgroup>
                <optgroup label="Speaking">
                  <option value="cuecard">Cue card Speaking</option>
                </optgroup>
                {questionChoices && questionChoices.length > 0 && (
                  <option value="__q">Chỉ vào một câu hỏi cụ thể…</option>
                )}
              </select>
            </div>
            {s.targetQuestionId !== undefined && s.targetQuestionId !== null && questionChoices && (
              <div>
                <Label className="text-xs">Chỉ vào câu</Label>
                <select
                  value={s.targetQuestionId ?? ""}
                  onChange={(e) =>
                    updateAt(i, { targetQuestionId: e.target.value || null })
                  }
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                >
                  {questionChoices.map((q, idx) => (
                    <option key={q.id} value={q.id}>
                      Câu {idx + 1} — {q.label.slice(0, 60)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs">Tiêu đề</Label>
            <Input
              value={s.title}
              onChange={(e) => updateAt(i, { title: e.target.value })}
              placeholder="VD: Mẹo 1 — Săn từ neo cứng"
            />
          </div>
          <div>
            <Label className="text-xs">Nội dung Bee nói</Label>
            <Textarea
              value={s.body}
              onChange={(e) => updateAt(i, { body: e.target.value })}
              placeholder={"VD: Câu này hỏi về năm Lorenzo phát minh hive. Từ neo là số 1851 ở đoạn B — bạn quét bài tìm con số là ra ngay."}
              className="min-h-[80px]"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Nhãn ô từ khoá (tuỳ chọn)</Label>
              <Input
                value={s.highlights?.[0]?.label ?? ""}
                onChange={(e) => {
                  const items = s.highlights?.[0]?.items ?? [];
                  updateAt(i, { highlights: e.target.value.trim() ? [{ label: e.target.value, items }] : [] });
                }}
                placeholder="VD: Từ neo trong câu này"
              />
            </div>
            <div>
              <Label className="text-xs">Các từ khoá (cách nhau bởi dấu phẩy)</Label>
              <Input
                value={s.highlights?.[0]?.items?.join(", ") ?? ""}
                onChange={(e) => {
                  const items = e.target.value.split(",").map((x) => x.trim()).filter(Boolean);
                  const label = s.highlights?.[0]?.label ?? "Từ neo";
                  updateAt(i, { highlights: items.length ? [{ label, items }] : [] });
                }}
                placeholder="VD: 1851, Lorenzo, England"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Nhãn nút Tiếp/Bắt đầu (tuỳ chọn)</Label>
            <Input
              value={s.ctaLabel ?? ""}
              onChange={(e) => updateAt(i, { ctaLabel: e.target.value })}
              placeholder="VD: Bắt đầu — chỉ dùng cho bước cuối"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
