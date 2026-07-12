/**
 * SpeakingReviewBody — the shared Speaking result view, extracted so the profile
 * review, the homework done-screen, and the teacher's per-student review all
 * render IDENTICALLY (transcript + band + 4 criteria + per-question tips +
 * corrections; no audio, matching how the app stores speaking). Server-safe.
 */
import { ClipboardList, AlertTriangle, ArrowRight, Repeat, Zap } from "lucide-react";
import { personalize } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { VocabSuggestions, type VocabItem } from "@/components/learn/writing-feedback";
import {
  QuestionScoreCard,
  SpeakingSummaryHeader,
  AnnotatedTranscript,
  type QuestionTip,
  type Correction,
} from "@/components/learn/speaking-review-card";

type Crit = { band?: number; feedback?: string };
export interface SpeakingFeedback {
  summary?: string;
  criteria?: {
    fluencyCoherence?: Crit;
    lexicalResource?: Crit;
    grammaticalRange?: Crit;
    pronunciation?: Crit;
  };
  fluency?: { fillerCount?: number; fillers?: string[]; severity?: string; warning?: string; advice?: string };
  observations?: string[];
  corrections?: Correction[];
  pronunciationFixes?: { word: string; ipa: string; tip: string }[];
  wordVariety?: { repeatedWords: { word: string; count: number; alternatives: string[] }[]; advice?: string };
  intensifiers?: { adverb: string; original?: string; improved?: string; note?: string }[];
  questionTips?: QuestionTip[];
  collocations?: VocabItem[];
  phrasalVerbs?: VocabItem[];
}

export function SpeakingReviewBody({
  score,
  feedback,
  transcripts,
  userName,
}: {
  score: number;
  feedback: SpeakingFeedback;
  transcripts: { label: string; text: string }[];
  userName?: string | null;
}) {
  const fb = feedback ?? {};
  const overallCrit = {
    fluencyCoherence: fb.criteria?.fluencyCoherence?.band,
    lexicalResource: fb.criteria?.lexicalResource?.band,
    grammaticalRange: fb.criteria?.grammaticalRange?.band,
    pronunciation: fb.criteria?.pronunciation?.band,
  };
  const tipsWithBand = (fb.questionTips ?? []).filter((t) => t.band != null && Number.isFinite(t.band as number));
  let weakestIndex = -1;
  if (tipsWithBand.length > 0) {
    const minBand = Math.min(...tipsWithBand.map((t) => t.band as number));
    weakestIndex = (fb.questionTips ?? []).findIndex((t) => t.band === minBand);
  }
  const criteria = fb.criteria
    ? ([
        ["Fluency & Coherence", fb.criteria.fluencyCoherence],
        ["Lexical Resource", fb.criteria.lexicalResource],
        ["Grammatical Range", fb.criteria.grammaticalRange],
        ["Pronunciation", fb.criteria.pronunciation],
      ] as const)
    : [];

  return (
    <div className="space-y-4">
      <SpeakingSummaryHeader overall={score} criteria={overallCrit} date="" />

      {fb.summary && (
        <Card><CardContent className="p-5">
          <h3 className="mb-1 font-extrabold">Nhận xét tổng quan</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{personalize(fb.summary, userName)}</p>
        </CardContent></Card>
      )}

      {fb.questionTips && fb.questionTips.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-lg font-extrabold">
            <ClipboardList className="h-5 w-5 text-primary" /> Chấm theo từng câu
          </h3>
          {fb.questionTips.map((tip, i) => (
            <QuestionScoreCard key={i} index={i} tip={tip} corrections={fb.corrections} isWeakest={i === weakestIndex} />
          ))}
        </div>
      )}

      {criteria.length > 0 && (
        <Card><CardContent className="space-y-2 p-5">
          <h3 className="mb-1 font-extrabold">4 tiêu chí — tổng quan</h3>
          {criteria.map(([label, c]) =>
            c ? (
              <div key={label} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{label}</span>
                  <span className="text-lg font-extrabold text-primary">{(c.band ?? 0).toFixed(1)}</span>
                </div>
                {c.feedback && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{personalize(c.feedback, userName)}</p>}
              </div>
            ) : null,
          )}
        </CardContent></Card>
      )}

      {fb.corrections && fb.corrections.length > 0 && (
        <Card><CardContent className="space-y-2 p-5">
          <h3 className="mb-1 flex items-center gap-2 font-extrabold">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> Cảnh báo ngữ pháp &amp; từ vựng
          </h3>
          {fb.corrections.map((c, i) => (
            <div key={i} className="space-y-1.5 rounded-lg border border-amber-300 bg-amber-50/60 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
              {c.word && c.fix && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-extrabold text-destructive line-through decoration-2">{c.word}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="font-extrabold text-success">{c.fix}</span>
                </div>
              )}
              {c.original && <p className="text-sm text-destructive/90 line-through">{c.original}</p>}
              {c.corrected && <p className="text-sm font-semibold text-success">✅ {c.corrected}</p>}
              {c.explanation && <p className="text-xs text-muted-foreground">{c.explanation}</p>}
            </div>
          ))}
        </CardContent></Card>
      )}

      {fb.wordVariety && fb.wordVariety.repeatedWords && fb.wordVariety.repeatedWords.length > 0 && (
        <Card><CardContent className="space-y-2 p-5">
          <h3 className="mb-1 flex items-center gap-2 font-extrabold">
            <Repeat className="h-5 w-5 text-amber-500" /> Tránh lặp từ
          </h3>
          {fb.wordVariety.repeatedWords.map((r, i) => (
            <div key={i} className="rounded-lg border p-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-extrabold text-amber-600">{r.word}</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">lặp {r.count}×</span>
              </div>
              {r.alternatives && r.alternatives.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {r.alternatives.map((alt, j) => (
                    <span key={j} className="rounded-full border bg-leaf-tint px-2.5 py-1 text-xs font-semibold text-leaf-deep dark:bg-leaf-deep/20 dark:text-leaf">{alt}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {fb.wordVariety.advice && <p className="text-xs leading-relaxed text-muted-foreground">💡 {fb.wordVariety.advice}</p>}
        </CardContent></Card>
      )}

      {fb.intensifiers && fb.intensifiers.length > 0 && (
        <Card><CardContent className="space-y-2 p-5">
          <h3 className="mb-1 flex items-center gap-2 font-extrabold">
            <Zap className="h-5 w-5 text-gold-500" /> Thêm từ nhấn mạnh &amp; miêu tả
          </h3>
          {fb.intensifiers.map((it, i) => (
            <div key={i} className="space-y-1 rounded-lg border p-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-gold-100 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-gold-700 dark:bg-gold-500/15 dark:text-gold-300">+ {it.adverb}</span>
              {it.original && <p className="text-sm text-muted-foreground line-through">{it.original}</p>}
              {it.improved && <p className="text-sm font-semibold text-success">{it.improved}</p>}
              {it.note && <p className="text-xs text-muted-foreground">{it.note}</p>}
            </div>
          ))}
        </CardContent></Card>
      )}

      <VocabSuggestions collocations={fb.collocations} phrasalVerbs={fb.phrasalVerbs} />

      <Card><CardContent className="space-y-3 p-5">
        <h3 className="font-extrabold">Bài nói (văn bản)</h3>
        {transcripts.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">Không có bản ghi.</p>
        ) : (
          transcripts.map((t, i) => (
            <div key={i}>
              {t.label && <div className="mb-1 text-xs font-bold text-muted-foreground">{t.label}</div>}
              <div className="rounded-lg border bg-muted/20 p-3">
                <AnnotatedTranscript text={t.text.normalize("NFC")} corrections={fb.corrections} />
              </div>
            </div>
          ))
        )}
      </CardContent></Card>
    </div>
  );
}
