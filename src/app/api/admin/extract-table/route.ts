import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { extractTableFromImage, type ReadingImageInput } from "@/lib/claude";

// One image rarely needs more than 30s, but a multi-page table can.
export const maxDuration = 60;

const bodySchema = z.object({
  images: z.array(z.string()).min(1).max(4),
});

/** Split a `data:image/...;base64,...` URL into the parts Claude needs. */
function parseImageDataUrl(dataUrl: string): ReadingImageInput | null {
  const m = dataUrl.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/);
  if (!m) return null;
  return { mediaType: m[1] as ReadingImageInput["mediaType"], data: m[2] };
}

const resultSchema = z.object({
  tableText: z.string().trim().min(1),
  answers: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN" && session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Server chưa cấu hình ANTHROPIC_API_KEY" }, { status: 503 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  const imgs = parsed.data.images
    .map(parseImageDataUrl)
    .filter((x): x is ReadingImageInput => x !== null);
  if (imgs.length === 0) {
    return NextResponse.json({ error: "Không nhận được ảnh hợp lệ" }, { status: 400 });
  }

  let result;
  try {
    result = await extractTableFromImage({ images: imgs });
  } catch (e) {
    console.error("extractTableFromImage failed:", e);
    return NextResponse.json(
      { error: "AI không đọc được bảng trong ảnh. Thử ảnh rõ hơn." },
      { status: 502 },
    );
  }

  const valid = resultSchema.safeParse(result);
  if (!valid.success) {
    console.error("AI table extract invalid:", valid.error.message);
    return NextResponse.json(
      { error: "AI trả về dữ liệu chưa đúng định dạng" },
      { status: 502 },
    );
  }

  return NextResponse.json(valid.data);
}
