import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Sparkles, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StageView } from "./stage-view";

export const dynamic = "force-dynamic";

export default async function BandStagePage({
  params,
}: {
  params: Promise<{ stageId: string }>;
}) {
  const { stageId } = await params;
  const stage = await prisma.bandStage.findUnique({
    where: { id: stageId },
    include: {
      readingTests: {
        orderBy: { createdAt: "asc" },
        select: { id: true, title: true, level: true, questions: { select: { id: true } } },
      },
    },
  });
  if (!stage) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <Link href="/band-climber" className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Quay lại danh sách
        </Link>
      </div>

      <Card className="bg-gradient-to-br from-primary/10 to-accent border-2 border-primary/20">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl gradient-brand text-white shadow-lg shadow-primary/30">
            <TrendingUp className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight">{stage.title}</h1>
            {stage.subtitle && (
              <p className="text-muted-foreground font-medium">{stage.subtitle}</p>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-card text-foreground font-extrabold border-2 border-primary/30">
              {stage.fromBand.toFixed(1)}
            </span>
            <span className="text-muted-foreground">→</span>
            <span className="grid h-12 w-12 place-items-center rounded-xl gradient-brand text-white font-extrabold shadow-md shadow-primary/20">
              {stage.toBand.toFixed(1)}
            </span>
          </div>
        </CardContent>
      </Card>

      {stage.description && (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm leading-relaxed">{stage.description}</p>
          </CardContent>
        </Card>
      )}

      {stage.readingTests.length > 0 && (
        <Card className="border-2 border-emerald-300/60 bg-emerald-50/60 dark:bg-emerald-900/10">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-lg leading-tight">Luyện Reading vượt band</h2>
                <p className="text-xs text-muted-foreground">
                  Bee 🐝 sẽ hướng dẫn mẹo trước khi bạn làm bài. Sau khi nộp, AI phân tích từng câu sai kèm mẹo riêng cho chặng này.
                </p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {stage.readingTests.map((t) => (
                <Link
                  key={t.id}
                  href={`/band-climber/${stage.id}/reading/${t.id}`}
                  className="group rounded-xl border-2 border-emerald-200 bg-card p-3 hover:border-emerald-400 transition-colors flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate group-hover:text-emerald-700">
                      {t.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {t.level} · {t.questions.length} câu hỏi
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <StageView
        reading={stage.reading}
        listening={stage.listening}
        writing={stage.writing}
        speaking={stage.speaking}
      />

      <div className="flex justify-center">
        <Button asChild variant="outline" size="lg" className="rounded-full">
          <Link href="/band-climber">← Về tất cả chặng</Link>
        </Button>
      </div>
    </div>
  );
}
