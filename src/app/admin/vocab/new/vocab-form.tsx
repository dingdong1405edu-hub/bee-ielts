"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Trash2 } from "lucide-react";

type ExType = "translate" | "match" | "type";
type Ex = { type: ExType; prompt: string; options: string[]; answer: string };
type Lesson = { title: string; order: number; exercises: Ex[] };

const blankEx = (): Ex => ({ type: "translate", prompt: "", options: ["", "", "", ""], answer: "" });
const blankLesson = (order: number): Lesson => ({ title: "", order, exercises: [blankEx()] });

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function VocabForm({ units }: { units: { id: string; title: string; level: string }[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">(units.length ? "existing" : "new");
  const [unitId, setUnitId] = useState(units[0]?.id ?? "");
  const [unitTitle, setUnitTitle] = useState("");
  const [level, setLevel] = useState("A1");
  const [unitOrder, setUnitOrder] = useState(1);
  const [lessons, setLessons] = useState<Lesson[]>([blankLesson(1)]);

  const patchLesson = (li: number, patch: Partial<Lesson>) =>
    setLessons((ls) => ls.map((l, i) => (i === li ? { ...l, ...patch } : l)));

  const patchEx = (li: number, ei: number, patch: Partial<Ex>) =>
    setLessons((ls) =>
      ls.map((l, i) =>
        i === li
          ? { ...l, exercises: l.exercises.map((e, j) => (j === ei ? { ...e, ...patch } : e)) }
          : l,
      ),
    );

  const submit = async () => {
    if (mode === "new" && !unitTitle.trim()) return toast.error("Nhập tên unit");
    if (mode === "existing" && !unitId) return toast.error("Chọn unit");
    for (const l of lessons) {
      if (!l.title.trim()) return toast.error("Mỗi bài học cần có tiêu đề");
      for (const e of l.exercises) {
        if (!e.prompt.trim() || !e.answer.trim())
          return toast.error("Mỗi câu cần có đề bài và đáp án");
        if (e.type !== "type" && e.options.filter((o) => o.trim()).length < 2)
          return toast.error("Câu trắc nghiệm cần ít nhất 2 lựa chọn");
      }
    }

    const payloadLessons = lessons.map((l) => ({
      title: l.title.trim(),
      order: l.order,
      exercises: l.exercises.map((e) =>
        e.type === "type"
          ? { type: "type", prompt: e.prompt.trim(), answer: e.answer.trim() }
          : {
              type: e.type,
              prompt: e.prompt.trim(),
              options: e.options.map((o) => o.trim()).filter(Boolean),
              answer: e.answer.trim(),
            },
      ),
    }));
    const body =
      mode === "new"
        ? { mode: "new", unitTitle: unitTitle.trim(), level, order: unitOrder, lessons: payloadLessons }
        : { mode: "existing", unitId, lessons: payloadLessons };

    setLoading(true);
    try {
      const res = await fetch("/api/admin/vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi");
      toast.success("Đã lưu bài học");
      router.push("/admin/vocab");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Thêm bài học Vocabulary</h1>

      <Card>
        <CardHeader>
          <CardTitle>Unit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "existing" ? "default" : "outline"}
              size="sm"
              disabled={!units.length}
              onClick={() => setMode("existing")}
            >
              Unit có sẵn
            </Button>
            <Button
              type="button"
              variant={mode === "new" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("new")}
            >
              Tạo unit mới
            </Button>
          </div>

          {mode === "existing" ? (
            <div>
              <Label>Chọn unit</Label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    [{u.level}] {u.title}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>Tên unit</Label>
                <Input value={unitTitle} onChange={(e) => setUnitTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Level</Label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    {LEVELS.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Thứ tự (order)</Label>
                  <Input
                    type="number"
                    value={unitOrder}
                    onChange={(e) => setUnitOrder(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {lessons.map((lesson, li) => (
        <Card key={li}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Bài học {li + 1}</CardTitle>
              {lessons.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLessons((ls) => ls.filter((_, i) => i !== li))}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <div>
                <Label>Tiêu đề</Label>
                <Input
                  value={lesson.title}
                  onChange={(e) => patchLesson(li, { title: e.target.value })}
                />
              </div>
              <div>
                <Label>Order</Label>
                <Input
                  type="number"
                  value={lesson.order}
                  onChange={(e) => patchLesson(li, { order: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            {lesson.exercises.map((ex, ei) => (
              <div key={ei} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Câu {ei + 1}</span>
                  {lesson.exercises.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        patchLesson(li, {
                          exercises: lesson.exercises.filter((_, j) => j !== ei),
                        })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
                <div>
                  <Label>Loại</Label>
                  <select
                    value={ex.type}
                    onChange={(e) => patchEx(li, ei, { type: e.target.value as ExType })}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="translate">Translate (chọn nghĩa)</option>
                    <option value="match">Match (ghép từ)</option>
                    <option value="type">Type (gõ đáp án)</option>
                  </select>
                </div>
                <div>
                  <Label>Đề bài</Label>
                  <Textarea
                    value={ex.prompt}
                    onChange={(e) => patchEx(li, ei, { prompt: e.target.value })}
                    placeholder="VD: Translate: 'Xin chào'"
                  />
                </div>
                {ex.type !== "type" && (
                  <div className="space-y-2">
                    <Label>Lựa chọn (tối đa 4)</Label>
                    {ex.options.map((opt, oi) => (
                      <Input
                        key={oi}
                        placeholder={`Lựa chọn ${oi + 1}`}
                        value={opt}
                        onChange={(e) => {
                          const options = [...ex.options];
                          options[oi] = e.target.value;
                          patchEx(li, ei, { options });
                        }}
                      />
                    ))}
                  </div>
                )}
                <div>
                  <Label>Đáp án đúng</Label>
                  <Input
                    value={ex.answer}
                    onChange={(e) => patchEx(li, ei, { answer: e.target.value })}
                    placeholder={
                      ex.type === "type" ? "Đáp án (chữ thường)" : "Chép chính xác 1 lựa chọn"
                    }
                  />
                </div>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                patchLesson(li, { exercises: [...lesson.exercises, blankEx()] })
              }
            >
              <Plus className="h-4 w-4" /> Thêm câu
            </Button>
          </CardContent>
        </Card>
      ))}

      <Button
        variant="outline"
        onClick={() => setLessons((ls) => [...ls, blankLesson(ls.length + 1)])}
      >
        <Plus className="h-4 w-4" /> Thêm bài học
      </Button>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={() => router.push("/admin/vocab")}>
          Huỷ
        </Button>
        <Button onClick={submit} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Lưu
        </Button>
      </div>
    </div>
  );
}
