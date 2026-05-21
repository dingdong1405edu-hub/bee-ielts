import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { generateReadingTest, type ReadingImageInput } from "@/lib/claude";

// Claude needs time to read the passage and solve every question.
export const maxDuration = 120;

const bodySchema = z.object({
  rawText: z.string().optional(),
  images: z.array(z.string()).max(8).optional(),
  bank: z.enum(["PRACTICE", "MOCK"]).default("PRACTICE"),
});

/** Shape Claude must return — also what we trust before writing to the DB. */
const resultSchema = z.object({
  title: z.string().trim().min(1),
  passage: z.string().trim().min(50),
  questions: z
    .array(
      z.object({
        type: z.enum(["MCQ", "MATCHING_HEADINGS", "FILL_BLANK", "TRUE_FALSE_NOT_GIVEN"]),
        prompt: z.string().trim().min(1),
        options: z.array(z.string()).optional(),
        correctAnswer: z.string().trim().min(1),
        explanation: z.string().optional(),
      }),
    )
    .min(1),
});

/** Split a `data:image/...;base64,...` URL into the parts Claude needs. */
function parseImageDataUrl(dataUrl: string): ReadingImageInput | null {
  const m = dataUrl.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/);
  if (!m) return null;
  return { mediaType: m[1] as ReadingImageInput["mediaType"], data: m[2] };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Server chưa cấu hình ANTHROPIC_API_KEY" }, { status: 503 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  const { rawText, images, bank } = parsed.data;

  const imgInputs = (images ?? [])
    .map(parseImageDataUrl)
    .filter((x): x is ReadingImageInput => x !== null);

  if (!rawText?.trim() && imgInputs.length === 0) {
    return NextResponse.json({ error: "Hãy dán nội dung đề hoặc tải ảnh đề lên" }, { status: 400 });
  }

  let generated;
  try {
    generated = await generateReadingTest({ rawText, images: imgInputs });
  } catch (e) {
    console.error("generateReadingTest failed:", e);
    return NextResponse.json(
      { error: "AI không phân tích được đề. Kiểm tra lại nội dung hoặc thử lại." },
      { status: 502 },
    );
  }

  const valid = resultSchema.safeParse(generated);
  if (!valid.success) {
    console.error("AI reading output invalid:", valid.error.message);
    return NextResponse.json(
      { error: "AI trả về dữ liệu chưa đúng định dạng. Hãy thử lại." },
      { status: 502 },
    );
  }
  const data = valid.data;

  const test = await prisma.readingTest.create({
    data: {
      title: data.title,
      passage: data.passage,
      bank,
      questions: {
        create: data.questions.map((q, i) => ({
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
