import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAdminActivity } from "@/lib/admin-activity";

const optionSchema = z.object({
  label: z.string().min(1).max(80),
  imageUrl: z.string().url().optional().or(z.literal("")),
});
const questionSchema = z
  .object({
    type: z.enum(["IMAGE_CHOICE", "TEXT_CHOICE", "FILL_BLANK", "SPEAKING"]),
    prompt: z.string().min(1).max(400),
    audioUrl: z.string().url().optional().or(z.literal("")),
    options: z.array(optionSchema).max(8).default([]),
    correctIndex: z.number().int().min(0).default(0),
    explanation: z.string().max(1200).optional().or(z.literal("")),
    cueCardPoints: z.array(z.string().min(1).max(200)).max(6).optional(),
  })
  .refine(
    (q) =>
      q.type === "SPEAKING" ||
      q.type === "FILL_BLANK" ||
      q.options.length >= 2,
    {
      message: "Choice-type questions need at least 2 options",
      path: ["options"],
    },
  )
  .refine((q) => q.type !== "FILL_BLANK" || q.options.length >= 1, {
    message: "Fill-blank needs at least 1 accepted answer",
    path: ["options"],
  });
const tourStepSchema = z.object({
  target: z.string(),
  targetQuestionId: z.string().nullable().optional(),
  title: z.string(),
  body: z.string(),
  highlights: z
    .array(z.object({ label: z.string(), items: z.array(z.string()) }))
    .optional(),
  ctaLabel: z.string().optional(),
});

const vocabPackItemSchema = z.object({
  term: z.string().min(1).max(120),
  definition: z.string().min(1).max(500),
  example: z.string().max(500).optional().or(z.literal("")),
});

const patchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  skill: z.enum(["READING", "LISTENING", "WRITING", "SPEAKING"]).optional(),
  questions: z.array(questionSchema).optional(),
  bandClimbTips: z.array(tourStepSchema).nullable().optional(),
  vocabPack: z.array(vocabPackItemSchema).max(80).nullable().optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN" && (session.user as { role?: string }).role !== "OWNER") return null;
  return session;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });

  try {
    // If questions changed, replace the full set — simplest correct semantics
    // for a quiz this size (admin edits are bulk, not per-question).
    if (parsed.data.questions) {
      for (const q of parsed.data.questions) {
        if (q.type === "SPEAKING") continue;
        if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
          return NextResponse.json(
            { error: `correctIndex ngoài phạm vi: ${q.prompt.slice(0, 50)}` },
            { status: 400 },
          );
        }
      }
      await prisma.miniQuestion.deleteMany({ where: { miniQuizId: id } });
      await prisma.miniQuestion.createMany({
        data: parsed.data.questions.map((q, i) => ({
          miniQuizId: id,
          type: q.type,
          prompt: q.prompt,
          audioUrl: q.audioUrl ? q.audioUrl : null,
          options: q.options.map((o) => ({
            label: o.label,
            ...(o.imageUrl ? { imageUrl: o.imageUrl } : {}),
          })),
          correctIndex: q.correctIndex,
          order: i,
          explanation: q.explanation ? q.explanation : null,
          // undefined keeps the column null (and lets createMany handle the
          // Json type the same way the create() call above does).
          cueCardPoints:
            q.type === "SPEAKING" && q.cueCardPoints && q.cueCardPoints.length > 0
              ? q.cueCardPoints
              : undefined,
        })),
      });
    }
    const { questions: _drop, bandClimbTips, vocabPack, ...rest } = parsed.data;
    const quiz = await prisma.bandClimbMiniQuiz.update({
      where: { id },
      data: {
        ...rest,
        // undefined = keep existing tour; empty/null = clear via JsonNull.
        ...(bandClimbTips !== undefined
          ? {
              bandClimbTips:
                bandClimbTips && bandClimbTips.length > 0
                  ? (bandClimbTips as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
            }
          : {}),
        ...(vocabPack !== undefined
          ? {
              vocabPack:
                vocabPack && vocabPack.length > 0
                  ? (vocabPack as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
            }
          : {}),
      },
      include: { questions: { orderBy: { order: "asc" } } },
    });
    await logAdminActivity({
      action: "UPDATE",
      entityType: "MINI_QUIZ",
      entityId: quiz.id,
      entityTitle: `[${quiz.skill}] ${quiz.title}`,
      entityHref: `/admin/band-climber/${quiz.bandStageId}`,
    });
    return NextResponse.json({ quiz });
  } catch (e) {
    console.error("[admin/mini-quizzes PATCH]", e);
    return NextResponse.json({ error: "Cập nhật thất bại" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  try {
    const existing = await prisma.bandClimbMiniQuiz.findUnique({
      where: { id },
      select: { title: true, skill: true },
    });
    await prisma.bandClimbMiniQuiz.delete({ where: { id } });
    if (existing) {
      await logAdminActivity({
        action: "DELETE",
        entityType: "MINI_QUIZ",
        entityId: id,
        entityTitle: `[${existing.skill}] ${existing.title}`,
        entityHref: null,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/mini-quizzes DELETE]", e);
    return NextResponse.json({ error: "Xóa thất bại" }, { status: 500 });
  }
}
