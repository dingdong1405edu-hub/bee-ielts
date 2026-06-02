import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toNullableJsonArray } from "@/lib/prisma-json";
import { logAdminActivity } from "@/lib/admin-activity";

const schema = z.object({
  title: z.string().min(1),
  passage: z.string().min(50),
  imageUrl: z.string().url().nullable().optional(),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).default("B1"),
  bank: z.enum(["PRACTICE", "MOCK"]).default("PRACTICE"),
  bandStageId: z.string().nullable().optional(),
  bandClimbTips: z.array(z.unknown()).nullable().optional(),
  questions: z
    .array(
      z.object({
        type: z.enum(["MCQ", "MATCHING_HEADINGS", "FILL_BLANK", "TRUE_FALSE_NOT_GIVEN"]),
        prompt: z.string().min(1),
        options: z.array(z.string()).optional(),
        correctAnswer: z.string().min(1),
        explanation: z.string().optional(),
        formGroup: z.string().optional(),
        displayNumber: z.number().int().min(1).max(999).nullable().optional(),
      }),
    )
    .min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { title, passage, imageUrl, level, bank, bandStageId, bandClimbTips, questions } = parsed.data;

  // timeLimit uses the schema default (1200s); admin picks the CEFR level.
  const test = await prisma.readingTest.create({
    data: {
      title,
      passage,
      imageUrl: imageUrl ?? null,
      level,
      bank,
      bandStageId: bandStageId ?? null,
      bandClimbTips: toNullableJsonArray(bandClimbTips),
      questions: {
        create: questions.map((q, i) => ({
          type: q.type,
          prompt: q.prompt,
          options: q.options && q.options.length > 0 ? q.options : undefined,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          formGroup: q.formGroup || null,
          displayNumber: q.displayNumber ?? null,
          order: i + 1,
        })),
      },
    },
  });

  await logAdminActivity({
    action: "CREATE",
    entityType: "READING_TEST",
    entityId: test.id,
    entityTitle: test.title,
  });

  return NextResponse.json({ id: test.id });
}
