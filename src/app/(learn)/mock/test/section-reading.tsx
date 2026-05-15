"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen } from "lucide-react";
import { formatDuration, cn } from "@/lib/utils";
import { ReadingGroupHeader, groupStartFor } from "@/components/learn/reading-group-header";

type Q = {
  id: string;
  type: "MCQ" | "FILL_BLANK" | "TRUE_FALSE" | "TRUE_FALSE_NOT_GIVEN" | "MATCHING" | "MATCHING_HEADINGS" | "MATCHING_INFO" | "MATCHING_FEATURES" | "MATCHING_SENTENCE_ENDINGS" | "SHORT_ANSWER";
  prompt: string;
  options: string[] | null;
  correctAnswer: string;
};

export function MockReading({
  title,
  passage,
  questions,
  timeLimit,
  onDone,
}: {
  title: string;
  passage: string;
  questions: Q[];
  timeLimit: number;
  onDone: (answers: Record<string, string>) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState(timeLimit);

  useEffect(() => {
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          onDone(answers);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="rounded-2xl border bg-emerald-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6" />
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">Section 2/4</div>
            <div className="font-extrabold">Reading</div>
          </div>
        </div>
        <Badge variant="outline" className="bg-white/15 border-white/30 text-white text-base px-3 py-1">
          <Clock className="h-4 w-4 mr-1" /> {formatDuration(remaining)}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] overflow-y-auto">
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-3">{title}</h3>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{passage}</div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {questions.map((q, i) => {
            const userAns = answers[q.id] || "";
            const groupStart = groupStartFor(questions, i);
            return (
              <div key={q.id}>
                {groupStart && (
                  <ReadingGroupHeader type={q.type} start={groupStart.start + 1} end={groupStart.end + 1} />
                )}
                <Card>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-primary">{i + 1}.</span>
                      <p className="font-medium flex-1">{q.prompt}</p>
                    </div>
                    {q.options ? (
                      <div className="space-y-2">
                        {q.options.map((opt) => (
                          <label
                            key={opt}
                            className={cn("flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer", userAns === opt && "border-primary bg-accent")}
                          >
                            <input
                              type="radio"
                              name={q.id}
                              value={opt}
                              checked={userAns === opt}
                              onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                              className="h-4 w-4"
                            />
                            <span className="text-sm">{opt}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <Input
                        placeholder="Câu trả lời..."
                        value={userAns}
                        onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}

          <Button onClick={() => onDone(answers)} variant="brand" size="xl" className="w-full rounded-full">
            Nộp & sang Writing →
          </Button>
        </div>
      </div>
    </div>
  );
}
