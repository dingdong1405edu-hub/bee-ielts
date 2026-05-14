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

export default function NewWritingTaskPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [taskType, setTaskType] = useState<1 | 2>(2);
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [minWords, setMinWords] = useState(250);
  const [timeLimit, setTimeLimit] = useState(2400);

  const submit = async () => {
    if (!prompt) return toast.error("Nhập đề bài");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskType, prompt, imageUrl: imageUrl || null, minWords, timeLimit }),
      });
      if (!res.ok) throw new Error();
      toast.success("Đã tạo");
      router.push("/admin/writing");
    } catch {
      toast.error("Lưu thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Thêm Writing Task</h1>
      <Card>
        <CardHeader><CardTitle>Thông tin</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Task type</Label>
              <select value={taskType} onChange={(e) => setTaskType(Number(e.target.value) as 1 | 2)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
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
          <div>
            <Label>Image URL (chỉ cho Task 1)</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => router.push("/admin/writing")}>Huỷ</Button>
        <Button onClick={submit} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Lưu
        </Button>
      </div>
    </div>
  );
}
