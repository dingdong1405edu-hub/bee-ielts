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
} from "lucide-react";

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
  vocabulary: "bg-violet-500",
  coherence: "bg-amber-500",
  task: "bg-sky-500",
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
                <span className="font-semibold text-violet-600 dark:text-violet-400">Từ vựng</span> ·{" "}
                <span className="font-semibold text-amber-600 dark:text-amber-400">Mạch ý</span>
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
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white", CATEGORY_COLOR[cat] ?? "bg-zinc-500")}>
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
              <Link2 className="h-5 w-5 text-sky-500" />
              <h3 className="font-extrabold">Câu / cụm từ nối ý</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {result.linkingPhrases.map((l, i) => (
                <div key={i} className="rounded-lg border bg-sky-50 dark:bg-sky-950/30 p-2.5">
                  <div className="text-sm font-bold text-sky-700 dark:text-sky-300">{l.phrase}</div>
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
              <Wrench className="h-5 w-5 text-violet-500" />
              <h3 className="font-extrabold">Cấu trúc câu nên dùng</h3>
            </div>
            <div className="space-y-2">
              {result.usefulStructures.map((s, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <div className="text-sm font-bold text-violet-700 dark:text-violet-300">{s.structure}</div>
                  <div className="text-sm italic text-foreground/80 mt-1">"{s.example}"</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.note}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Opening & closing sentences */}
      {((result.openingSentences && result.openingSentences.length > 0) ||
        (result.closingSentences && result.closingSentences.length > 0)) && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-extrabold">Câu mở bài & kết bài mẫu (tiếng Anh)</h3>
            {result.openingSentences && result.openingSentences.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-600 mb-1.5">
                  <ArrowRightToLine className="h-3.5 w-3.5" /> Mở bài (Introduction)
                </div>
                <ul className="space-y-1.5">
                  {result.openingSentences.map((s, i) => (
                    <li key={i} className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 p-2.5 text-sm italic">
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
