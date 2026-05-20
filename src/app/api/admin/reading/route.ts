import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  title: z.string().min(1),
  passage: z.string().min(50),
  bank: z.enum(["PRACTICE", "MOCK"]).default("PRACTICE"),
  questions: z
    .array(
      z.object({
        type: z.enum(["MCQ", "MATCHING_HEADINGS", "FILL_BLANK", "TRUE_FALSE_NOT_GIVEN"]),
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
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { title, passage, bank, questions } = parsed.data;

  // level + timeLimit dùng giá trị mặc định của schema (B1, 1200s) — admin không cần nhập.
  const test = await prisma.readingTest.create({
    data: {
      title,
      passage,
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
