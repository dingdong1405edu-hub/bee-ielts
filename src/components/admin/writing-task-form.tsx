"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { ImageUrlField } from "./image-url-field";
import { DeleteTestButton } from "./delete-test-button";
import { BandStageSelect } from "./band-stage-select";
import { BandClimbToursEditor, type TourStepDraft } from "./band-climb-tours-editor";

/** DB-shaped writing task passed in when editing an existing record. */
export type WritingInitial = {
  id: string;
  taskType: number;
  prompt: string;
  imageUrl: string | null;
  minWords: number;
  timeLimit: number;
  bandStageId: string | null;
  bandClimbTips: TourStepDraft[];
};

/** Writing-task create/edit form. Pass `initial` to edit an existing record. */
export function WritingTaskForm({
  initial,
  defaultBandStageId,
}: {
  initial?: WritingInitial;
  defaultBandStageId?: string;
}) {
  const router = useRouter();
  const isEdit = !!initial;
  const [loading, setLoading] = useState(false);
  const [taskType, setTaskType] = useState<1 | 2>((initial?.taskType as 1 | 2) ?? 2);
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [minWords, setMinWords] = useState(initial?.minWords ?? 250);
  const [timeLimit, setTimeLimit] = useState(initial?.timeLimit ?? 2400);
  const [bandStageId, setBandStageId] = useState<string | null>(
    initial?.bandStageId ?? defaultBandStageId ?? null,
  );
  const [tips, setTips] = useState<TourStepDraft[]>(initial?.bandClimbTips ?? []);

  const submit = async () => {
    if (prompt.trim().length < 20) return toast.error("Đề bài quá ngắn (tối thiểu 20 ký tự)");
    setLoading(true);
    try {
      const res = await fetch(isEdit ? `/api/admin/writing/${initial!.id}` : "/api/admin/writing", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType,
          prompt: prompt.trim(),
          imageUrl: imageUrl.trim() || null,
          minWords,
          timeLimit,
          bandStageId,
          bandClimbTips: tips.length > 0 ? tips : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Lỗi");
      toast.success(isEdit ? "Đã lưu thay đổi" : "Đã tạo Writing task");
      router.push("/admin/writing");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">{isEdit ? "Sửa Writing Task" : "Thêm Writing Task"}</h1>
      <Card>
        <CardHeader><CardTitle>Thông tin</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Task type</Label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(Number(e.target.value) as 1 | 2)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value={1}>Task 1</option>
                <option value={2}>Task 2</option>
              </select>
            </div>
            <div>
              <Label>Min words</Label>
              <Input type="number" value={minWords} onChange={(e) => setMinWords(parseInt(e.target.value) || 150)} />
            </div>
          </div>
          <div>
            <Label>Time limit (seconds)</Label>
            <Input type="number" value={timeLimit} onChange={(e) => setTimeLimit(parseInt(e.target.value) || 1200)} />
          </div>
          <div>
            <Label>Prompt</Label>
            <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="min-h-[180px]" />
          </div>
          <ImageUrlField
            value={imageUrl}
            onChange={setImageUrl}
            aiContext={prompt.split("\n")[0]}
            label="Ảnh bìa / biểu đồ (cho Task 1)"
            hint="Ảnh biểu đồ Task 1 + ảnh bìa thẻ chọn đề. Tải ảnh từ máy, hoặc chuột phải ảnh ngoài web → “Copy image address” rồi dán vào — link sẽ tự được nạp vào hệ thống. Hoặc để AI tạo."
          />
          <BandStageSelect value={bandStageId} onChange={setBandStageId} />
        </CardContent>
      </Card>

      {bandStageId && (
        <Card>
          <CardHeader>
            <CardTitle>Bee 🐝 hướng dẫn — bài này</CardTitle>
          </CardHeader>
          <CardContent>
            <BandClimbToursEditor steps={tips} onChange={setTips} />
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => router.push("/admin/writing")}>Huỷ</Button>
        <Button onClick={submit} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Lưu thay đổi" : "Lưu"}
        </Button>
        {isEdit && (
          <div className="ml-auto">
            <DeleteTestButton
              endpoint={`/api/admin/writing/${initial!.id}`}
              name={initial!.prompt.split("\n")[0].slice(0, 60)}
              kind="Writing task"
              redirectTo="/admin/writing"
              size="default"
              label="Xoá bài này"
            />
          </div>
        )}
      </div>
    </div>
  );
}
