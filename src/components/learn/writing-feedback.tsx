"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AnnotatedEssay } from "@/components/learn/annotated-essay";
import {
  AlertTriangle,
  Link2,
  Wrench,
  ArrowRightToLine,
  ArrowLeftToLine,
  FileText,
  ChevronDown,
  BookMarked,
  Volume2,
} from "lucide-react";

/** A vocabulary item shown in the "expand your vocabulary" suggestions. */
export interface VocabItem {
  phrase: string;
  meaning: string;
  example: string;
}

export interface WritingResult {
  overallBand: number;
  criteria?: {
    taskAchievement?: { band: number; feedback: string };
    coherenceCohesion?: { band: number; feedback: string };
    lexicalResource?: { band: number; feedback: string };
    grammaticalRange?: { band: number; feedback: string };
  };
  annotations?: { category?: string; excerpt: string; issue: string; suggestion: string }[];
  linkingPhrases?: { phrase: string; use: string }[];
  usefulStructures?: { structure: string; example: string; note: string }[];
  collocations?: VocabItem[];
  phrasalVerbs?: VocabItem[];
  openingSentences?: string[];
  closingSentences?: string[];
  improvedVersion?: string;
  summary?: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  grammar: "Ngữ pháp",
  vocabulary: "Từ vựng",
  coherence: "Mạch lạc",
  task: "Yêu cầu đề",
};
const CATEGORY_COLOR: Record<string, string> = {
  grammar: "bg-rose-500",
  vocabulary: "bg-gold-500",
  coherence: "bg-sage-500",
  task: "bg-[#5B7E9C]",
};

export function WritingFeedback({
  result,
  taskLabel,
  essay,
}: {
  result: WritingResult;
  taskLabel: string;
  /** When provided, the essay is shown with mistakes highlighted inline. */
  essay?: string;
}) {
  return (
    <div className="space-y-3">
      {/* The candidate's essay with mistakes highlighted inline */}
      {essay && (
        <Card>
          <CardContent className="p-5 space-y-2">
            <h3 className="font-extrabold">Bài viết của bạn</h3>
            {result.annotations && result.annotations.length > 0 && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Các cụm <span className="font-bold underline decoration-2">in đậm gạch chân</span> là chỗ
                viết sai — di chuột vào để xem lỗi &amp; cách sửa.{" "}
                <span className="font-semibold text-rose-600 dark:text-rose-400">Ngữ pháp / cấu trúc</span> ·{" "}
                <span className="font-semibold text-gold-700 dark:text-gold-400">Từ vựng</span> ·{" "}
                <span className="font-semibold text-sage-700 dark:text-sage-400">Mạch ý</span>
              </p>
            )}
            <AnnotatedEssay essay={essay} annotations={result.annotations ?? []} />
          </CardContent>
        </Card>
      )}

      {/* Criteria breakdown */}
      {result.criteria && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-extrabold mb-3">{taskLabel} — 4 tiêu chí</h3>
            <div className="space-y-2">
              {([
                ["Task Achievement", result.criteria.taskAchievement],
                ["Coherence & Cohesion", result.criteria.coherenceCohesion],
                ["Lexical Resource", result.criteria.lexicalResource],
                ["Grammatical Range", result.criteria.grammaticalRange],
              ] as const).map(([label, c]) =>
                c ? (
                  <div key={label} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">{label}</span>
                      <span className="text-lg font-extrabold text-primary">{c.band.toFixed(1)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{c.feedback}</p>
                  </div>
                ) : null,
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Errors / annotations */}
      {result.annotations && result.annotations.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              <h3 className="font-extrabold">Lỗi cần sửa</h3>
            </div>
            <div className="space-y-2">
              {result.annotations.map((a, i) => {
                const cat = a.category ?? "grammar";
                return (
                  <div key={i} className="rounded-lg border p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white", CATEGORY_COLOR[cat] ?? "bg-foreground")}>
                        {CATEGORY_LABEL[cat] ?? cat}
                      </span>
                    </div>
                    <p className="text-sm">
                      <span className="text-destructive line-through">{a.excerpt}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">⚠️ {a.issue}</p>
                    <p className="text-xs text-success font-medium">✅ {a.suggestion}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Linking phrases */}
      {result.linkingPhrases && result.linkingPhrases.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="h-5 w-5 text-primary" />
              <h3 className="font-extrabold">Câu / cụm từ nối ý</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {result.linkingPhrases.map((l, i) => (
                <div key={i} className="rounded-lg border bg-primary/10 dark:bg-primary/10 p-2.5">
                  <div className="text-sm font-bold text-primary dark:text-primary">{l.phrase}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{l.use}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Useful structures */}
      {result.usefulStructures && result.usefulStructures.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="h-5 w-5 text-honey-deep" />
              <h3 className="font-extrabold">Cấu trúc câu nên dùng</h3>
            </div>
            <div className="space-y-2">
              {result.usefulStructures.map((s, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <div className="text-sm font-bold text-honey-deep dark:text-honey">{s.structure}</div>
                  <div className="text-sm italic text-foreground/80 mt-1">"{s.example}"</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.note}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collocations & phrasal verbs — expand vocabulary */}
      <VocabSuggestions collocations={result.collocations} phrasalVerbs={result.phrasalVerbs} />

      {/* Opening & closing sentences */}
      {((result.openingSentences && result.openingSentences.length > 0) ||
        (result.closingSentences && result.closingSentences.length > 0)) && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-extrabold">Câu mở bài & kết bài mẫu (tiếng Anh)</h3>
            {result.openingSentences && result.openingSentences.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-sage-600 mb-1.5">
                  <ArrowRightToLine className="h-3.5 w-3.5" /> Mở bài (Introduction)
                </div>
                <ul className="space-y-1.5">
                  {result.openingSentences.map((s, i) => (
                    <li key={i} className="rounded-lg border bg-sage-50 dark:bg-sage-950/30 p-2.5 text-sm italic">
                      "{s}"
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.closingSentences && result.closingSentences.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-rose-600 mb-1.5">
                  <ArrowLeftToLine className="h-3.5 w-3.5" /> Kết bài (Conclusion)
                </div>
                <ul className="space-y-1.5">
                  {result.closingSentences.map((s, i) => (
                    <li key={i} className="rounded-lg border bg-rose-50 dark:bg-rose-950/30 p-2.5 text-sm italic">
                      "{s}"
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Model essay */}
      {result.improvedVersion && <ModelEssay text={result.improvedVersion} />}
    </div>
  );
}

/**
 * "Expand your vocabulary" card — collocations and phrasal verbs suggested
 * by the AI for this essay's / topic's subject. Shared by Writing and
 * Speaking feedback. Pass `onSpeak` to make each phrase tappable for TTS.
 */
export function VocabSuggestions({
  collocations,
  phrasalVerbs,
  onSpeak,
}: {
  collocations?: VocabItem[];
  phrasalVerbs?: VocabItem[];
  onSpeak?: (text: string) => void;
}) {
  const hasC = !!collocations && collocations.length > 0;
  const hasP = !!phrasalVerbs && phrasalVerbs.length > 0;
  if (!hasC && !hasP) return null;
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <BookMarked className="h-5 w-5 text-sage-500" />
          <h3 className="font-extrabold">Mở rộng vốn từ — Collocations &amp; Phrasal verbs</h3>
        </div>
        {hasC && (
          <VocabGroup label="Collocations — cụm từ thường đi cùng nhau" items={collocations!} onSpeak={onSpeak} />
        )}
        {hasP && (
          <VocabGroup label="Phrasal verbs — cụm động từ" items={phrasalVerbs!} onSpeak={onSpeak} />
        )}
      </CardContent>
    </Card>
  );
}

function VocabGroup({
  label,
  items,
  onSpeak,
}: {
  label: string;
  items: VocabItem[];
  onSpeak?: (text: string) => void;
}) {
  return (
    <div>
      <div className="text-xs font-extrabold uppercase tracking-wider text-sage-600 mb-1.5">
        {label}
      </div>
      <div className="space-y-1.5">
        {items.map((it, i) => (
          <div key={i} className="rounded-lg border bg-sage-50 dark:bg-sage-950/30 p-2.5">
            <div className="flex flex-wrap items-baseline gap-x-2">
              {onSpeak ? (
                <button
                  onClick={() => onSpeak(it.phrase)}
                  className="text-sm font-bold text-sage-700 dark:text-sage-300 inline-flex items-center gap-1 hover:underline"
                >
                  <Volume2 className="h-3.5 w-3.5" /> {it.phrase}
                </button>
              ) : (
                <span className="text-sm font-bold text-sage-700 dark:text-sage-300">{it.phrase}</span>
              )}
              <span className="text-xs text-muted-foreground">{it.meaning}</span>
            </div>
            {it.example && (
              <div className="text-xs italic text-foreground/70 mt-0.5">&ldquo;{it.example}&rdquo;</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ModelEssay({ text }: { text: string }) {
  // Open by default so the sample essay is visible right after submitting.
  const [open, setOpen] = useState(true);
  return (
    <Card className="border-2 border-primary/20">
      <CardContent className="p-5">
        <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 w-full">
          <FileText className="h-5 w-5 text-primary" />
          <div className="flex-1 text-left">
            <h3 className="font-extrabold">Bài viết mẫu (band 7.0–7.5)</h3>
            <p className="text-xs text-muted-foreground">Tham khảo cách viết tốt hơn cho đúng đề bài này</p>
          </div>
          <ChevronDown className={cn("h-5 w-5 transition-transform shrink-0", open && "rotate-180")} />
        </button>
        {open && (
          <div className="mt-3 rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap">
            {text.normalize("NFC")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
