/**
 * POST /api/feedback — public endpoint for the landing "Có góp ý cho Bee?"
 * pill and the /feedback page. Anyone (logged in or not) can send a message
 * (góp ý / yêu cầu hỗ trợ); it lands in the admin inbox at /admin/feedback.
 *
 * If the sender is logged in we stamp their userId so admin can follow up.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  kind: z.enum(["feedback", "support"]).optional().default("feedback"),
  name: z.string().max(120).optional().default(""),
  email: z.string().email().max(200).optional().or(z.literal("")),
  message: z.string().min(5, "Tin nhắn quá ngắn").max(4000),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
      { status: 400 },
    );
  }
  const { kind, name, email, message } = parsed.data;

  // Stamp the userId if the sender happens to be logged in (optional).
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session?.user?.id ?? null;
  } catch {
    /* not logged in — fine, anonymous feedback is allowed */
  }

  try {
    await prisma.feedback.create({
      data: {
        kind,
        name: name?.trim() || null,
        email: email?.trim() || null,
        message: message.trim(),
        userId,
      },
    });
  } catch (e) {
    console.error("[feedback] create failed:", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "Gửi thất bại, thử lại sau nhé." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
