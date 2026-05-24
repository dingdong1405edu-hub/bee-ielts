import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  title: z.string().min(1),
  audioUrl: z.string().min(1),
  // imageUrl / contentImageUrl may be a public URL or an uploaded data: URL,
  // so they are validated as non-empty strings rather than strict URLs.
  imageUrl: z.string().min(1).nullable().optional(),
  contentImageUrl: z.string().min(1).nullable().optional(),
  transcript: z.string().optional(),
  bank: z.enum(["PRACTICE", "MOCK"]).default("PRACTICE"),
  section: z.number().int().min(1).max(4).nullable().optional(),
  questions: z
    .array(
      z.object({
        type: z.enum(["MCQ", "FILL_BLANK", "TRUE_FALSE_NOT_GIVEN", "SHORT_ANSWER", "MATCHING_HEADINGS", "MATCHING"]),
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

  const existing = await prisma.listeningTest.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy bài" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { title, audioUrl, imageUrl, contentImageUrl, transcript, bank, section, questions } = parsed.data;

  await prisma.$transaction([
    prisma.question.deleteMany({ where: { listeningId: id } }),
    prisma.listeningTest.update({
      where: { id },
      data: {
        title,
        audioUrl,
        imageUrl: imageUrl ?? null,
        contentImageUrl: contentImageUrl ?? null,
        transcript: transcript || null,
        bank,
        section: section ?? null,
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
  const existing = await prisma.listeningTest.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy bài" }, { status: 404 });
  await prisma.listeningTest.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
