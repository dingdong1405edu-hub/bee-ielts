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

type Q = {
  type: "MCQ" | "FILL_BLANK" | "TRUE_FALSE";
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

export default function NewReadingTestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("B1");
  const [timeLimit, setTimeLimit] = useState(1200);
  const [passage, setPassage] = useState("");
  const [questions, setQuestions] = useState<Q[]>([
    { type: "MCQ", prompt: "", options: ["", "", "", ""], correctAnswer: "", explanation: "" },
  ]);

  const submit = async () => {
    if (!title || !passage || questions.length === 0) {
      toast.error("Điền đủ thông tin");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, level, timeLimit, passage, questions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Đã tạo");
      router.push("/admin/reading");
    } catch (e) {
      console.error(e);
      toast.error("Lưu thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Thêm bài Reading</h1>

      <Card>
        <CardHeader><CardTitle>Thông tin</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Tiêu đề</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Level</Label>
              <select value={level} onChange={(e) => setLevel(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <Label>Thời gian (giây)</Label>
              <Input type="number" value={timeLimit} onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div>
            <Label>Passage</Label>
            <Textarea value={passage} onChange={(e) => setPassage(e.target.value)} className="min-h-[200px]" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Câu hỏi</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setQuestions([...questions, { type: "MCQ", prompt: "", options: ["", "", "", ""], correctAnswer: "", explanation: "" }])
              }
            >
              <Plus className="h-4 w-4" /> Thêm câu
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.map((q, qi) => (
            <div key={qi} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Câu {qi + 1}</span>
                <Button variant="ghost" size="sm" onClick={() => setQuestions(questions.filter((_, i) => i !== qi))}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Loại</Label>
                  <select
                    value={q.type}
                    onChange={(e) => {
                      const nq = [...questions];
                      nq[qi].type = e.target.value as Q["type"];
                      if (nq[qi].type === "TRUE_FALSE") nq[qi].options = ["True", "False"];
                      else if (nq[qi].type === "MCQ") nq[qi].options = ["", "", "", ""];
                      else nq[qi].options = [];
                      setQuestions(nq);
                    }}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="MCQ">MCQ</option>
                    <option value="FILL_BLANK">Fill blank</option>
                    <option value="TRUE_FALSE">True/False</option>
                  </select>
                </div>
              </div>
              <div>
                <Label>Câu hỏi</Label>
                <Textarea
                  value={q.prompt}
                  onChange={(e) => {
                    const nq = [...questions];
                    nq[qi].prompt = e.target.value;
                    setQuestions(nq);
                  }}
                />
              </div>
              {q.type === "MCQ" && (
                <div className="space-y-2">
                  <Label>4 lựa chọn</Label>
                  {q.options.map((opt, oi) => (
                    <Input
                      key={oi}
                      placeholder={`Lựa chọn ${oi + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const nq = [...questions];
                        nq[qi].options[oi] = e.target.value;
                        setQuestions(nq);
                      }}
                    />
                  ))}
                </div>
              )}
              <div>
                <Label>Đáp án đúng</Label>
                <Input
                  value={q.correctAnswer}
                  onChange={(e) => {
                    const nq = [...questions];
                    nq[qi].correctAnswer = e.target.value;
                    setQuestions(nq);
                  }}
                  placeholder={q.type === "TRUE_FALSE" ? "True hoặc False" : q.type === "MCQ" ? "Chép chính xác 1 trong các lựa chọn" : "Đáp án..."}
                />
              </div>
              <div>
                <Label>Giải thích (optional)</Label>
                <Textarea
                  value={q.explanation}
                  onChange={(e) => {
                    const nq = [...questions];
                    nq[qi].explanation = e.target.value;
                    setQuestions(nq);
                  }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => router.push("/admin/reading")}>Huỷ</Button>
        <Button onClick={submit} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Lưu
        </Button>
      </div>
    </div>
  );
}
