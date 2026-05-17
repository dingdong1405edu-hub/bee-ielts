import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar } from "lucide-react";

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
};

export default async function SpeakingReviewPage({ params }: { params: { attemptId: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const attempt = await prisma.attempt.findUnique({ where: { id: params.attemptId } });
  if (!attempt || attempt.userId !== session.user.id || attempt.skill !== "SPEAKING") notFound();

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
            <p className="text-sm text-muted-foreground leading-relaxed">{fb.summary}</p>
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
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{c.feedback}</p>
                  )}
                </div>
              ) : null,
            )}
          </CardContent>
        </Card>
      )}

      {fb.observations && fb.observations.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-extrabold mb-2">Nhận xét chi tiết</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {fb.observations.map((o, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>{o}</span>
                </li>
              ))}
            </ul>
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
