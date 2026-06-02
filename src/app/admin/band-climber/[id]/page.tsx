import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { BandStageForm } from "@/components/admin/band-stage-form";
import { SkillHubsClient, SKILL_ICONS } from "./skill-hubs-client";

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
      // Hydrate full question payload so the inline modal can pre-fill
      // without a second roundtrip when admin clicks Sửa on a quiz row.
      miniQuizzes: {
        orderBy: [{ skill: "asc" }, { order: "asc" }],
        include: {
          questions: { orderBy: { order: "asc" } },
          _count: { select: { questions: true } },
        },
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
      skill: q.skill as SkillKey,
      questions: q.questions.map((qq) => ({
        type: qq.type as "IMAGE_CHOICE" | "TEXT_CHOICE" | "FILL_BLANK",
        prompt: qq.prompt,
        audioUrl: qq.audioUrl ?? undefined,
        options: qq.options as { label: string; imageUrl?: string }[],
        correctIndex: qq.correctIndex,
      })),
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
          <strong className="text-foreground">Quiz</strong> (Duolingo ngắn — sửa/tạo
          ngay tại trang này, không phải mở trang khác). User sẽ thấy ngay trong{" "}
          <code>/band-climber/{stage.id}</code>.
        </p>

        <SkillHubsClient
          stage={{
            id: stage.id,
            title: stage.title,
            fromBand: stage.fromBand,
            toBand: stage.toBand,
          }}
          hubs={[
            {
              skill: "READING",
              title: "Reading",
              icon: SKILL_ICONS.READING,
              gradFrom: "from-emerald-500",
              gradTo: "to-teal-500",
              border: "border-emerald-200",
              newHref: `/admin/reading/new?stageId=${stage.id}`,
              items: stage.readingTests.map((t) => ({
                id: t.id,
                label: t.title,
                sub: t.level,
                editHref: `/admin/reading/${t.id}`,
                deleteEndpoint: `/api/admin/reading/${t.id}`,
              })),
              quizzes: renderQuizItems("READING"),
            },
            {
              skill: "LISTENING",
              title: "Listening",
              icon: SKILL_ICONS.LISTENING,
              gradFrom: "from-amber-500",
              gradTo: "to-orange-500",
              border: "border-amber-200",
              newHref: `/admin/listening/new?stageId=${stage.id}`,
              items: stage.listeningTests.map((t) => ({
                id: t.id,
                label: t.title,
                sub: null,
                editHref: `/admin/listening/${t.id}`,
                deleteEndpoint: `/api/admin/listening/${t.id}`,
              })),
              quizzes: renderQuizItems("LISTENING"),
            },
            {
              skill: "WRITING",
              title: "Writing",
              icon: SKILL_ICONS.WRITING,
              gradFrom: "from-rose-500",
              gradTo: "to-pink-500",
              border: "border-rose-200",
              newHref: `/admin/writing/new?stageId=${stage.id}`,
              items: stage.writingTasks.map((t) => ({
                id: t.id,
                label: t.prompt.split("\n")[0].slice(0, 80),
                sub: `Task ${t.taskType}`,
                editHref: `/admin/writing/${t.id}`,
                deleteEndpoint: `/api/admin/writing/${t.id}`,
              })),
              quizzes: renderQuizItems("WRITING"),
            },
            {
              skill: "SPEAKING",
              title: "Speaking",
              icon: SKILL_ICONS.SPEAKING,
              gradFrom: "from-indigo-500",
              gradTo: "to-violet-500",
              border: "border-indigo-200",
              newHref: `/admin/speaking/new?stageId=${stage.id}`,
              items: stage.speakingSets.map((s) => ({
                id: s.id,
                label: s.topic,
                sub: null,
                editHref: `/admin/speaking/${s.id}`,
                deleteEndpoint: `/api/admin/speaking/${s.id}`,
              })),
              quizzes: renderQuizItems("SPEAKING"),
            },
          ]}
        />
      </div>
    </div>
  );
}

