import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { SAMPLE_READING_4_TO_5 } from "@/lib/band-climber-reading-sample";

/**
 * Idempotent admin action: create the sample 4.0 → 5.0 Reading practice
 * test and attach it to that stage. Skips creation if a test with the same
 * title is already attached to the stage. Returns the test id so the admin
 * UI can deep-link straight to it.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN" && session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stage = await prisma.bandStage.findUnique({
    where: { fromBand_toBand: { fromBand: 4.0, toBand: 5.0 } },
  });
  if (!stage) {
    return NextResponse.json(
      { error: "Chưa có chặng 4→5. Bấm 'Tạo 3 chặng mặc định' trước." },
      { status: 400 },
    );
  }

  const existing = await prisma.readingTest.findFirst({
    where: { bandStageId: stage.id, title: SAMPLE_READING_4_TO_5.title },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ created: false, testId: existing.id, stageId: stage.id });
  }

  const test = await prisma.readingTest.create({
    data: {
      title: SAMPLE_READING_4_TO_5.title,
      level: SAMPLE_READING_4_TO_5.level,
      passage: SAMPLE_READING_4_TO_5.passage,
      timeLimit: SAMPLE_READING_4_TO_5.timeLimit,
      bank: "PRACTICE",
      bandStageId: stage.id,
      questions: {
        create: SAMPLE_READING_4_TO_5.questions.map((q) => ({
          type: q.type,
          prompt: q.prompt,
          options: q.options ?? undefined,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          order: q.order,
        })),
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ created: true, testId: test.id, stageId: stage.id });
}
