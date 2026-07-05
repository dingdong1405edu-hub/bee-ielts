"use client";

/**
 * PaperExamShell — the student "làm bài" view for a teacher's PDF-based
 * assignment, styled like the native Reading exam: a full-screen split pane with
 * the đề bài (PDF) on the left and an answer sheet on the right, a top bar with
 * timer + Submit, and a mobile Đề bài / Câu hỏi tab toggle.
 *
 * Presentational + controlled — ExamWorkspace owns the state (answers, timer,
 * anti-cheat, submit) and passes it in, so all the logic stays in one place.
 */
import { useState } from "react";
import { Clock, FileText, Headphones, Loader2, Send, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface PaperQuestion {
  id: string;
  type: string;
  prompt: string;
  options: string[] | null;
  displayNumber?: number | null;
}

interface Props {
  title: string;
  className: string;
  pdfUrl?: string;
  audioUrl?: string | null;
  questions: PaperQuestion[];
  answers: Record<string, string>;
  onAnswer: (id: string, value: string) => void;
  remaining: number | null; // seconds; null = unlimited
  submitting: boolean;
  isManager: boolean;
  antiCheat: boolean;
  cheatCount: number;
  onSubmit: () => void;
}

function fmt(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${String(ss).padStart(2, "0")}`;
}

export function PaperExamShell(p: Props) {
  const [view, setView] = useState<"paper" | "questions">("paper");
  const timeLow = p.remaining !== null && p.remaining <= 60;
  const answered = Object.keys(p.answers).filter((k) => p.answers[k]?.trim()).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* TOP BAR */}
      <header className="flex items-center justify-between gap-2 border-b bg-card px-3 py-2 md:gap-3 md:px-6 md:py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg gradient-brand text-xs font-extrabold text-white md:h-8 md:w-8 md:text-sm">
            B
          </div>
          <div className="min-w-0 truncate text-xs font-bold md:text-sm">
            <span className="hidden text-muted-foreground sm:inline">{p.className} / </span>
            <span>{p.title}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 md:gap-3">
          {p.antiCheat && (
            <Badge
              variant="outline"
              className={cn("gap-1", p.cheatCount > 0 ? "border-amber-400 text-amber-600" : "text-muted-foreground")}
            >
              <ShieldAlert className="h-3.5 w-3.5" /> {p.cheatCount}
            </Badge>
          )}
          <div className="flex items-center gap-1 text-xs font-extrabold tabular-nums md:text-base">
            <Clock className="h-4 w-4 text-muted-foreground md:h-5 md:w-5" />
            <span className={cn(timeLow && "text-destructive")}>
              {p.remaining === null ? "∞" : fmt(p.remaining)}
            </span>
          </div>
          <Button
            onClick={p.onSubmit}
            disabled={p.submitting || p.isManager}
            size="sm"
            className="h-8 rounded-xl bg-foreground px-3 text-xs text-background hover:bg-foreground/90 md:h-9 md:px-4 md:text-sm"
          >
            {p.submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <>Nộp bài <Send className="h-3.5 w-3.5" /></>}
          </Button>
        </div>
      </header>

      {p.isManager && (
        <div className="border-b bg-primary/5 px-4 py-1.5 text-center text-xs text-primary">
          Bạn đang <strong>xem trước</strong> với vai trò giáo viên — không tính giờ, không lưu bài.
        </div>
      )}

      {/* Mobile tab toggle */}
      <div className="flex border-b bg-card md:hidden">
        <button
          onClick={() => setView("paper")}
          className={cn("flex-1 py-2 text-sm font-bold", view === "paper" ? "border-b-2 border-primary text-primary" : "text-muted-foreground")}
        >
          <FileText className="mr-1 inline h-4 w-4" /> Đề bài
        </button>
        <button
          onClick={() => setView("questions")}
          className={cn("flex-1 py-2 text-sm font-bold", view === "questions" ? "border-b-2 border-primary text-primary" : "text-muted-foreground")}
        >
          Câu hỏi
        </button>
      </div>

      {/* SPLIT PANE */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: đề bài (PDF + audio). Mobile: full-width single pane (flex-1);
            desktop: fixed 55% (flex-none overrides the mobile grow). */}
        <div
          className={cn(
            "flex-col overflow-hidden md:flex md:w-[55%] md:flex-none md:border-r",
            view === "paper" ? "flex flex-1" : "hidden",
          )}
        >
          <PaperPane pdfUrl={p.pdfUrl} audioUrl={p.audioUrl} />
        </div>

        {/* RIGHT: answer sheet */}
        <div
          className={cn(
            "overflow-y-auto md:block md:w-[45%] md:flex-none",
            view === "questions" ? "block flex-1" : "hidden",
          )}
        >
          <AnswerSheet questions={p.questions} answers={p.answers} onAnswer={p.onAnswer} />
        </div>
      </div>

      {/* BOTTOM BAR */}
      <footer className="flex items-center justify-between gap-3 border-t bg-card px-4 py-2.5">
        <span className="text-sm text-muted-foreground">
          Đã trả lời {answered}/{p.questions.length}
        </span>
        <Button onClick={p.onSubmit} disabled={p.submitting || p.isManager} variant="brand" className="rounded-full min-w-[130px]">
          {p.submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Nộp bài"}
        </Button>
      </footer>
    </div>
  );
}

function PaperPane({ pdfUrl, audioUrl }: { pdfUrl?: string; audioUrl?: string | null }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {audioUrl && (
        <div className="border-b bg-muted/30 px-4 py-2.5">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Headphones className="h-3.5 w-3.5" /> Bài nghe
          </div>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls src={audioUrl} className="w-full" />
        </div>
      )}
      {pdfUrl ? (
        <>
          <iframe src={pdfUrl} title="Đề bài" className="w-full flex-1 bg-white" />
          <div className="border-t bg-card px-4 py-1.5 text-right">
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-primary hover:underline">
              Mở đề trong tab mới ↗
            </a>
          </div>
        </>
      ) : (
        <div className="grid flex-1 place-items-center text-sm text-muted-foreground">Không có đề bài.</div>
      )}
    </div>
  );
}

function AnswerSheet({
  questions,
  answers,
  onAnswer,
}: {
  questions: PaperQuestion[];
  answers: Record<string, string>;
  onAnswer: (id: string, value: string) => void;
}) {
  return (
    <div className="mx-auto max-w-xl space-y-3 p-4 md:p-6">
      <div className="mb-1 text-sm font-semibold text-muted-foreground">
        Đọc đề bên trái rồi chọn/điền đáp án:
      </div>
      {questions.map((q, i) => {
        const num = q.displayNumber ?? i + 1;
        const val = answers[q.id] ?? "";
        const hasOptions = !!q.options && q.options.length > 0;
        // Paper prompts are "Câu N" placeholders (the real text is in the PDF) —
        // hide those so the sheet stays clean; show any real prompt.
        const showPrompt = q.prompt && !/^Câu\s*\d+\s*$/i.test(q.prompt);
        return (
          <div key={q.id} className="flex items-start gap-3 rounded-xl border bg-card p-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sage-600 text-sm font-extrabold text-white">
              {num}
            </span>
            <div className="min-w-0 flex-1">
              {showPrompt && <p className="mb-2 text-sm font-medium">{q.prompt}</p>}
              {hasOptions ? (
                <div className="flex flex-wrap gap-1.5">
                  {q.options!.map((opt) => {
                    const active = val === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => onAnswer(q.id, opt)}
                        className={cn(
                          "min-w-[42px] rounded-lg border-2 px-3 py-1.5 text-sm font-bold transition-colors",
                          active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50 hover:bg-accent",
                        )}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  value={val}
                  onChange={(e) => onAnswer(q.id, e.target.value)}
                  placeholder="Đáp án…"
                  className="w-full max-w-[260px] rounded-lg border-2 bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
