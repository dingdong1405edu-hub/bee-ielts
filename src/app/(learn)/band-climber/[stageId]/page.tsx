import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Headphones, Mic, PenLine, Sparkles, TrendingUp } from "lucide-react";
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
      listeningTests: {
        orderBy: { createdAt: "asc" },
        select: { id: true, title: true, questions: { select: { id: true } } },
      },
      writingTasks: {
        orderBy: { createdAt: "asc" },
        select: { id: true, taskType: true, prompt: true, minWords: true },
      },
      speakingSets: {
        orderBy: { createdAt: "asc" },
        select: { id: true, topic: true },
      },
    },
  });
  if (!stage) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <Link
          href="/band-climber"
          className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1"
        >
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

      <ExerciseSection
        title="Luyện Reading vượt band"
        icon={BookOpen}
        gradFrom="from-emerald-500"
        gradTo="to-teal-500"
        accent="emerald"
        items={stage.readingTests.map((t) => ({
          id: t.id,
          href: `/band-climber/${stage.id}/reading/${t.id}`,
          title: t.title,
          subtitle: `${t.level} · ${t.questions.length} câu hỏi`,
        }))}
      />

      <ExerciseSection
        title="Luyện Listening vượt band"
        icon={Headphones}
        gradFrom="from-amber-500"
        gradTo="to-orange-500"
        accent="amber"
        items={stage.listeningTests.map((t) => ({
          id: t.id,
          href: `/band-climber/${stage.id}/listening/${t.id}`,
          title: t.title,
          subtitle: `${t.questions.length} câu hỏi`,
        }))}
      />

      <ExerciseSection
        title="Luyện Writing vượt band"
        icon={PenLine}
        gradFrom="from-rose-500"
        gradTo="to-pink-500"
        accent="rose"
        items={stage.writingTasks.map((t) => ({
          id: t.id,
          href: `/band-climber/${stage.id}/writing/${t.id}`,
          title: `Task ${t.taskType} — ${t.prompt.split("\n")[0].slice(0, 70)}`,
          subtitle: `Tối thiểu ${t.minWords} từ`,
        }))}
      />

      <ExerciseSection
        title="Luyện Speaking vượt band"
        icon={Mic}
        gradFrom="from-indigo-500"
        gradTo="to-violet-500"
        accent="indigo"
        items={stage.speakingSets.map((s) => ({
          id: s.id,
          href: `/band-climber/${stage.id}/speaking/${s.id}`,
          title: s.topic,
          subtitle: "Speaking Part 1 + 2 + 3",
        }))}
      />

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

interface ExerciseItem {
  id: string;
  href: string;
  title: string;
  subtitle: string;
}

/**
 * Renders one skill's attached-exercises section. Hidden entirely when
 * the admin hasn't attached any exercise of this skill to the stage —
 * keeps the page tight while the content library grows.
 */
function ExerciseSection({
  title,
  icon: Icon,
  gradFrom,
  gradTo,
  accent,
  items,
}: {
  title: string;
  icon: React.ElementType;
  gradFrom: string;
  gradTo: string;
  accent: "emerald" | "amber" | "rose" | "indigo";
  items: ExerciseItem[];
}) {
  if (items.length === 0) return null;
  const borderClass = {
    emerald: "border-emerald-300/60 bg-emerald-50/60",
    amber: "border-amber-300/60 bg-amber-50/60",
    rose: "border-rose-300/60 bg-rose-50/60",
    indigo: "border-indigo-300/60 bg-indigo-50/60",
  }[accent];
  const itemBorderClass = {
    emerald: "border-emerald-200 hover:border-emerald-400 group-hover:text-emerald-700",
    amber: "border-amber-200 hover:border-amber-400 group-hover:text-amber-700",
    rose: "border-rose-200 hover:border-rose-400 group-hover:text-rose-700",
    indigo: "border-indigo-200 hover:border-indigo-400 group-hover:text-indigo-700",
  }[accent];
  const sparkleClass = {
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
    indigo: "text-indigo-600",
  }[accent];
  return (
    <Card className={`border-2 ${borderClass}`}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div
            className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${gradFrom} ${gradTo} text-white shadow-md`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-lg leading-tight">{title}</h2>
            <p className="text-xs text-muted-foreground">
              Bee 🐝 sẽ hướng dẫn mẹo trước khi bạn làm bài.
            </p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((it) => (
            <Link
              key={it.id}
              href={it.href}
              className={`group rounded-xl border-2 ${itemBorderClass} bg-card p-3 transition-colors flex items-center gap-2`}
            >
              <Sparkles className={`h-4 w-4 ${sparkleClass} shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{it.title}</div>
                <div className="text-[11px] text-muted-foreground">{it.subtitle}</div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
