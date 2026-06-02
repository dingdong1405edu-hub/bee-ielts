import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const optionSchema = z.object({
  label: z.string().min(1).max(80),
  imageUrl: z.string().url().optional().or(z.literal("")),
});
const questionSchema = z
  .object({
    type: z.enum(["IMAGE_CHOICE", "TEXT_CHOICE", "FILL_BLANK"]),
    prompt: z.string().min(1).max(400),
    // Optional mp3/ogg URL — player shows a Listen button when present.
    audioUrl: z.string().url().optional().or(z.literal("")),
    options: z.array(optionSchema).min(1).max(8),
    correctIndex: z.number().int().min(0),
  })
  .refine((q) => q.type === "FILL_BLANK" || q.options.length >= 2, {
    message: "Choice-type questions need at least 2 options",
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

const createSchema = z.object({
  bandStageId: z.string(),
  skill: z.enum(["READING", "LISTENING", "WRITING", "SPEAKING"]),
  title: z.string().min(1).max(120),
  questions: z.array(questionSchema).min(1),
  bandClimbTips: z.array(tourStepSchema).nullable().optional(),
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

  // Validate correctIndex falls within options for each question.
  for (const q of data.questions) {
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
          })),
        },
      },
      include: { questions: true },
    });
    return NextResponse.json({ quiz });
  } catch (e) {
    console.error("[admin/mini-quizzes POST]", e);
    return NextResponse.json({ error: "Tạo mini-quiz thất bại" }, { status: 500 });
  }
}
