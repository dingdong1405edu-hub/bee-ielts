"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, BookOpenText } from "lucide-react";
import { cn } from "@/lib/utils";

export function GrammarPlayer({
  lessonId,
  title,
  unitTitle,
  content,
  exercises,
}: {
  lessonId: string;
  title: string;
  unitTitle: string;
  content: string;
  exercises: { type: "fill"; prompt: string; answer: string }[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);

  const correctCount = exercises.filter((e, i) => (answers[i] || "").trim().toLowerCase() === e.answer.toLowerCase()).length;

  const submit = async () => {
    setChecked(true);
    try {
      await fetch("/api/grammar/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, correctCount, total: exercises.length }),
      });
      toast.success(`Đúng ${correctCount}/${exercises.length}`);
    } catch {
      toast.error("Lưu thất bại");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <button onClick={() => router.push("/grammar")} className="text-sm text-muted-foreground hover:underline">
          ← {unitTitle}
        </button>
        <h1 className="text-2xl font-bold flex items-center gap-2 mt-1">
          <BookOpenText className="h-6 w-6 text-blue-500" />
          {title}
        </h1>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{content}</div>
        </CardContent>
      </Card>

      <h2 className="text-lg font-semibold pt-2">Bài tập</h2>
      <div className="space-y-3">
        {exercises.map((e, i) => {
          const userAns = answers[i] || "";
          const isCorrect = userAns.trim().toLowerCase() === e.answer.toLowerCase();
          return (
            <Card key={i} className={cn(checked && (isCorrect ? "border-success" : "border-destructive"))}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-primary">{i + 1}.</span>
                  <p className="flex-1">{e.prompt}</p>
                  {checked && (isCorrect ? <CheckCircle2 className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-destructive" />)}
                </div>
                <Input
                  value={userAns}
                  disabled={checked}
                  onChange={(ev) => setAnswers((a) => ({ ...a, [i]: ev.target.value }))}
                  placeholder="Câu trả lời..."
                />
                {checked && !isCorrect && (
                  <div className="text-sm text-muted-foreground">
                    Đáp án: <strong className="text-success">{e.answer}</strong>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        {!checked ? <Button size="lg" onClick={submit}>Kiểm tra</Button> : <Button onClick={() => router.push("/grammar")}>Quay lại</Button>}
      </div>
    </div>
  );
}
