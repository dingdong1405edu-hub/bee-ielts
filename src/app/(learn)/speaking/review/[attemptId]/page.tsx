import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { personalize } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { VocabSuggestions, type VocabItem } from "@/components/learn/writing-feedback";
import {
  QuestionScoreCard,
  SpeakingSummaryHeader,
  AnnotatedTranscript,
  type QuestionTip,
  type Correction,
} from "@/components/learn/speaking-review-card";

export const dynamic = "force-dynamic";

type Crit = { band?: number; feedback?: string };
type SpeakingFeedback = {
  summary?: string;
  criteria?: {
    fluencyCoherence?: Crit;
    lexicalResource?: Crit;
    grammaticalRange?: Crit;
    pronunciation?: Crit;
  };
  observations?: string[];
  corrections?: Correction[];
  pronunciationFixes?: { word: string; ipa: string; tip: string }[];
  questionTips?: QuestionTip[];
  collocations?: VocabItem[];
  phrasalVerbs?: VocabItem[];
};

export default async function SpeakingReviewPage({ params }: { params: { attemptId: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [attempt, user] = await Promise.all([
    prisma.attempt.findUnique({ where: { id: params.attemptId } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } }),
  ]);
  if (!attempt || attempt.userId !== session.user.id || attempt.skill !== "SPEAKING") notFound();
  const userName = user?.name ?? null;

  const raw = (attempt.rawAnswer ?? {}) as Record<string, unknown>;
  // Practise = { part, transcript }; mock = { "1", "2", "3" }.
  const transcripts: { label: string; text: string }[] = [];
  if (typeof raw.transcript === "string") {
    transcripts.push({ label: `Part ${raw.part ?? ""}`.trim(), text: raw.transcript });
  } else {
    for (const p of ["1", "2", "3"]) {
      if (typeof raw[p] === "string" && (raw[p] as string).trim()) {
        transcripts.push({ label: `Part ${p}`, text: raw[p] as string });
      }
    }
  }

  const fb = (attempt.feedback ?? {}) as SpeakingFeedback;
  const overallCrit = {
    fluencyCoherence: fb.criteria?.fluencyCoherence?.band,
    lexicalResource: fb.criteria?.lexicalResource?.band,
    grammaticalRange: fb.criteria?.grammaticalRange?.band,
    pronunciation: fb.criteria?.pronunciation?.band,
  };
  // Find the weakest question (lowest band) so the UI can paint the
  // luyennoi-style "Câu yếu nhất" amber ring around that card.
  const tipsWithBand = (fb.questionTips ?? []).filter(
    (t) => t.band != null && Number.isFinite(t.band as number),
  );
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
    <div className="max-w-3xl mx-auto space-y-4">
      <Button asChild variant="ghost" size="sm" className="rounded-full">
        <Link href="/profile">
          <ArrowLeft className="h-4 w-4" /> Quay lại Hồ sơ
        </Link>
      </Button>

      <SpeakingSummaryHeader
        overall={attempt.score ?? 0}
        criteria={overallCrit}
        date={`${new Date(attempt.createdAt).toLocaleString("vi-VN")}${attempt.refId.startsWith("mock-") ? " · Thi thử" : ""}`}
      />

      {fb.summary && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-extrabold mb-1">Nhận xét tổng quan</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{personalize(fb.summary, userName)}</p>
          </CardContent>
        </Card>
      )}

      {fb.questionTips && fb.questionTips.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-extrabold text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Chấm theo từng câu
          </h3>
          {fb.questionTips.map((tip, i) => (
            <QuestionScoreCard
              key={i}
              index={i}
              tip={tip}
              corrections={fb.corrections}
              isWeakest={i === weakestIndex}
            />
          ))}
        </div>
      )}

      {criteria.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-2">
            <h3 className="font-extrabold mb-1">4 tiêu chí — tổng quan</h3>
            {criteria.map(([label, c]) =>
              c ? (
                <div key={label} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{label}</span>
                    <span className="text-lg font-extrabold text-primary">
                      {(c.band ?? 0).toFixed(1)}
                    </span>
                  </div>
                  {c.feedback && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{personalize(c.feedback, userName)}</p>
                  )}
                </div>
              ) : null,
            )}
          </CardContent>
        </Card>
      )}

      {fb.observations && fb.observations.length > 0 && (
        <Card className="border-2 border-primary/30 bg-primary/[0.03]">
          <CardContent className="p-5">
            <h3 className="text-xl font-extrabold tracking-tight mb-3 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
                <ClipboardList className="h-5 w-5" />
              </span>
              Nhận xét chi tiết
            </h3>
            <ul className="space-y-2 text-sm">
              {fb.observations.map((o, i) => (
                <li key={i} className="flex gap-2 leading-relaxed">
                  <span className="text-primary font-bold shrink-0">•</span>
                  <span>{personalize(o, userName)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {fb.pronunciationFixes && fb.pronunciationFixes.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-2">
            <h3 className="font-extrabold mb-1">Sửa phát âm</h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {fb.pronunciationFixes.map((p, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">{p.word}</span>
                    <span className="text-sm font-mono text-primary">{p.ipa}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{p.tip}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {fb.corrections && fb.corrections.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-2">
            <h3 className="font-extrabold mb-1">Lỗi & cách sửa</h3>
            {fb.corrections.map((c, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-1">
                <p className="text-sm text-destructive line-through">{c.original}</p>
                <p className="text-sm font-semibold text-success">✅ {c.corrected}</p>
                <p className="text-xs text-muted-foreground">{c.explanation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <VocabSuggestions collocations={fb.collocations} phrasalVerbs={fb.phrasalVerbs} />

      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="font-extrabold">Bài nói của bạn (văn bản đầy đủ)</h3>
          <p className="text-xs text-muted-foreground">
            Phần lỗi được gạch chân màu đỏ, bản sửa nằm cạnh ở màu xanh.
          </p>
          {transcripts.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Không có bản ghi.</p>
          ) : (
            transcripts.map((t, i) => (
              <div key={i}>
                {t.label && <div className="text-xs font-bold text-muted-foreground mb-1">{t.label}</div>}
                <div className="rounded-lg border bg-muted/20 p-3">
                  <AnnotatedTranscript
                    text={t.text.normalize("NFC")}
                    corrections={fb.corrections}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
