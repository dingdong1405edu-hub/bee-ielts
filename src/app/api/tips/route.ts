import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { generateTipsGroq } from "@/lib/groq";

const schema = z.object({
  skill: z.enum(["READING", "LISTENING", "WRITING", "SPEAKING", "VOCAB", "GRAMMAR"]),
  score: z.number().min(0).max(9).optional(),
  context: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });

  try {
    const result = await generateTipsGroq(parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[tips groq]", e);
    return NextResponse.json(
      {
        tips: [
          { title: "Tiếp tục luyện tập", detail: "Làm thêm vài đề cùng dạng để quen format." },
          { title: "Review câu sai", detail: "Note lại lỗi để không lặp lần sau." },
          { title: "Học từ vựng theo collocation", detail: "Học cụm chứ đừng học từ riêng lẻ." },
        ],
        encouragement: "Bạn đang tiến bộ — tiếp tục nhé! 💜",
      },
      { status: 200 },
    );
  }
}

export const maxDuration = 30;
