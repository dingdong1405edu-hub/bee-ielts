import Link from "next/link";
import { prisma } from "@/lib/db";
import { Skill } from "@prisma/client";
import { Brain, ChevronRight, ListChecks } from "lucide-react";

const SKILL_LABEL: Record<string, string> = {
  READING: "Reading",
  LISTENING: "Listening",
  WRITING: "Writing",
  SPEAKING: "Speaking",
};

const SKILL_QS: Record<string, string> = {
  READING: "reading",
  LISTENING: "listening",
  WRITING: "writing",
  SPEAKING: "speaking",
};

/**
 * Pull every Duolingo-style mini-quiz attached to any band-climb stage for
 * this skill and render them as a tidy list on the section landing. Clicking
 * one routes to the existing player; the `?from=<skill>` param lets the
 * player return the user back to this section page instead of the band
 * stage they were originally created under.
 */
export async function MiniQuizList({ skill }: { skill: Skill }) {
  const quizzes = await prisma.bandClimbMiniQuiz.findMany({
    where: { skill },
    orderBy: [{ bandStage: { fromBand: "asc" } }, { order: "asc" }],
    select: {
      id: true,
      title: true,
      bandStageId: true,
      bandStage: { select: { fromBand: true, toBand: true, title: true } },
      _count: { select: { questions: true } },
    },
  });

  if (quizzes.length === 0) return null;

  const label = SKILL_LABEL[skill] ?? skill;
  const fromQs = SKILL_QS[skill] ?? skill.toLowerCase();

  return (
    <section className="max-w-4xl mx-auto space-y-3">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Mini-quiz {label}</h2>
            <p className="text-sm text-muted-foreground">
              Câu hỏi ngắn kiểu Duolingo — luyện nhanh, có nhận xét đúng/sai từng câu.
            </p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {quizzes.map((q) => (
          <Link
            key={q.id}
            href={`/band-climber/${q.bandStageId}/mini-quiz/${q.id}?from=${fromQs}`}
            className="group relative overflow-hidden rounded-2xl border-2 bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:border-violet-300"
          >
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 opacity-15 blur-2xl transition-opacity group-hover:opacity-30" />
            <div className="relative flex items-start gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-violet-100 text-violet-700 shrink-0">
                <ListChecks className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-extrabold uppercase tracking-wider text-violet-600">
                  Band {q.bandStage.fromBand} → {q.bandStage.toBand}
                </div>
                <div className="font-extrabold leading-tight truncate">{q.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {q._count.questions} câu · {q.bandStage.title}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
