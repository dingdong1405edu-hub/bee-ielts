import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAdminActivity } from "@/lib/admin-activity";

const optionSchema = z.object({
  label: z.string().min(1).max(80),
  imageUrl: z.string().url().optional().or(z.literal("")),
});
const questionSchema = z
  .object({
    // SPEAKING type asks the learner to record themselves answering the
    // prompt — no options, no objectively-correct answer. The Whisper /
    // Deepgram STT pipeline transcribes the take so the learner sees what
    // they actually said.
    type: z.enum(["IMAGE_CHOICE", "TEXT_CHOICE", "FILL_BLANK", "SPEAKING"]),
    prompt: z.string().min(1).max(400),
    // Optional mp3/ogg URL — player shows a Listen button when present.
    audioUrl: z.string().url().optional().or(z.literal("")),
    options: z.array(optionSchema).max(8).default([]),
    correctIndex: z.number().int().min(0).default(0),
    // Admin's reasoning surfaced in the player verdict bar after the
    // learner answers — explains why the correct option is right + why
    // distractors are wrong. Empty / undefined = no explanation row.
    explanation: z.string().max(1200).optional().or(z.literal("")),
    // IELTS Speaking Part-2 cue-card bullets. Only meaningful for SPEAKING
    // questions; switches the player to Part-2 flow (prep + timed speak)
    // when present + non-empty.
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
// Tour shape mirrors what BeeGuide consumes — kept permissive so admin
// can add/remove keys as the BandClimbToursEditor evolves.
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

const createSchema = z.object({
  bandStageId: z.string(),
  skill: z.enum(["READING", "LISTENING", "WRITING", "SPEAKING"]),
  title: z.string().min(1).max(120),
  questions: z.array(questionSchema).min(1),
  bandClimbTips: z.array(tourStepSchema).nullable().optional(),
  vocabPack: z.array(vocabPackItemSchema).max(80).nullable().optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") return null;
  return session;
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad input", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // Validate correctIndex falls within options for each question. SPEAKING
  // questions don't have a "correct" option so the check is skipped.
  for (const q of data.questions) {
    if (q.type === "SPEAKING") continue;
    if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
      return NextResponse.json(
        { error: `correctIndex ngoài phạm vi cho câu: ${q.prompt.slice(0, 50)}` },
        { status: 400 },
      );
    }
  }

  try {
    const last = await prisma.bandClimbMiniQuiz.findFirst({
      where: { bandStageId: data.bandStageId, skill: data.skill },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const quiz = await prisma.bandClimbMiniQuiz.create({
      data: {
        bandStageId: data.bandStageId,
        skill: data.skill,
        title: data.title,
        order: (last?.order ?? -1) + 1,
        bandClimbTips: data.bandClimbTips && data.bandClimbTips.length > 0
          ? data.bandClimbTips
          : undefined,
        vocabPack: data.vocabPack && data.vocabPack.length > 0
          ? data.vocabPack
          : undefined,
        questions: {
          create: data.questions.map((q, i) => ({
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
            cueCardPoints:
              q.type === "SPEAKING" && q.cueCardPoints && q.cueCardPoints.length > 0
                ? q.cueCardPoints
                : undefined,
          })),
        },
      },
      include: { questions: true },
    });
    await logAdminActivity({
      action: "CREATE",
      entityType: "MINI_QUIZ",
      entityId: quiz.id,
      entityTitle: `[${quiz.skill}] ${quiz.title}`,
      entityHref: `/admin/band-climber/${quiz.bandStageId}`,
    });
    return NextResponse.json({ quiz });
  } catch (e) {
    console.error("[admin/mini-quizzes POST]", e);
    return NextResponse.json({ error: "Tạo mini-quiz thất bại" }, { status: 500 });
  }
}
