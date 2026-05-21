import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  title: z.string().min(1),
  audioUrl: z.string().min(1),
  imageUrl: z.string().url().nullable().optional(),
  transcript: z.string().optional(),
  bank: z.enum(["PRACTICE", "MOCK"]).default("PRACTICE"),
  questions: z
    .array(
      z.object({
        type: z.enum(["MCQ", "FILL_BLANK", "TRUE_FALSE_NOT_GIVEN", "SHORT_ANSWER"]),
        prompt: z.string().min(1),
        options: z.array(z.string()).optional(),
        correctAnswer: z.string().min(1),
        explanation: z.string().optional(),
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
  const { title, audioUrl, imageUrl, transcript, bank, questions } = parsed.data;

  const test = await prisma.listeningTest.create({
    data: {
      title,
      audioUrl,
      imageUrl: imageUrl ?? null,
      transcript: transcript || null,
      bank,
      questions: {
        create: questions.map((q, i) => ({
          type: q.type,
          prompt: q.prompt,
          options: q.options && q.options.length > 0 ? q.options : undefined,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          order: i + 1,
        })),
      },
    },
  });

  return NextResponse.json({ id: test.id });
}
