import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { defineWordGroq } from "@/lib/groq";

const schema = z.object({ term: z.string().min(1).max(120) });

/** AI: suggest a Vietnamese meaning + English example for a word. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Thiếu từ" }, { status: 400 });

  try {
    const result = await defineWordGroq(parsed.data.term.trim());
    return NextResponse.json(result);
  } catch (e) {
    console.error("[words/define]", e);
    return NextResponse.json({ error: "AI không tạo được nghĩa" }, { status: 502 });
  }
}

export const maxDuration = 30;
