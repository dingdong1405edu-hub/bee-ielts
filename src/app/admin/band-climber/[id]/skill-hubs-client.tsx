"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Headphones, PenLine, Mic, Plus, Pencil, Brain, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeleteTestButton } from "@/components/admin/delete-test-button";
import { MiniQuizForm } from "./mini-quiz/mini-quiz-form";

type Skill = "READING" | "LISTENING" | "WRITING" | "SPEAKING";
type QType = "IMAGE_CHOICE" | "TEXT_CHOICE" | "FILL_BLANK" | "SPEAKING";

interface TestItem {
  id: string;
  label: string;
  sub: string | null;
  editHref: string;
  deleteEndpoint: string;
}

interface TourStepLite {
  target: string;
  targetQuestionId?: string | null;
  title: string;
  body: string;
  highlights?: { label: string; items: string[] }[];
  ctaLabel?: string;
}

interface VocabItemLite {
  term: string;
  definition: string;
  example?: string;
}

interface QuizItem {
  id: string;
  title: string;
  questionCount: number;
  // Full question payload — included so the edit modal can hydrate without
  // a second fetch. Mirrors what /admin/band-climber/[id]/mini-quiz/[quizId]
  // already returns.
  skill: Skill;
  tour: TourStepLite[];
  vocabPack: VocabItemLite[];
  questions: {
    type: QType;
    prompt: string;
    audioUrl?: string;
    options: { label: string; imageUrl?: string }[];
    correctIndex: number;
    explanation?: string;
    cueCardPoints?: string[];
  }[];
  deleteEndpoint: string;
}

interface SkillHubData {
  skill: Skill;
  title: string;
  gradFrom: string;
  gradTo: string;
  border: string;
  newHref: string;
  items: TestItem[];
  quizzes: QuizItem[];
}

// Icon lookup table lives in the client bundle so the parent server
// component never has to ship React function components across the
// server/client boundary (which Next.js can't serialize).
const SKILL_ICON_MAP: Record<Skill, React.ElementType> = {
  READING: BookOpen,
  LISTENING: Headphones,
  WRITING: PenLine,
  SPEAKING: Mic,
};

/** State + modal host for the 4 ExerciseHubs on a band-stage admin page.
 *  Clicking "+ Quiz" or "Sửa" on a quiz row opens an inline modal so the
 *  admin never has to leave the chặng page — keeps the authoring flow
 *  seamless instead of bouncing to a separate route per quiz. */
export function SkillHubsClient({
  stage,
  hubs,
}: {
  stage: { id: string; title: string; fromBand: number; toBand: number };
  hubs: SkillHubData[];
}) {
  // null = modal closed. { skill, quiz? } = modal open in create or edit mode.
  const [editing, setEditing] = useState<
    | null
    | {
        skill: Skill;
        quiz: QuizItem | null;
      }
  >(null);
  const router = useRouter();

  return (
    <>
      {hubs.map((hub) => (
        <SkillHubCard
          key={hub.skill}
          hub={hub}
          onAddQuiz={() => setEditing({ skill: hub.skill, quiz: null })}
          onEditQuiz={(q) => setEditing({ skill: hub.skill, quiz: q })}
        />
      ))}

      {editing && (
        <QuizModal
          stage={stage}
          mode={editing.quiz ? "edit" : "create"}
          initial={
            editing.quiz
              ? {
                  id: editing.quiz.id,
                  title: editing.quiz.title,
                  skill: editing.quiz.skill,
                  tour: editing.quiz.tour,
                  vocabPack: editing.quiz.vocabPack,
                  questions: editing.quiz.questions.map((q) => ({
                    type: q.type,
                    prompt: q.prompt,
                    audioUrl: q.audioUrl ?? "",
                    options: q.options,
                    correctIndex: q.correctIndex,
                    explanation: q.explanation ?? "",
                    cueCardPoints: q.cueCardPoints ?? [],
                  })),
                }
              : undefined
          }
          defaultSkill={editing.skill}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function SkillHubCard({
  hub,
  onAddQuiz,
  onEditQuiz,
}: {
  hub: SkillHubData;
  onAddQuiz: () => void;
  onEditQuiz: (q: QuizItem) => void;
}) {
  const Icon = SKILL_ICON_MAP[hub.skill];
  const totalCount = hub.items.length + hub.quizzes.length;
  return (
    <Card className={`border-2 ${hub.border}`}>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <div
              className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${hub.gradFrom} ${hub.gradTo} text-white`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <span>
              {hub.title}{" "}
              <span className="text-sm font-normal text-muted-foreground">({totalCount})</span>
            </span>
          </CardTitle>
          <div className="flex gap-1.5">
            <Button asChild size="sm">
              <Link href={hub.newHref}>
                <Plus className="h-4 w-4" /> Bài dài
              </Link>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-honey/50 text-honey-deep hover:bg-honey-tint"
              onClick={onAddQuiz}
            >
              <Brain className="h-4 w-4" /> Quiz
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {totalCount === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center text-xs text-muted-foreground">
            Chưa có câu hỏi nào cho {hub.title} — bấm "Bài dài" hoặc "Quiz" để tạo bài đầu tiên.
          </div>
        ) : (
          <ul className="space-y-2">
            {hub.items.map((it) => (
              <li key={`test-${it.id}`} className="flex items-center gap-2 rounded-lg border bg-card p-2.5">
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-br ${hub.gradFrom} ${hub.gradTo} text-white`}
                >
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
            {hub.quizzes.map((q) => (
              <li key={`quiz-${q.id}`} className="flex items-center gap-2 rounded-lg border bg-card p-2.5">
                <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-gradient-to-br from-honey to-honey-deep text-ink px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                  <Brain className="h-3 w-3" /> Quiz
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{q.title}</div>
                  <div className="text-[11px] text-muted-foreground">{q.questionCount} câu hỏi</div>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => onEditQuiz(q)}>
                  <Pencil className="h-3.5 w-3.5" /> Sửa
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

/** Slide-up modal hosting the MiniQuizForm in embedded mode. Reuses the
 *  same form component the standalone /mini-quiz/new + [quizId] pages use,
 *  just with onSaved + onCancel callbacks instead of route navigation. */
function QuizModal({
  stage,
  mode,
  initial,
  defaultSkill,
  onClose,
  onSaved,
}: {
  stage: { id: string; title: string; fromBand: number; toBand: number };
  mode: "create" | "edit";
  initial?: {
    id: string;
    title: string;
    skill: Skill;
    tour?: TourStepLite[] | null;
    vocabPack?: VocabItemLite[] | null;
    questions: {
      type: QType;
      prompt: string;
      audioUrl?: string;
      options: { label: string; imageUrl?: string }[];
      correctIndex: number;
      explanation?: string;
      cueCardPoints?: string[];
    }[];
  };
  defaultSkill?: Skill;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Full-screen editor — admins asked for the form to take the whole
  // viewport so the long question list has room to breathe. The backdrop
  // click-to-close + max-width-4xl card pattern was useful while the form
  // was short, but it caps the working area unnecessarily once questions
  // start to scroll. We keep the gradient hero strip + X button so the
  // close action is still obvious (no backdrop = clicking outside no
  // longer dismisses).
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="sticky top-0 z-10 bg-gradient-to-r from-honey to-honey-deep text-ink px-5 md:px-8 py-4 flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest opacity-80 font-bold">
            {mode === "create" ? "Tạo Quiz mới" : "Sửa Quiz"} ·{" "}
            {stage.fromBand} → {stage.toBand}
          </div>
          <h2 className="font-extrabold text-lg leading-tight truncate">{stage.title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink/10 hover:bg-ink/20 text-ink"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-5 md:p-8">
          <MiniQuizForm
            stage={stage}
            mode={mode}
            initial={initial}
            defaultSkill={defaultSkill}
            embedded
            onSaved={onSaved}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}

