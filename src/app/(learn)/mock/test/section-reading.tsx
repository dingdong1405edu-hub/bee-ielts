"use client";
import { ReadingShell, type ShellPart, type ShellQ } from "@/components/learn/reading-shell";

type Q = ShellQ;

export function MockReading({
  passages,
  timeLimit,
  onDone,
}: {
  passages: { id: string; title: string; level: string; passage: string; imageUrl?: string | null; questions: Q[] }[];
  timeLimit: number;
  onDone: (answers: Record<string, string>) => void;
}) {
  const parts: ShellPart[] = passages.map((p) => ({
    id: p.id,
    title: p.title,
    level: p.level,
    passage: p.passage,
    imageUrl: p.imageUrl,
    questions: p.questions,
  }));
  return (
    <ReadingShell
      testTitle={`IELTS Mock · Reading`}
      parts={parts}
      timeLimit={timeLimit}
      onSubmit={(ans) => onDone(ans)}
    />
  );
}
