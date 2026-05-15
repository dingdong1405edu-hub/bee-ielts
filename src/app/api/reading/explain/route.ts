import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { explainReadingGroq } from "@/lib/groq";

const schema = z.object({
  passage: z.string().min(20),
  questionPrompt: z.string().min(1),
  questionType: z.string(),
  options: z.array(z.string()).nullable().optional(),
  correctAnswer: z.string(),
  userAnswer: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });

  try {
    const result = await explainReadingGroq(parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[reading explain]", e);
    return NextResponse.json({ error: "Explain failed" }, { status: 500 });
  }
}

export const maxDuration = 30;
