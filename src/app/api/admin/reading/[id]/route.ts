import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  title: z.string().min(1),
  passage: z.string().min(50),
  imageUrl: z.string().url().nullable().optional(),
  bank: z.enum(["PRACTICE", "MOCK"]).default("PRACTICE"),
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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.readingTest.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy bài" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { title, passage, imageUrl, bank, questions } = parsed.data;

  // Replace the whole question set so the editor is the single source of truth.
  await prisma.$transaction([
    prisma.question.deleteMany({ where: { readingId: id } }),
    prisma.readingTest.update({
      where: { id },
      data: {
        title,
        passage,
        imageUrl: imageUrl ?? null,
        bank,
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
    }),
  ]);

  return NextResponse.json({ id });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const existing = await prisma.readingTest.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy bài" }, { status: 404 });
  await prisma.readingTest.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
