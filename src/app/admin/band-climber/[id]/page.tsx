import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  BookOpen,
  Headphones,
  PenLine,
  Mic,
  Plus,
  Pencil,
  Brain,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BandStageForm } from "@/components/admin/band-stage-form";
import { DeleteTestButton } from "@/components/admin/delete-test-button";

type SkillKey = "READING" | "LISTENING" | "WRITING" | "SPEAKING";

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

  // Pre-bucket mini-quizzes by skill so each ExerciseHub gets only its
  // own — admin authors the quizzes inside the matching skill card now.
  const quizzesBySkill: Record<SkillKey, typeof stage.miniQuizzes> = {
    READING: [],
    LISTENING: [],
    WRITING: [],
    SPEAKING: [],
  };
  for (const q of stage.miniQuizzes) {
    const k = q.skill as SkillKey;
    if (k in quizzesBySkill) quizzesBySkill[k].push(q);
  }

  const renderQuizItems = (skill: SkillKey) =>
    quizzesBySkill[skill].map((q) => ({
      id: q.id,
      title: q.title,
      questionCount: q._count.questions,
      editHref: `/admin/band-climber/${stage.id}/mini-quiz/${q.id}`,
      deleteEndpoint: `/api/admin/mini-quizzes/${q.id}`,
    }));

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
          tipsShowOnTest: stage.tipsShowOnTest,
          tipsShowOnMiniQuiz: stage.tipsShowOnMiniQuiz,
        }}
      />

      <div className="max-w-4xl space-y-3">
        <h2 className="text-xl font-extrabold">Câu hỏi gắn vào chặng</h2>
        <p className="text-sm text-muted-foreground">
          Mỗi card kỹ năng nhận 2 dạng câu hỏi gộp chung 1 danh sách:{" "}
          <strong className="text-foreground">Bài dài</strong> (IELTS đầy đủ) và{" "}
          <strong className="text-foreground">Quiz</strong> (Duolingo ngắn). User sẽ thấy ngay trong{" "}
          <code>/band-climber/{stage.id}</code>.
        </p>

        <ExerciseHub
          stageId={stage.id}
          skill="READING"
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
          quizzes={renderQuizItems("READING")}
        />
        <ExerciseHub
          stageId={stage.id}
          skill="LISTENING"
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
          quizzes={renderQuizItems("LISTENING")}
        />
        <ExerciseHub
          stageId={stage.id}
          skill="WRITING"
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
          quizzes={renderQuizItems("WRITING")}
        />
        <ExerciseHub
          stageId={stage.id}
          skill="SPEAKING"
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
          quizzes={renderQuizItems("SPEAKING")}
        />
      </div>
    </div>
  );
}

function ExerciseHub({
  stageId,
  skill,
  title,
  icon: Icon,
  accent,
  gradFrom,
  gradTo,
  newHref,
  items,
  quizzes,
}: {
  stageId: string;
  skill: SkillKey;
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
  // Duolingo-style mini-quizzes scoped to this skill. Authored inline so
  // admin sees them alongside the long-form tests of the same skill.
  quizzes: {
    id: string;
    title: string;
    questionCount: number;
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
  const totalCount = items.length + quizzes.length;
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
              {title}{" "}
              <span className="text-sm font-normal text-muted-foreground">({totalCount})</span>
            </span>
          </CardTitle>
          {/* Two side-by-side add buttons — long test and quiz both create
              "câu hỏi" for the same chặng, just in different forms. They
              share one unified list below. */}
          <div className="flex gap-1.5">
            <Button asChild size="sm">
              <Link href={newHref}>
                <Plus className="h-4 w-4" /> Bài dài
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-violet-300 text-violet-700 hover:bg-violet-100"
            >
              <Link href={`/admin/band-climber/${stageId}/mini-quiz/new?skill=${skill}`}>
                <Brain className="h-4 w-4" /> Quiz
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {totalCount === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center text-xs text-muted-foreground">
            Chưa có câu hỏi nào cho {title} — bấm "Bài dài" hoặc "Quiz" để tạo bài đầu tiên.
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li
                key={`test-${it.id}`}
                className="flex items-center gap-2 rounded-lg border bg-card p-2.5"
              >
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-br ${gradFrom} ${gradTo} text-white`}>
                  Bài dài
                </span>
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
            {quizzes.map((q) => (
              <li
                key={`quiz-${q.id}`}
                className="flex items-center gap-2 rounded-lg border bg-card p-2.5"
              >
                <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                  <Brain className="h-3 w-3" /> Quiz
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{q.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {q.questionCount} câu hỏi
                  </div>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={q.editHref}>
                    <Pencil className="h-3.5 w-3.5" /> Sửa
                  </Link>
                </Button>
                <DeleteTestButton
                  endpoint={q.deleteEndpoint}
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
  );
}
