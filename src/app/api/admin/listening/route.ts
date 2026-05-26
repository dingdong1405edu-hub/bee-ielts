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
  bandStageId: z.string().nullable().optional(),
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

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { title, audioUrl, imageUrl, contentImageUrl, transcript, bank, section, bandStageId, questions } = parsed.data;

  const test = await prisma.listeningTest.create({
    data: {
      title,
      audioUrl,
      imageUrl: imageUrl ?? null,
      contentImageUrl: contentImageUrl ?? null,
      transcript: transcript || null,
      bank,
      section: section ?? null,
      bandStageId: bandStageId ?? null,
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

  return NextResponse.json({ id: test.id });
}
