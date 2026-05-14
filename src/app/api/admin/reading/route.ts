import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  title: z.string().min(1),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  timeLimit: z.number().min(60).max(7200),
  passage: z.string().min(50),
  questions: z.array(
    z.object({
      type: z.enum(["MCQ", "FILL_BLANK", "TRUE_FALSE", "MATCHING", "SHORT_ANSWER"]),
      prompt: z.string().min(1),
      options: z.array(z.string()).optional(),
      correctAnswer: z.string().min(1),
      explanation: z.string().optional(),
    }),
  ),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { title, level, timeLimit, passage, questions } = parsed.data;

  const test = await prisma.readingTest.create({
    data: {
      title,
      level,
      timeLimit,
      passage,
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
