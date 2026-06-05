import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";

const schema = z.object({
  prompt: z.string().trim().min(2).max(300),
});

// AI cover-image generation can take ~20s.
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN" && session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Chưa cấu hình OPENAI_API_KEY trên server" },
      { status: 503 },
    );
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Tiêu đề không hợp lệ" }, { status: 400 });

  const imagePrompt = `Editorial stock-photo style cover image for an IELTS practice test about: "${parsed.data.prompt}". Realistic, clean, professional, subject matter clearly relevant to the topic. Absolutely no text, letters, words or numbers anywhere in the image.`;

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: "1792x1024",
        quality: "standard",
        response_format: "b64_json",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || "Tạo ảnh thất bại";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) return NextResponse.json({ error: "AI không trả về ảnh" }, { status: 502 });
    return NextResponse.json({ dataUrl: `data:image/png;base64,${b64}` });
  } catch (e) {
    console.error("cover-image generation failed:", e);
    return NextResponse.json({ error: "Lỗi gọi dịch vụ tạo ảnh" }, { status: 502 });
  }
}
