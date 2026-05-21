import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { personalize } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar, ClipboardList } from "lucide-react";

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
  corrections?: { original: string; corrected: string; explanation: string }[];
  pronunciationFixes?: { word: string; ipa: string; tip: string }[];
  questionTips?: { question: string; opener: string; advice: string }[];
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

      <Card className="bg-gradient-to-br from-primary/10 to-accent border-2 border-primary/20">
        <CardContent className="p-6 text-center">
          <div className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(attempt.createdAt).toLocaleString("vi-VN")}
            {attempt.refId.startsWith("mock-") && " · Thi thử"}
          </div>
          <div className="text-5xl font-extrabold gradient-brand-text mt-2">
            {(attempt.score ?? 0).toFixed(1)}
          </div>
          <div className="text-sm text-muted-foreground mt-1">Speaking band</div>
        </CardContent>
      </Card>

      {fb.summary && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-extrabold mb-1">Nhận xét tổng quan</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{personalize(fb.summary, userName)}</p>
          </CardContent>
        </Card>
      )}

      {criteria.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-2">
            <h3 className="font-extrabold mb-1">4 tiêu chí</h3>
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

      {fb.questionTips && fb.questionTips.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-2">
            <h3 className="font-extrabold mb-1">Gợi ý cho từng câu hỏi</h3>
            {fb.questionTips.map((t, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-1.5">
                <p className="text-sm font-bold">{t.question}</p>
                <div className="rounded-md bg-success/10 p-2">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-success mb-0.5">
                    Opening sentence
                  </div>
                  <p className="text-sm italic text-success">“{t.opener}”</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{t.advice}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="font-extrabold">Bài nói của bạn (văn bản)</h3>
          {transcripts.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Không có bản ghi.</p>
          ) : (
            transcripts.map((t, i) => (
              <div key={i}>
                {t.label && <div className="text-xs font-bold text-muted-foreground mb-1">{t.label}</div>}
                <p className="text-sm whitespace-pre-wrap leading-relaxed rounded-lg border bg-muted/20 p-3">
                  {t.text.normalize("NFC")}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
