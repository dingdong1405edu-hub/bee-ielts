"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Loader2, BookOpen, Headphones, PenLine, Mic, Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Skill = "reading" | "listening" | "writing" | "speaking";

const SKILL_META: { key: Skill; label: string; icon: React.ElementType; color: string }[] = [
  { key: "reading", label: "Reading", icon: BookOpen, color: "text-emerald-600" },
  { key: "listening", label: "Listening", icon: Headphones, color: "text-amber-600" },
  { key: "writing", label: "Writing", icon: PenLine, color: "text-rose-600" },
  { key: "speaking", label: "Speaking", icon: Mic, color: "text-indigo-600" },
];

export interface BandStageInitial {
  id: string;
  fromBand: number;
  toBand: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  order: number;
  reading: string;
  listening: string;
  writing: string;
  speaking: string;
}

export function BandStageForm({ initial }: { initial?: BandStageInitial }) {
  const router = useRouter();
  const isEdit = !!initial;
  const [loading, setLoading] = useState(false);

  const [fromBand, setFromBand] = useState<string>(initial ? String(initial.fromBand) : "5");
  const [toBand, setToBand] = useState<string>(initial ? String(initial.toBand) : "6");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [order, setOrder] = useState<string>(initial ? String(initial.order) : "0");
  const [reading, setReading] = useState(initial?.reading ?? "");
  const [listening, setListening] = useState(initial?.listening ?? "");
  const [writing, setWriting] = useState(initial?.writing ?? "");
  const [speaking, setSpeaking] = useState(initial?.speaking ?? "");
  const [activeSkill, setActiveSkill] = useState<Skill>("reading");
  const [preview, setPreview] = useState(false);

  const content: Record<Skill, string> = { reading, listening, writing, speaking };
  const setContent: Record<Skill, (v: string) => void> = {
    reading: setReading,
    listening: setListening,
    writing: setWriting,
    speaking: setSpeaking,
  };
  const currentText = content[activeSkill];

  const submit = async () => {
    const fb = parseFloat(fromBand);
    const tb = parseFloat(toBand);
    if (!Number.isFinite(fb) || !Number.isFinite(tb)) return toast.error("Band không hợp lệ");
    if (tb <= fb) return toast.error("Band đích phải lớn hơn band gốc");
    if (!title.trim()) return toast.error("Nhập tiêu đề");

    const body = {
      fromBand: fb,
      toBand: tb,
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      description: description.trim() || null,
      order: parseInt(order, 10) || 0,
      reading,
      listening,
      writing,
      speaking,
    };

    setLoading(true);
    try {
      const res = await fetch(
        isEdit ? `/api/admin/band-climber/${initial!.id}` : "/api/admin/band-climber",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Lỗi");
      toast.success(isEdit ? "Đã lưu thay đổi" : "Đã tạo chặng mới");
      router.push("/admin/band-climber");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!initial) return;
    if (!confirm(`Xoá chặng "${initial.title}"? Hành động này không thể hoàn tác.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/band-climber/${initial.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Xoá thất bại");
      }
      toast.success("Đã xoá");
      router.push("/admin/band-climber");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xoá thất bại");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold">
        {isEdit ? "Sửa chặng vượt band" : "Thêm chặng vượt band"}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin chặng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Band gốc</Label>
              <Input
                inputMode="decimal"
                value={fromBand}
                onChange={(e) => setFromBand(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="VD: 5"
              />
            </div>
            <div>
              <Label>Band đích</Label>
              <Input
                inputMode="decimal"
                value={toBand}
                onChange={(e) => setToBand(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="VD: 6"
              />
            </div>
            <div>
              <Label>Thứ tự</Label>
              <Input
                inputMode="numeric"
                value={order}
                onChange={(e) => setOrder(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <Label>Tiêu đề</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Từ Band 5.0 lên 6.0"
            />
          </div>
          <div>
            <Label>Phụ đề (tuỳ chọn)</Label>
            <Input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="VD: Quản lý thời gian & Nhận diện bẫy"
            />
          </div>
          <div>
            <Label>Mô tả ngắn (tuỳ chọn)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Câu mô tả mục tiêu chặng — hiển thị bên dưới tiêu đề."
              className="min-h-[80px]"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>Nội dung 4 kỹ năng</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => setPreview((v) => !v)}>
              {preview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {preview ? "Ẩn xem trước" : "Xem trước"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Mỗi tab là một kỹ năng. Hỗ trợ markdown — dùng <code>##</code>, <code>**đậm**</code>,{" "}
            <code>- gạch đầu dòng</code>, <code>1. ...</code>.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {SKILL_META.map((m) => {
              const Icon = m.icon;
              const isActive = activeSkill === m.key;
              const filled = !!content[m.key].trim();
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setActiveSkill(m.key)}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition-all ${
                    isActive
                      ? "border-primary bg-accent text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? m.color : ""}`} />
                  {m.label}
                  {!filled && <span className="text-[10px] opacity-60">trống</span>}
                </button>
              );
            })}
          </div>

          {preview ? (
            currentText.trim() ? (
              <div className="prose prose-sm max-w-none rounded-lg border bg-card p-4 dark:prose-invert">
                <ReactMarkdown>{currentText}</ReactMarkdown>
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                Chưa có nội dung cho phần này.
              </div>
            )
          ) : (
            <Textarea
              value={currentText}
              onChange={(e) => setContent[activeSkill](e.target.value)}
              className="min-h-[400px] font-mono text-[13px]"
              placeholder={`Markdown cho ${SKILL_META.find((m) => m.key === activeSkill)?.label}…\n\n## Tên mẹo\n\nMô tả ngắn.\n\n- Gạch đầu dòng 1\n- Gạch đầu dòng 2`}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => router.push("/admin/band-climber")}>
          Huỷ
        </Button>
        <Button onClick={submit} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Lưu thay đổi" : "Tạo chặng"}
        </Button>
        {isEdit && (
          <Button variant="destructive" className="ml-auto" onClick={remove} disabled={loading}>
            <Trash2 className="h-4 w-4" /> Xoá chặng
          </Button>
        )}
      </div>
    </div>
  );
}
