"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { formatDuration, cn, isAnswerCorrect } from "@/lib/utils";
import { TipsCard } from "@/components/learn/tips-card";
import { ReadingGroupHeader, groupStartFor } from "@/components/learn/reading-group-header";
import { ReadingComments } from "@/components/learn/reading-comments";
import { FormBlanks, MultiSelectQuestion, groupQuestions } from "@/components/learn/form-blanks";
import {
  HighlightablePassage,
  HighlightToolbar,
  type Highlight,
  type HighlightTool,
} from "@/components/learn/highlightable-passage";
import { WordTranslatePopup, type WordHint } from "@/components/learn/word-translate-popup";
import {Leaf, MascotBubble, BeeMascot } from "@/components/brand";

type Q = {
  id: string;
  type: "MCQ" | "FILL_BLANK" | "TRUE_FALSE" | "TRUE_FALSE_NOT_GIVEN" | "MATCHING" | "MATCHING_HEADINGS" | "MATCHING_INFO" | "MATCHING_FEATURES" | "MATCHING_SENTENCE_ENDINGS" | "SHORT_ANSWER";
  prompt: string;
  options: string[] | null;
  correctAnswer: string;
  explanation: string | null;
  formGroup?: string | null;
  displayNumber?: number | null;
};

export function ReadingPlayer({
  testId,
  title,
  passage,
  imageUrl,
  questions,
}: {
  testId: string;
  title: string;
  passage: string;
  imageUrl?: string | null;
  questions: Q[];
}) {
  const router = useRouter();
  const startedAtRef = useRef<number>(Date.now());
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [elapsed, setElapsed] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Highlight pen state — shared across the passage card. The active tool
  // controls cursor + click behaviour inside HighlightablePassage; the
  // highlights array stores marked ranges (persisted in component state
  // only, no DB write — same as ReadingShell / mock test).
  const [tool, setTool] = useState<HighlightTool>("none");
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  // ============= Translate mode state =============
  // We pre-fetch a word→{pos,vi} map for the WHOLE passage in one Claude
  // call the first time the user flips the toolbar into "translate" mode.
  // After that, every click is an O(1) map lookup — zero extra tokens.
  // defEn (1-line definition) is fetched lazily per click using the existing
  // single-word route since the batch map only carries pos+vi to keep the
  // response under max_tokens.
  const [translateMap, setTranslateMap] = useState<Record<string, { pos: string; vi: string }>>({});
  const [batchLoading, setBatchLoading] = useState(false);
  const batchTriedRef = useRef(false);
  const [popup, setPopup] = useState<
    | { word: string; sentence: string; x: number; y: number; loading: boolean; hint: WordHint | null }
    | null
  >(null);

  // Lazy-load batch translation when user first flips into translate mode.
  // We only run it ONCE per page mount — flipping the toggle off then on
  // again reuses the cached map.
  useEffect(() => {
    if (tool !== "translate") return;
    if (batchTriedRef.current) return;
    batchTriedRef.current = true;
    setBatchLoading(true);
    void fetch("/api/reading/translate-passage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passage, passageId: testId }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.words) setTranslateMap(d.words);
        else toast.error(d.error || "Tải bản dịch thất bại");
      })
      .catch(() => toast.error("Lỗi mạng khi tải bản dịch"))
      .finally(() => setBatchLoading(false));
  }, [tool, passage, testId]);

  // Practise — đếm xuôi thời gian đã làm, không giới hạn, không tự nộp.
  useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [submitted]);

  const handleSubmit = async () => {
    if (submitted) return;
    setSubmitted(true);
    setSubmitting(true);
    const correctCount = questions.filter(
      (q) => isAnswerCorrect(answers[q.id], q.correctAnswer, q.type),
    ).length;
    const score = (correctCount / questions.length) * 9;
    try {
      const durationSec = Math.floor((Date.now() - startedAtRef.current) / 1000);
      await fetch("/api/reading/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId, answers, correctCount, total: questions.length, durationSec }),
      });
      toast.success(`Bạn đúng ${correctCount}/${questions.length} — Band ~${score.toFixed(1)}`);
    } catch {
      toast.error("Lưu kết quả thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const correctCount = submitted
    ? questions.filter((q) => isAnswerCorrect(answers[q.id], q.correctAnswer, q.type)).length
    : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="relative overflow-hidden rounded-2xl flex items-center justify-between flex-wrap gap-3 p-4">
        
        <div className="relative">
          <button onClick={() => router.push("/reading")} className="text-sm text-muted-foreground hover:underline">
            ← Reading
          </button>
          <h1 className="text-xl md:text-2xl font-bold mt-1 flex items-center gap-2">
            <Leaf className="h-4 w-4 text-leaf shrink-0" />
            {title}
          </h1>
        </div>
        <div className="relative flex items-center gap-3 flex-wrap">
          {/* Toolbar stays visible after submit — user explicitly asked the
              translate tool to work during "chữa bài" (review) too, and
              there's no harm letting them keep highlighting at that stage. */}
          <HighlightToolbar tool={tool} setTool={setTool} />
          <Badge variant="outline" className="text-base px-3 py-1">
            <Clock className="h-4 w-4 mr-1" /> Đã làm {formatDuration(elapsed)}
          </Badge>
          {!submitted && (
            <Button onClick={handleSubmit} disabled={submitting}>
              Nộp bài
            </Button>
          )}
        </div>
      </div>

      {!submitted && (
        <MascotBubble tone="tip">
          Đọc kỹ rồi chọn đáp án — em tin anh/chị làm được! 🐝
        </MascotBubble>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] overflow-y-auto">
          <CardContent className="p-6 prose prose-sm max-w-none">
            <h3 className="font-semibold text-lg mb-3">Passage</h3>
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="not-prose mb-4 w-full rounded-lg border bg-muted/30 object-contain max-h-80" />
            )}
            <HighlightablePassage
              passage={passage}
              highlights={highlights}
              tool={tool}
              onChangeHighlights={setHighlights}
              onWordClick={({ word, sentence, x, y }) => {
                const w = word.replace(/[^A-Za-z'-]/g, "").toLowerCase();
                if (!w) return;
                const cached = translateMap[w];
                // Open immediately with the batch entry (instant). Then fire
                // a per-word fetch in the background to get defEn — keeps
                // popup latency at ~0 for the common path.
                setPopup({
                  word: w,
                  sentence,
                  x,
                  y,
                  loading: !cached,
                  hint: cached ? { pos: cached.pos, vi: cached.vi } : null,
                });
                void fetch("/api/shadowing/translate-word", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ word: w, sentence }),
                })
                  .then((r) => r.json())
                  .then((d) => {
                    if (!d.error) {
                      setPopup((p) =>
                        p && p.word === w
                          ? {
                              ...p,
                              loading: false,
                              hint: {
                                word: d.word,
                                pos: d.pos || cached?.pos || "",
                                vi: d.vi || cached?.vi || "",
                                defEn: d.defEn,
                              },
                            }
                          : p,
                      );
                    } else if (cached) {
                      // Fallback: keep showing the cached pos+vi if defEn
                      // fetch fails — at least we got something useful.
                      setPopup((p) => (p && p.word === w ? { ...p, loading: false } : p));
                    } else {
                      setPopup(null);
                      toast.error(d.error);
                    }
                  })
                  .catch(() => {
                    if (cached) setPopup((p) => (p ? { ...p, loading: false } : p));
                    else setPopup(null);
                  });
              }}
              className="text-sm leading-relaxed"
            />
            {tool === "translate" && batchLoading && (
              <p className="mt-2 text-xs text-honey-deep dark:text-honey italic">
                Đang AI dịch toàn bộ bài... (1 lần duy nhất, click sau là tức thì)
              </p>
            )}
            {tool === "translate" && !batchLoading && Object.keys(translateMap).length > 0 && (
              <p className="mt-2 text-xs text-sage-700 dark:text-sage-300">
                ✓ Đã dịch {Object.keys(translateMap).length} từ — click từ trong bài để xem nghĩa.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {groupQuestions(questions).map((unit) => {
            if (unit.kind === "form") {
              const end = unit.startNum + unit.items.length - 1;
              return (
                <div key={`fg-${unit.items[0].id}`}>
                  <ReadingGroupHeader type="FILL_BLANK" start={unit.startNum} end={end} />
                  <Card>
                    <CardContent className="p-5">
                      <FormBlanks
                        items={unit.items}
                        startNum={unit.startNum}
                        answers={answers}
                        onChange={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))}
                        disabled={submitted}
                        submitted={submitted}
                      />
                    </CardContent>
                  </Card>
                </div>
              );
            }
            if (unit.kind === "multi") {
              const q = unit.q;
              const isCorrect = isAnswerCorrect(answers[q.id], q.correctAnswer, q.type);
              return (
                <Card key={q.id} className={cn(submitted && (isCorrect ? "border-success" : "border-destructive"))}>
                  <CardContent className="p-5">
                    <MultiSelectQuestion
                      q={q}
                      num={q.displayNumber ?? unit.num}
                      value={answers[q.id] || ""}
                      onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                      disabled={submitted}
                      submitted={submitted}
                    />
                  </CardContent>
                </Card>
              );
            }
            const q = unit.q;
            const i = unit.num - 1;
            const userAns = answers[q.id] || "";
            const isCorrect = isAnswerCorrect(userAns, q.correctAnswer, q.type);
            const groupStart = groupStartFor(questions, i);
            const num = q.displayNumber ?? i + 1;
            return (
              <div key={q.id}>
                {groupStart && (
                  <ReadingGroupHeader type={q.type} start={groupStart.start + 1} end={groupStart.end + 1} />
                )}
              <Card className={cn(submitted && (isCorrect ? "border-success" : "border-destructive"))}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary">{num}.</span>
                    <p className="font-medium flex-1">{q.prompt}</p>
                    {submitted && (isCorrect ? <CheckCircle2 className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-destructive" />)}
                  </div>

                  {q.options ? (
                    <div className="space-y-2">
                      {q.options.map((opt) => (
                        <label
                          key={opt}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors",
                            !submitted && "hover:bg-accent",
                            userAns === opt && "border-primary bg-accent",
                            submitted && opt === q.correctAnswer && "border-success bg-success/10",
                            submitted && userAns === opt && opt !== q.correctAnswer && "border-destructive bg-destructive/10",
                          )}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            value={opt}
                            disabled={submitted}
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
                      disabled={submitted}
                      onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    />
                  )}

                  {submitted && !isCorrect && (
                    <div className="text-sm text-muted-foreground">
                      Đáp án đúng: <strong className="text-success">{q.correctAnswer}</strong>
                    </div>
                  )}
                </CardContent>
              </Card>
              </div>
            );
          })}

          {submitted && (
            <>
              <Card className="bg-accent">
                <CardContent className="p-5 text-center space-y-2">
                  <BeeMascot className="w-16 mx-auto" />
                  <h3 className="text-xl font-bold">Kết quả</h3>
                  <p className="text-3xl font-bold text-primary">
                    {correctCount}/{questions.length}
                  </p>
                  <p className="text-muted-foreground">Band ước tính: {((correctCount / questions.length) * 9).toFixed(1)}</p>
                  <Button onClick={() => router.push("/reading")} className="mt-3">Về danh sách</Button>
                </CardContent>
              </Card>
              <TipsCard
                skill="READING"
                score={(correctCount / questions.length) * 9}
                context={`Reading: ${correctCount}/${questions.length} correct`}
              />
              <ReadingComments testId={testId} />
            </>
          )}
        </div>
      </div>
      {popup && (
        <WordTranslatePopup
          word={popup.word}
          sentence={popup.sentence}
          x={popup.x}
          y={popup.y}
          loading={popup.loading}
          hint={popup.hint}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
}
