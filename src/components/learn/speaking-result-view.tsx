"use client";

/**
 * SpeakingResultView — the FULL Speaking result screen (band, 4 criteria,
 * paraphrasing, transcript+audio review, pronunciation fixes, fluency warning,
 * grammar/vocab corrections, per-question tips, useful phrases, vocab, detailed
 * observations, model sample). Extracted verbatim from the practice
 * SpeakingPlayer so the PRACTICE done-screen and the HOMEWORK done-screen render
 * IDENTICALLY ("y chang") — a single source of truth for the whole review.
 *
 * The only per-context differences are passed in as props: `items` (the
 * per-question transcript+audio rows), `footer` (the bottom CTA row), and
 * `showAudio` (revisiting a graded homework has no stored audio).
 */
import type { ReactNode } from "react";
import {
  Volume2, ArrowRight, Trophy, Sparkles, MessageSquareQuote,
  ArrowRightToLine, Wand2, ClipboardList, AlertTriangle, Repeat, Zap,
} from "lucide-react";
import { personalize, cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { VocabSuggestions, type VocabItem } from "@/components/learn/writing-feedback";
import { TipsCard } from "@/components/learn/tips-card";
import { Leaf, BeeMascot } from "@/components/brand";

// Words below this recogniser confidence are treated as mispronounced / unclear.
export const LOW_CONF = 0.7;
// Filler/hesitation tokens kept in the transcript (filler_words=true). They are
// the examiner's Fluency evidence, NOT mispronunciations — exclude them from the
// low-confidence list so they're never shown as "phát âm sai".
export const FILLER_TOKENS = new Set(["um", "uh", "uhh", "umm", "er", "err", "erm", "mm", "mmm", "hmm", "ah", "huh"]);

export interface DGWord {
  word: string;
  confidence: number;
}
export interface QResult {
  transcript: string;
  words: DGWord[];
}
export interface Phrase {
  phrase: string;
  use: string;
  /** Vietnamese meaning + when to use — so VN learners understand the idiom. */
  meaningVi?: string;
}
export interface QTip {
  question: string;
  opener: string;
  advice: string;
  /** Full model answer to this question, written at the learner's target band. */
  modelAnswer?: string;
}
export interface Correction {
  original: string;
  corrected: string;
  explanation: string;
  /** The exact wrong word/phrase to bold, and its fix shown right beside it. */
  word?: string;
  fix?: string;
  type?: "grammar" | "vocab";
}
export interface PronFix {
  word: string;
  ipa: string;
  tip: string;
}
export interface ParaphraseExample {
  question: string;
  candidateSaid: string;
  comment: string;
}
export interface Paraphrasing {
  level: "verbatim" | "minimal" | "partial" | "strong";
  examples: ParaphraseExample[];
  impact: string;
}
export interface FluencyFlag {
  fillerCount?: number;
  fillers?: string[];
  severity?: "none" | "low" | "medium" | "high";
  warning?: string;
  advice?: string;
}
export interface RepeatedWord {
  word: string;
  count: number;
  alternatives: string[];
}
export interface WordVariety {
  repeatedWords: RepeatedWord[];
  advice?: string;
}
export interface Intensifier {
  /** The adverb to add — really / strongly / absolutely… */
  adverb: string;
  /** What the candidate said that could take the adverb (verbatim), or "". */
  original?: string;
  /** The upgraded phrase with the adverb added. */
  improved?: string;
  note?: string;
}
export interface SpeakingResult {
  overallBand: number;
  criteria: {
    fluencyCoherence: { band: number; feedback: string };
    lexicalResource: { band: number; feedback: string };
    grammaticalRange: { band: number; feedback: string };
    pronunciation: { band: number; feedback: string; note?: string };
  };
  fluency?: FluencyFlag;
  paraphrasing?: Paraphrasing;
  observations: string[];
  corrections?: Correction[];
  pronunciationFixes?: PronFix[];
  /** Overused words + synonym suggestions (avoid repetition). */
  wordVariety?: WordVariety;
  /** Places to add intensifying/descriptive adverbs (really, strongly…). */
  intensifiers?: Intensifier[];
  questionTips?: QTip[];
  usefulPhrases?: Phrase[];
  collocations?: VocabItem[];
  phrasalVerbs?: VocabItem[];
  improvedSample?: string;
  /** Band the model answers were written at (= learner's target band). */
  modelBand?: number | string;
  summary: string;
}

/** One transcript row in the "Bài nói của bạn" review section. */
export interface SpeakingReviewItem {
  key: string;
  /** e.g. "Part 1 · Câu 1" */
  label: string;
  result: QResult;
  /** Object URL for the recorded answer — omitted when audio isn't available. */
  audioUrl?: string;
}

export function SpeakingResultView({
  result,
  userName,
  topic,
  items,
  onSpeak,
  ttsBusy = false,
  footer,
  showAudio = true,
}: {
  result: SpeakingResult;
  userName?: string | null;
  topic: string;
  items: SpeakingReviewItem[];
  onSpeak: (t: string) => void;
  ttsBusy?: boolean;
  footer?: ReactNode;
  showAudio?: boolean;
}) {
  // Band the AI wrote the model answers at (learner's target band). Tolerate
  // the grader returning it as a number or a string.
  const mb = result.modelBand != null ? Number(result.modelBand) : NaN;
  const modelBandLabel = Number.isFinite(mb) ? ` — band ${mb.toFixed(1)}` : "";

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <div className="grid h-16 w-16 place-items-center rounded-2xl gradient-brand text-white shadow-lg shadow-primary/30">
            <Trophy className="h-8 w-8" />
          </div>
          <BeeMascot className="w-16" />
        </div>
        <h1 className="flex items-center justify-center gap-2 text-3xl font-extrabold tracking-tight">
          <Leaf className="h-5 w-5 text-leaf shrink-0" />
          Hoàn thành Speaking 🎉
        </h1>
      </div>

      <Card className="bg-gradient-to-br from-primary/10 to-accent border-2 border-primary/20">
        <CardContent className="p-8 text-center">
          <div className="text-sm text-muted-foreground">Speaking Band</div>
          <div className="text-6xl font-extrabold gradient-brand-text mt-2">{result.overallBand.toFixed(1)}</div>
          <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">{personalize(result.summary, userName)}</p>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-3">
        {Object.entries(result.criteria).map(([k, v]) => (
          <Card key={k}>
            <CardContent className="p-4">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">{labelOf(k)}</span>
                <span className="text-lg font-bold text-primary">{v.band.toFixed(1)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{personalize(v.feedback, userName)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {result.paraphrasing && <ParaphrasingCard data={result.paraphrasing} />}

      {/* Transcript review — each question shows a native HTML5 audio
          player for the user's own recording PLUS the transcript with
          mispronounced words underlined. Same affordance as luyennoi.com. */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="font-extrabold flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" /> Bài nói của bạn {showAudio ? "(audio + văn bản)" : "(văn bản)"}
          </h3>
          <p className="text-xs text-muted-foreground -mt-1">
            {showAudio ? (
              <>
                Nhấn ▶︎ để nghe lại bản ghi âm. Từ{" "}
                <span className="font-bold underline">in đậm gạch chân</span> là phát âm chưa rõ — nhấn để nghe cách đọc đúng.
              </>
            ) : (
              <>
                Từ <span className="font-bold underline">in đậm gạch chân</span> là phát âm chưa rõ — nhấn để nghe cách đọc đúng.
              </>
            )}
          </p>
          {items.map((item, i) => (
            <div key={i} className="rounded-lg border p-3 space-y-2">
              <div className="text-xs font-bold text-muted-foreground">{item.label}</div>
              {showAudio && item.audioUrl && (
                <audio controls src={item.audioUrl} className="w-full h-10" preload="metadata" />
              )}
              <TranscriptView result={item.result} onSpeak={onSpeak} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pronunciation fixes — IPA + tips for unclear words */}
      {result.pronunciationFixes && result.pronunciationFixes.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-extrabold flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-rose-500" /> Sửa phát âm
            </h3>
            <p className="text-xs text-muted-foreground -mt-1">
              Phiên âm IPA + cách đọc đúng cho các từ bạn phát âm chưa rõ. Nhấn loa để nghe.
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {result.pronunciationFixes.map((p, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => onSpeak(p.word)}
                      disabled={ttsBusy}
                      className="font-bold inline-flex items-center gap-1.5 hover:text-primary"
                    >
                      <Volume2 className="h-4 w-4" /> {p.word}
                    </button>
                    <span className="text-sm font-mono text-primary">{p.ipa}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{p.tip}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hesitation / filler warning — drives the Fluency score */}
      {result.fluency &&
        result.fluency.severity &&
        result.fluency.severity !== "none" &&
        (result.fluency.warning || (result.fluency.fillerCount ?? 0) > 0) && (
          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="font-extrabold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" /> Cảnh báo ngập ngừng (ậm ừ) — ảnh hưởng Fluency
              </h3>
              {typeof result.fluency.fillerCount === "number" && result.fluency.fillerCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  Phát hiện{" "}
                  <span className="font-extrabold text-amber-600">{result.fluency.fillerCount}</span> lần ngập
                  ngừng/ậm ừ trong bài nói.
                </p>
              )}
              {result.fluency.fillers && result.fluency.fillers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {result.fluency.fillers.map((f, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
              {result.fluency.warning && (
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                  {result.fluency.warning}
                </p>
              )}
              {result.fluency.advice && (
                <p className="text-xs text-muted-foreground leading-relaxed">💡 {result.fluency.advice}</p>
              )}
            </CardContent>
          </Card>
        )}

      {/* Corrections — warning + bold the wrong word with its fix beside it */}
      {result.corrections && result.corrections.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-extrabold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Cảnh báo ngữ pháp &amp; từ vựng
            </h3>
            <div className="space-y-2">
              {result.corrections.map((c, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-amber-300 bg-amber-50/60 p-3 space-y-1.5 dark:border-amber-500/30 dark:bg-amber-500/10"
                >
                  <div className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {c.type === "vocab" ? "Lỗi từ vựng" : c.type === "grammar" ? "Lỗi ngữ pháp" : "Cần sửa"}
                  </div>
                  {c.word && c.fix && (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-extrabold text-destructive line-through decoration-2">{c.word}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      <button
                        onClick={() => onSpeak(c.fix!)}
                        className="font-extrabold text-success hover:underline inline-flex items-center gap-1"
                      >
                        <Volume2 className="h-3.5 w-3.5" /> {c.fix}
                      </button>
                    </div>
                  )}
                  <p className="text-sm text-destructive/90 line-through">{c.original}</p>
                  <p className="text-sm font-semibold text-success flex items-start gap-1.5">
                    <span className="shrink-0">✅</span>
                    <button onClick={() => onSpeak(c.corrected)} className="text-left hover:underline">
                      {c.corrected}
                    </button>
                  </p>
                  <p className="text-xs text-muted-foreground">{c.explanation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Word variety — overused words + synonyms (avoid repetition) */}
      {result.wordVariety && result.wordVariety.repeatedWords && result.wordVariety.repeatedWords.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-extrabold flex items-center gap-2">
              <Repeat className="h-5 w-5 text-amber-500" /> Tránh lặp từ
            </h3>
            <p className="text-xs text-muted-foreground -mt-1">
              Bạn lặp lại những từ này nhiều lần — đổi sang từ đồng nghĩa để nâng điểm Từ vựng. Nhấn để nghe từ thay thế.
            </p>
            <div className="space-y-2">
              {result.wordVariety.repeatedWords.map((r, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-extrabold text-amber-600">{r.word}</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                      lặp {r.count}×
                    </span>
                  </div>
                  {r.alternatives && r.alternatives.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {r.alternatives.map((alt, j) => (
                        <button
                          key={j}
                          onClick={() => onSpeak(alt)}
                          disabled={ttsBusy}
                          className="inline-flex items-center gap-1 rounded-full border bg-leaf-tint px-2.5 py-1 text-xs font-semibold text-leaf-deep hover:underline dark:bg-leaf-deep/20 dark:text-leaf"
                        >
                          <Volume2 className="h-3 w-3" /> {alt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {result.wordVariety.advice && (
              <p className="text-xs text-muted-foreground leading-relaxed">💡 {result.wordVariety.advice}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Intensifiers — add descriptive/emphatic adverbs (really, strongly…) */}
      {result.intensifiers && result.intensifiers.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-extrabold flex items-center gap-2">
              <Zap className="h-5 w-5 text-gold-500" /> Thêm từ nhấn mạnh &amp; miêu tả
            </h3>
            <p className="text-xs text-muted-foreground -mt-1">
              Thêm trạng từ như <span className="font-bold">really, strongly, absolutely</span> để câu nói mạnh và sinh động hơn. Nhấn để nghe.
            </p>
            <div className="space-y-2">
              {result.intensifiers.map((it, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold-100 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-gold-700 dark:bg-gold-500/15 dark:text-gold-300">
                    + {it.adverb}
                  </span>
                  {it.original && <p className="text-sm text-muted-foreground line-through">{it.original}</p>}
                  {it.improved && (
                    <button
                      onClick={() => onSpeak(it.improved!)}
                      disabled={ttsBusy}
                      className="inline-flex items-start gap-1.5 text-left text-sm font-semibold text-success hover:underline"
                    >
                      <Volume2 className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {it.improved}
                    </button>
                  )}
                  {it.note && <p className="text-xs text-muted-foreground">{it.note}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-question tips — opening sentence + how to develop the answer (English) */}
      {result.questionTips && result.questionTips.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-extrabold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-gold-500" /> Tips for each question
            </h3>
            <p className="text-xs text-muted-foreground -mt-1">
              Câu mở đầu gợi ý và cách triển khai cho từng câu hỏi. Nhấn loa để nghe.
            </p>
            <div className="space-y-2.5">
              {result.questionTips.map((t, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => onSpeak(t.question)}
                      disabled={ttsBusy}
                      className="text-primary shrink-0 mt-0.5"
                      aria-label="Nghe câu hỏi"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                    <p className="text-sm font-bold">{t.question}</p>
                  </div>
                  <div className="rounded-md bg-sage-50 dark:bg-sage-950/30 p-2.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-sage-600 mb-1">
                      <ArrowRightToLine className="h-3.5 w-3.5" /> Opening sentence
                    </div>
                    <button
                      onClick={() => onSpeak(t.opener)}
                      disabled={ttsBusy}
                      className="text-sm italic text-sage-800 dark:text-sage-200 hover:underline text-left inline-flex items-start gap-1.5"
                    >
                      <Volume2 className="h-3.5 w-3.5 mt-0.5 shrink-0" /> &ldquo;{t.opener}&rdquo;
                    </button>
                  </div>
                  {t.modelAnswer && (
                    <div className="rounded-md border border-leaf/40 bg-leaf-tint/60 p-2.5 dark:bg-leaf-deep/20">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-leaf-deep dark:text-leaf">
                          <Sparkles className="h-3.5 w-3.5" /> Bài mẫu{modelBandLabel}
                        </div>
                        <button
                          onClick={() => onSpeak(t.modelAnswer!)}
                          disabled={ttsBusy}
                          className="text-leaf-deep dark:text-leaf shrink-0"
                          aria-label="Nghe bài mẫu"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground/90">{t.modelAnswer}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground leading-relaxed">{t.advice}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Useful phrases & idioms for this topic */}
      {result.usefulPhrases && result.usefulPhrases.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-extrabold flex items-center gap-2">
              <MessageSquareQuote className="h-5 w-5 text-leaf" /> Useful phrases &amp; idioms
            </h3>
            <div className="space-y-1.5">
              {result.usefulPhrases.map((p, i) => (
                <div key={i} className="rounded-lg border bg-leaf-tint dark:bg-leaf-deep/20 p-2.5">
                  <button
                    onClick={() => onSpeak(p.phrase)}
                    className="text-sm font-bold text-leaf-deep dark:text-leaf inline-flex items-center gap-1 hover:underline"
                  >
                    <Volume2 className="h-3.5 w-3.5" /> {p.phrase}
                  </button>
                  {p.meaningVi && (
                    <div className="text-xs text-foreground/90 mt-0.5">
                      🇻🇳 <span className="font-medium">{p.meaningVi}</span>
                    </div>
                  )}
                  {p.use && <div className="text-[11px] italic text-muted-foreground mt-0.5">{p.use}</div>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collocations & phrasal verbs — expand vocabulary */}
      <VocabSuggestions
        collocations={result.collocations}
        phrasalVerbs={result.phrasalVerbs}
        onSpeak={onSpeak}
      />

      {result.observations.length > 0 && (
        <Card className="border-2 border-primary/30 bg-primary/[0.03]">
          <CardContent className="p-5">
            <h3 className="text-xl font-extrabold tracking-tight mb-3 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
                <ClipboardList className="h-5 w-5" />
              </span>
              Nhận xét chi tiết
            </h3>
            <ul className="space-y-2 text-sm">
              {result.observations.map((o, i) => (
                <li key={i} className="flex gap-2 leading-relaxed">
                  <span className="text-primary font-bold shrink-0">•</span>
                  <span>{personalize(o, userName)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {result.improvedSample && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold">Câu trả lời mẫu chuẩn{modelBandLabel}</h3>
              <button
                onClick={() => onSpeak(result.improvedSample!)}
                disabled={ttsBusy}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-muted disabled:opacity-50"
              >
                <Volume2 className="h-4 w-4" /> Nghe
              </button>
            </div>
            <div className="whitespace-pre-wrap text-sm text-muted-foreground">{result.improvedSample}</div>
          </CardContent>
        </Card>
      )}

      <TipsCard skill="SPEAKING" score={result.overallBand} context={`Speaking practice, topic: ${topic}`} />

      {footer}
    </div>
  );
}

/** Renders a transcript; words with low recogniser confidence are bold+underlined and clickable. */
export function TranscriptView({ result, onSpeak }: { result: QResult; onSpeak: (t: string) => void }) {
  if (!result.transcript) {
    return <p className="text-sm italic text-muted-foreground">(chưa có bài nói)</p>;
  }
  if (result.words.length === 0) {
    return <p className="text-sm leading-relaxed">{result.transcript}</p>;
  }
  return (
    <p className="text-sm leading-relaxed">
      {result.words.map((w, i) => {
        const low = w.confidence < LOW_CONF;
        return (
          <span key={i}>
            {low ? (
              <button
                onClick={() => onSpeak(w.word)}
                title={`Phát âm chưa rõ — nhấn để nghe đúng (độ tin cậy ${(w.confidence * 100).toFixed(0)}%)`}
                className="font-bold underline decoration-2 decoration-rose-500 text-rose-600 hover:text-rose-700"
              >
                {w.word}
              </button>
            ) : (
              <span>{w.word}</span>
            )}{" "}
          </span>
        );
      })}
    </p>
  );
}

export function labelOf(k: string) {
  switch (k) {
    case "fluencyCoherence":
      return "Fluency & Coherence";
    case "lexicalResource":
      return "Lexical Resource";
    case "grammaticalRange":
      return "Grammatical Range";
    case "pronunciation":
      return "Pronunciation";
    default:
      return k;
  }
}

/** Paraphrasing analysis — surfaces the level (verbatim/minimal/partial/strong)
 *  Groq's grader assigned, the actual paraphrases the candidate produced (or
 *  the verbatim moments they should fix), and the impact on Lexical Resource
 *  / Grammatical Range bands. */
export function ParaphrasingCard({ data }: { data: NonNullable<SpeakingResult["paraphrasing"]> }) {
  const LEVEL_META: Record<
    Paraphrasing["level"],
    { label: string; tone: string; emoji: string }
  > = {
    verbatim: {
      label: "Đọc nguyên xi câu hỏi",
      tone: "bg-rose-100 text-rose-700 border-rose-300",
      emoji: "🚫",
    },
    minimal: {
      label: "Paraphrase rất ít",
      tone: "bg-gold-100 text-gold-700 border-gold-300",
      emoji: "⚠️",
    },
    partial: {
      label: "Paraphrase một phần",
      tone: "bg-primary/10 text-primary border-primary/30",
      emoji: "👍",
    },
    strong: {
      label: "Paraphrase tốt",
      tone: "bg-sage-100 text-sage-700 border-sage-300",
      emoji: "⭐",
    },
  };
  const meta = LEVEL_META[data.level] ?? LEVEL_META.minimal;
  return (
    <Card className="border-2 border-honey/30 bg-honey-tint/40 dark:bg-honey-deep/15">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-extrabold flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-honey-deep" /> Paraphrasing câu hỏi
          </h3>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-extrabold uppercase tracking-wider",
              meta.tone,
            )}
          >
            <span>{meta.emoji}</span> {meta.label}
          </span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{data.impact}</p>
        {data.examples.length > 0 && (
          <div className="space-y-2">
            {data.examples.map((ex, i) => (
              <div key={i} className="rounded-lg border bg-card p-3 space-y-1.5">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Câu hỏi gốc
                </div>
                <p className="text-sm italic">{ex.question}</p>
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-sage-700 mt-2">
                  Bạn đã nói
                </div>
                <p className="text-sm font-semibold">&ldquo;{ex.candidateSaid}&rdquo;</p>
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-honey-deep mt-2">
                  Nhận xét
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{ex.comment}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
