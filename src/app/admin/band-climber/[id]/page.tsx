import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  BookOpen,
  Headphones,
  PenLine,
  Mic,
  Plus,
  Pencil,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BandStageForm } from "@/components/admin/band-stage-form";
import { DeleteTestButton } from "@/components/admin/delete-test-button";

export default async function EditBandStagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const stage = await prisma.bandStage.findUnique({
    where: { id },
    include: {
      readingTests: { select: { id: true, title: true, level: true } },
      listeningTests: { select: { id: true, title: true } },
      writingTasks: { select: { id: true, taskType: true, prompt: true } },
      speakingSets: { select: { id: true, topic: true } },
      miniQuizzes: {
        orderBy: [{ skill: "asc" }, { order: "asc" }],
        include: { _count: { select: { questions: true } } },
      },
    },
  });
  if (!stage) notFound();

  return (
    <div className="space-y-6">
      <BandStageForm
        initial={{
          id: stage.id,
          fromBand: stage.fromBand,
          toBand: stage.toBand,
          title: stage.title,
          subtitle: stage.subtitle,
          description: stage.description,
          order: stage.order,
          reading: stage.reading,
          listening: stage.listening,
          writing: stage.writing,
          speaking: stage.speaking,
        }}
      />

      <div className="max-w-4xl space-y-3">
        <h2 className="text-xl font-extrabold">Bài tập gắn vào chặng</h2>
        <p className="text-sm text-muted-foreground">
          Bấm "Thêm" để tạo đề mới và tự gắn vào chặng này. User sẽ thấy đề ngay trong{" "}
          <code>/band-climber/{stage.id}</code>.
        </p>

        <ExerciseHub
          stageId={stage.id}
          title="Reading"
          icon={BookOpen}
          accent="emerald"
          gradFrom="from-emerald-500"
          gradTo="to-teal-500"
          newHref={`/admin/reading/new?stageId=${stage.id}`}
          items={stage.readingTests.map((t) => ({
            id: t.id,
            label: `${t.title}`,
            sub: t.level,
            editHref: `/admin/reading/${t.id}`,
            deleteEndpoint: `/api/admin/reading/${t.id}`,
          }))}
        />
        <ExerciseHub
          stageId={stage.id}
          title="Listening"
          icon={Headphones}
          accent="amber"
          gradFrom="from-amber-500"
          gradTo="to-orange-500"
          newHref={`/admin/listening/new?stageId=${stage.id}`}
          items={stage.listeningTests.map((t) => ({
            id: t.id,
            label: t.title,
            sub: null,
            editHref: `/admin/listening/${t.id}`,
            deleteEndpoint: `/api/admin/listening/${t.id}`,
          }))}
        />
        <ExerciseHub
          stageId={stage.id}
          title="Writing"
          icon={PenLine}
          accent="rose"
          gradFrom="from-rose-500"
          gradTo="to-pink-500"
          newHref={`/admin/writing/new?stageId=${stage.id}`}
          items={stage.writingTasks.map((t) => ({
            id: t.id,
            label: t.prompt.split("\n")[0].slice(0, 80),
            sub: `Task ${t.taskType}`,
            editHref: `/admin/writing/${t.id}`,
            deleteEndpoint: `/api/admin/writing/${t.id}`,
          }))}
        />
        <ExerciseHub
          stageId={stage.id}
          title="Speaking"
          icon={Mic}
          accent="indigo"
          gradFrom="from-indigo-500"
          gradTo="to-violet-500"
          newHref={`/admin/speaking/new?stageId=${stage.id}`}
          items={stage.speakingSets.map((s) => ({
            id: s.id,
            label: s.topic,
            sub: null,
            editHref: `/admin/speaking/${s.id}`,
            deleteEndpoint: `/api/admin/speaking/${s.id}`,
          }))}
        />

        {/* Duolingo-style mini-quizzes — short questions inside a band stage.
            Each has N image/text-choice questions with progress bar + green/red
            feedback. Admin can create them per skill. */}
        <Card className="border-2 border-violet-200">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                  <Plus className="h-4 w-4" />
                </div>
                <span>
                  Mini-quiz (Duolingo style){" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({stage.miniQuizzes.length})
                  </span>
                </span>
              </CardTitle>
              <Button asChild size="sm">
                <Link href={`/admin/band-climber/${stage.id}/mini-quiz/new`}>
                  <Plus className="h-4 w-4" /> Thêm mini-quiz
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stage.miniQuizzes.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center text-xs text-muted-foreground">
                Chưa có mini-quiz nào — bấm "Thêm" để tạo các câu hỏi ngắn kiểu Duolingo.
              </div>
            ) : (
              <ul className="space-y-2">
                {stage.miniQuizzes.map((q) => (
                  <li
                    key={q.id}
                    className="flex items-center gap-2 rounded-lg border bg-card p-2.5"
                  >
                    <span className="rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 text-[10px] font-bold uppercase">
                      {q.skill}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{q.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {q._count.questions} câu hỏi
                      </div>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/band-climber/${stage.id}/mini-quiz/${q.id}`}>
                        <Pencil className="h-3.5 w-3.5" /> Sửa
                      </Link>
                    </Button>
                    <DeleteTestButton
                      endpoint={`/api/admin/mini-quizzes/${q.id}`}
                      name={q.title}
                      kind="mini-quiz"
                      size="sm"
                      label=""
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ExerciseHub({
  title,
  icon: Icon,
  accent,
  gradFrom,
  gradTo,
  newHref,
  items,
}: {
  stageId: string;
  title: string;
  icon: React.ElementType;
  accent: "emerald" | "amber" | "rose" | "indigo";
  gradFrom: string;
  gradTo: string;
  newHref: string;
  items: {
    id: string;
    label: string;
    sub: string | null;
    editHref: string;
    deleteEndpoint: string;
  }[];
}) {
  const borderClass = {
    emerald: "border-emerald-200",
    amber: "border-amber-200",
    rose: "border-rose-200",
    indigo: "border-indigo-200",
  }[accent];
  return (
    <Card className={`border-2 ${borderClass}`}>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <div
              className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${gradFrom} ${gradTo} text-white`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <span>
              {title} <span className="text-sm font-normal text-muted-foreground">({items.length})</span>
            </span>
          </CardTitle>
          <Button asChild size="sm">
            <Link href={newHref}>
              <Plus className="h-4 w-4" /> Thêm {title}
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center text-xs text-muted-foreground">
            Chưa có đề {title} nào — bấm "Thêm" để tạo bài đầu tiên.
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li
                key={it.id}
                className="flex items-center gap-2 rounded-lg border bg-card p-2.5"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{it.label}</div>
                  {it.sub && (
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
                      {it.sub}
                    </div>
                  )}
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={it.editHref}>
                    <Pencil className="h-3.5 w-3.5" /> Sửa
                  </Link>
                </Button>
                <DeleteTestButton
                  endpoint={it.deleteEndpoint}
                  name={it.label}
                  kind="đề"
                  size="sm"
                  label=""
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
