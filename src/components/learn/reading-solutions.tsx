"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, Loader2, Sparkles, BookOpen, Languages, Lightbulb, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface SolutionPassage {
  id: string;
  title: string;
  passage: string;
  questions: {
    id: string;
    type: string;
    prompt: string;
    options: string[] | null;
    correctAnswer: string;
  }[];
}

type Explanation = {
  quote: string;
  keywords: string[];
  translation: string;
  reasoning: string;
  mistake?: string;
};

export function ReadingSolutions({
  passages,
  answers,
}: {
  passages: SolutionPassage[];
  answers: Record<string, string>;
}) {
  const [activePart, setActivePart] = useState(0);
  // cache: questionId -> explanation OR "loading" OR "error"
  const [cache, setCache] = useState<Record<string, Explanation | "loading" | "error">>({});
  // The question currently selected — its evidence is highlighted inside the passage.
  const [activeQId, setActiveQId] = useState<string | null>(null);

  const current = passages[activePart];

  const fetchExplain = async (qId: string) => {
    const q = current.questions.find((x) => x.id === qId);
    if (!q) return;
    if (cache[qId] && cache[qId] !== "error") return;
    setCache((c) => ({ ...c, [qId]: "loading" }));
    try {
      const res = await fetch("/api/reading/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passage: current.passage,
          questionPrompt: q.prompt,
          questionType: q.type,
          options: q.options,
          correctAnswer: q.correctAnswer,
          userAnswer: answers[q.id] || "",
        }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as Explanation;
      setCache((c) => ({ ...c, [qId]: data }));
    } catch {
      setCache((c) => ({ ...c, [qId]: "error" }));
    }
  };

  const selectQuestion = (qId: string) => {
    setActiveQId(qId);
    fetchExplain(qId);
  };

  // Auto-fetch all WRONG questions when switching to this part — staggered to avoid rate-limit
  useEffect(() => {
    setActiveQId(null);
    const wrong = current.questions.filter(
      (q) => (answers[q.id] || "").trim().toLowerCase() !== q.correctAnswer.toLowerCase(),
    );
    let delay = 0;
    for (const q of wrong) {
      if (cache[q.id]) continue;
      setTimeout(() => fetchExplain(q.id), delay);
      delay += 600;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePart]);

  const activeExplanation =
    activeQId && typeof cache[activeQId] === "object" ? (cache[activeQId] as Explanation) : undefined;

  return (
    <div className="space-y-4">
      {/* Part tabs */}
      {passages.length > 1 && (
        <div className="flex flex-wrap gap-2 border-b pb-3">
          {passages.map((p, i) => {
            const wrongCount = p.questions.filter(
              (q) => (answers[q.id] || "").trim().toLowerCase() !== q.correctAnswer.toLowerCase(),
            ).length;
            return (
              <button
                key={p.id}
                onClick={() => setActivePart(i)}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-sm font-bold border-2 transition-colors inline-flex items-center gap-1.5",
                  activePart === i ? "border-primary bg-accent/30 text-primary" : "border-border hover:border-primary/30",
                )}
              >
                <span>Part {i + 1}</span>
                {wrongCount > 0 && (
                  <span className="grid h-5 min-w-5 px-1 place-items-center rounded-full bg-destructive text-white text-[10px] font-extrabold">
                    {wrongCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Passage card — highlights the selected question's evidence */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-5 w-5 text-primary" />
            <h3 className="font-extrabold">{current.title}</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {activeExplanation
              ? "Đoạn chứa đáp án được tô vàng, key words in đậm."
              : "Bấm một câu hỏi bên dưới để xem đoạn chứa đáp án trong đề."}
          </p>
          <PassageView passage={current.passage} highlight={activeExplanation} />
        </CardContent>
      </Card>

      {/* Questions with on-demand / auto explanations */}
      <div className="space-y-3">
        {current.questions.map((q, i) => {
          const ua = answers[q.id] || "";
          const ok = ua.trim().toLowerCase() === q.correctAnswer.toLowerCase();
          const ex = cache[q.id];
          return (
            <QuestionRow
              key={q.id}
              num={i + 1}
              q={q}
              ua={ua}
              ok={ok}
              explanation={ex}
              active={activeQId === q.id}
              onSelect={() => selectQuestion(q.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Render the passage; when a question is selected, highlight its quote and bold key words. */
function PassageView({ passage, highlight }: { passage: string; highlight?: Explanation }) {
  const markRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (highlight) markRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlight]);

  const box =
    "text-[14px] leading-relaxed whitespace-pre-wrap text-foreground max-h-80 overflow-y-auto rounded-lg border bg-muted/20 p-3";

  const quote = highlight?.quote?.trim();
  const idx = quote ? passage.toLowerCase().indexOf(quote.toLowerCase()) : -1;

  if (!quote || idx === -1) {
    return <div className={box}>{passage}</div>;
  }

  const before = passage.slice(0, idx);
  const matched = passage.slice(idx, idx + quote.length);
  const after = passage.slice(idx + quote.length);
  return (
    <div className={box}>
      {before}
      <mark ref={markRef} className="rounded bg-yellow-300/80 dark:bg-yellow-500/40 px-0.5">
        <BoldKeywords text={matched} keywords={highlight?.keywords ?? []} />
      </mark>
      {after}
    </div>
  );
}

/** Wrap each keyword occurrence inside `text` in a bold/underlined span. Case-insensitive. */
function BoldKeywords({ text, keywords }: { text: string; keywords: string[] }) {
  const escaped = keywords
    .map((k) => k.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!escaped.length) return <>{text}</>;
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-extrabold underline decoration-2 decoration-amber-500">
            {p}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function QuestionRow({
  num,
  q,
  ua,
  ok,
  explanation,
  active,
  onSelect,
}: {
  num: number;
  q: SolutionPassage["questions"][number];
  ua: string;
  ok: boolean;
  explanation: Explanation | "loading" | "error" | undefined;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <Card
      className={cn(
        "border-2 cursor-pointer transition-colors",
        active
          ? "border-primary ring-2 ring-primary/30"
          : ok
            ? "border-success/40 hover:border-success"
            : "border-destructive/40 hover:border-destructive",
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-600 text-white text-xs font-extrabold">
            {num}
          </span>
          <span className="flex-1 text-sm font-medium leading-relaxed">{q.prompt}</span>
          {ok ? <CheckCircle2 className="h-5 w-5 text-success shrink-0" /> : <XCircle className="h-5 w-5 text-destructive shrink-0" />}
        </div>

        <div className="ml-8 text-sm grid sm:grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Của bạn</div>
            <div className={cn("font-semibold break-words", ok ? "text-success" : "text-destructive line-through")}>
              {ua || "(trống)"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Đáp án đúng</div>
            <div className="font-semibold text-success break-words">{q.correctAnswer}</div>
          </div>
        </div>

        <div className="ml-8">
          {!explanation && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" /> Bấm để xem lời giải & đoạn chứa đáp án trong đề
            </div>
          )}
          {explanation === "loading" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> AI đang phân tích...
            </div>
          )}
          {explanation === "error" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-destructive">Lỗi tạo lời giải.</span>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect();
                }}
              >
                Thử lại
              </Button>
            </div>
          )}
          {typeof explanation === "object" && explanation && (
            <ExplanationPanel data={explanation} userIsWrong={!ok} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ExplanationPanel({ data, userIsWrong }: { data: Explanation; userIsWrong: boolean }) {
  return (
    <div className="mt-2 space-y-3 rounded-lg border bg-primary/5 p-3">
      {/* If wrong: show 'Lý do bạn sai' block first, in destructive color */}
      {userIsWrong && data.mistake && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" /> Lý do bạn sai
          </div>
          <p className="mt-1 text-sm leading-relaxed text-foreground">{data.mistake}</p>
        </div>
      )}

      <div>
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
          <BookOpen className="h-3.5 w-3.5" /> Đoạn trong bài (key words được highlight)
        </div>
        <blockquote className="mt-1 border-l-4 border-primary/40 pl-3 text-sm italic text-foreground">
          <HighlightedQuote text={data.quote} keywords={data.keywords} />
        </blockquote>
      </div>

      <div>
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
          <Languages className="h-3.5 w-3.5" /> Bản dịch
        </div>
        <p className="mt-1 text-sm text-foreground/80">{data.translation}</p>
      </div>

      <div>
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
          <Lightbulb className="h-3.5 w-3.5" /> Vì sao đáp án này
        </div>
        <p className="mt-1 text-sm text-foreground leading-relaxed">{data.reasoning}</p>
      </div>
    </div>
  );
}

/** Render the quote with each keyword substring wrapped in <mark>. Case-insensitive. */
function HighlightedQuote({ text, keywords }: { text: string; keywords: string[] }) {
  if (!keywords.length) return <span>{text}</span>;
  const escaped = keywords
    .map((k) => k.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!escaped.length) return <span>{text}</span>;
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(re);
  return (
    <span>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="rounded bg-yellow-300/80 dark:bg-yellow-500/40 px-0.5 font-semibold text-foreground"
          >
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </span>
  );
}
