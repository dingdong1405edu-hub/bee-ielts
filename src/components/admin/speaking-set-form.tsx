"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { ImageUrlField } from "@/components/admin/image-url-field";
import { DeleteTestButton } from "@/components/admin/delete-test-button";
import { BandStageSelect } from "@/components/admin/band-stage-select";
import { BandClimbToursEditor, type TourStepDraft } from "@/components/admin/band-climb-tours-editor";
import { BeeLogo } from "@/components/brand";

/** DB-shaped speaking set passed in when editing an existing record. */
export type SpeakingInitial = {
  id: string;
  topic: string;
  imageUrl: string | null;
  part1Questions: string[];
  part2CueCard: { topic: string; points: string[] };
  part3Questions: string[];
  bandStageId: string | null;
  bandClimbTips: TourStepDraft[];
};

const updateAt = (arr: string[], i: number, v: string) => arr.map((x, j) => (j === i ? v : x));

/** Speaking-set create/edit form. Pass `initial` to edit an existing record. */
export function SpeakingSetForm({
  initial,
  defaultBandStageId,
}: {
  initial?: SpeakingInitial;
  defaultBandStageId?: string;
}) {
  const router = useRouter();
  const isEdit = !!initial;
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState(initial?.topic ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [part1, setPart1] = useState<string[]>(
    initial?.part1Questions?.length ? initial.part1Questions : ["", "", "", ""],
  );
  const [cueTopic, setCueTopic] = useState(initial?.part2CueCard?.topic ?? "");
  const [cuePoints, setCuePoints] = useState<string[]>(
    initial?.part2CueCard?.points?.length ? initial.part2CueCard.points : ["", "", "", ""],
  );
  const [part3, setPart3] = useState<string[]>(
    initial?.part3Questions?.length ? initial.part3Questions : ["", ""],
  );
  const [bandStageId, setBandStageId] = useState<string | null>(
    initial?.bandStageId ?? defaultBandStageId ?? null,
  );
  const [tips, setTips] = useState<TourStepDraft[]>(initial?.bandClimbTips ?? []);

  const submit = async () => {
    if (!topic.trim()) return toast.error("Nhập topic");
    const p1 = part1.map((s) => s.trim()).filter(Boolean);
    const p3 = part3.map((s) => s.trim()).filter(Boolean);
    const points = cuePoints.map((s) => s.trim()).filter(Boolean);
    if (p1.length < 1) return toast.error("Cần ít nhất 1 câu hỏi Part 1");
    if (!cueTopic.trim()) return toast.error("Nhập cue card Part 2");
    if (points.length < 1) return toast.error("Cue card cần ít nhất 1 gạch đầu dòng");
    if (p3.length < 1) return toast.error("Cần ít nhất 1 câu hỏi Part 3");

    setLoading(true);
    try {
      const res = await fetch(isEdit ? `/api/admin/speaking/${initial!.id}` : "/api/admin/speaking", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          imageUrl: imageUrl.trim() || null,
          part1Questions: p1,
          part2CueCard: { topic: cueTopic.trim(), points },
          part3Questions: p3,
          bandStageId,
          bandClimbTips: tips.length > 0 ? tips : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi");
      toast.success(isEdit ? "Đã lưu thay đổi" : "Đã tạo Speaking set");
      router.push("/admin/speaking");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">{isEdit ? "Sửa Speaking Set" : "Thêm Speaking Set"}</h1>

      <Card>
        <CardHeader><CardTitle>Thông tin chung</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Topic</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="VD: Hometown, Hobbies, Technology…" />
          </div>
          <ImageUrlField
            value={imageUrl}
            onChange={setImageUrl}
            aiContext={topic}
            label="Ảnh bìa (tuỳ chọn)"
            hint="Ảnh bìa hiển thị ở thẻ chọn đề, màn intro & Part 2. Dán URL, tải ảnh lên, hoặc để AI tạo."
          />
          <BandStageSelect value={bandStageId} onChange={setBandStageId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Part 1 — Câu hỏi cá nhân</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setPart1([...part1, ""])}>
              <Plus className="h-4 w-4" /> Thêm câu
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {part1.map((q, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm font-bold w-7 shrink-0 text-muted-foreground">{i + 1}.</span>
              <Input
                value={q}
                onChange={(e) => setPart1(updateAt(part1, i, e.target.value))}
                placeholder="VD: Where do you live?"
              />
              {part1.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => setPart1(part1.filter((_, j) => j !== i))}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Part 2 — Cue card</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Cue card topic</Label>
            <Textarea
              value={cueTopic}
              onChange={(e) => setCueTopic(e.target.value)}
              placeholder="VD: Describe a memorable holiday you took as a child."
              className="min-h-[80px]"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>You should say… (các gạch đầu dòng)</Label>
              <Button size="sm" variant="outline" onClick={() => setCuePoints([...cuePoints, ""])}>
                <Plus className="h-4 w-4" /> Thêm
              </Button>
            </div>
            {cuePoints.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm font-bold w-3 shrink-0 text-muted-foreground">•</span>
                <Input
                  value={p}
                  onChange={(e) => setCuePoints(updateAt(cuePoints, i, e.target.value))}
                  placeholder="VD: where you went"
                />
                {cuePoints.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => setCuePoints(cuePoints.filter((_, j) => j !== i))}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Part 3 — Thảo luận sâu</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setPart3([...part3, ""])}>
              <Plus className="h-4 w-4" /> Thêm câu
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {part3.map((q, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm font-bold w-7 shrink-0 text-muted-foreground">{i + 1}.</span>
              <Input
                value={q}
                onChange={(e) => setPart3(updateAt(part3, i, e.target.value))}
                placeholder="VD: Do you think family holidays are important?"
              />
              {part3.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => setPart3(part3.filter((_, j) => j !== i))}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {bandStageId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BeeLogo variant="bare" className="h-5 w-5 text-ink" /> Bee hướng dẫn — bài này
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BandClimbToursEditor steps={tips} onChange={setTips} />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => router.push("/admin/speaking")}>Huỷ</Button>
        <Button onClick={submit} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Lưu thay đổi" : "Lưu"}
        </Button>
        {isEdit && (
          <div className="ml-auto">
            <DeleteTestButton
              endpoint={`/api/admin/speaking/${initial!.id}`}
              name={initial!.topic}
              kind="Speaking set"
              redirectTo="/admin/speaking"
              size="default"
              label="Xoá bài này"
            />
          </div>
        )}
      </div>
    </div>
  );
}
