import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import Anthropic from "@anthropic-ai/sdk";

const schema = z.object({
  skill: z.enum(["READING", "LISTENING", "WRITING", "SPEAKING", "VOCAB", "GRAMMAR"]),
  score: z.number().min(0).max(9).optional(),
  context: z.string().max(500).optional(),
});

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

const SYS = `You are a friendly IELTS coach giving practical, actionable tips.
Return ONLY valid JSON of shape:
{
  "tips": [{ "title": string, "detail": string }],
  "encouragement": string
}
Return 3-4 tips, each title ≤ 60 chars, each detail ≤ 200 chars. Keep tone warm and Gen-Z friendly.
Write in Vietnamese.`;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });
  const { skill, score, context } = parsed.data;

  const userMsg = `Skill: ${skill}
${score !== undefined ? `Score/band achieved: ${score}` : ""}
${context ? `Context: ${context}` : ""}

Give specific tips to improve next time.`;

  try {
    const res = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 700,
      temperature: 0.5,
      system: SYS,
      messages: [{ role: "user", content: userMsg }],
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    const parsed = JSON.parse(text.slice(start, end + 1));
    return NextResponse.json(parsed);
  } catch (e) {
    console.error("[tips]", e);
    return NextResponse.json(
      {
        tips: [
          { title: "Tiếp tục luyện tập", detail: "Làm thêm vài đề cùng dạng để quen format." },
          { title: "Review câu sai", detail: "Note lại lỗi để không lặp lần sau." },
        ],
        encouragement: "Bạn đang tiến bộ — tiếp tục nhé! 💜",
      },
      { status: 200 },
    );
  }
}

export const maxDuration = 30;
