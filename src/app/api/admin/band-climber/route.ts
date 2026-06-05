import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAdminActivity } from "@/lib/admin-activity";

const bodySchema = z.object({
  fromBand: z.number().min(0).max(9),
  toBand: z.number().min(0).max(9),
  title: z.string().min(1),
  subtitle: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  order: z.number().int().min(0).max(999).default(0),
  reading: z.string().default(""),
  listening: z.string().default(""),
  writing: z.string().default(""),
  speaking: z.string().default(""),
  tipsShowOnTest: z.boolean().default(true),
  tipsShowOnMiniQuiz: z.boolean().default(true),
});

/** Used by admin exercise forms to populate the "Gắn vào chặng" dropdown. */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN" && session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const stages = await prisma.bandStage.findMany({
    orderBy: [{ order: "asc" }, { fromBand: "asc" }],
    select: { id: true, fromBand: true, toBand: true, title: true },
  });
  return NextResponse.json({ stages });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN" && session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const data = parsed.data;
  if (data.toBand <= data.fromBand) {
    return NextResponse.json({ error: "Band đích phải lớn hơn band gốc" }, { status: 400 });
  }
  try {
    const stage = await prisma.bandStage.create({
      data: {
        fromBand: data.fromBand,
        toBand: data.toBand,
        title: data.title.trim(),
        subtitle: data.subtitle?.trim() || null,
        description: data.description?.trim() || null,
        order: data.order,
        reading: data.reading,
        listening: data.listening,
        writing: data.writing,
        speaking: data.speaking,
        tipsShowOnTest: data.tipsShowOnTest,
        tipsShowOnMiniQuiz: data.tipsShowOnMiniQuiz,
      },
    });
    await logAdminActivity({
      action: "CREATE",
      entityType: "BAND_STAGE",
      entityId: stage.id,
      entityTitle: `${stage.fromBand} → ${stage.toBand} · ${stage.title}`,
    });
    return NextResponse.json({ id: stage.id });
  } catch (e) {
    // Unique violation on (fromBand, toBand) — Prisma error code P2002.
    if (typeof e === "object" && e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Đã có chặng cho cặp band này — hãy chỉnh sửa thay vì tạo mới" },
        { status: 409 },
      );
    }
    throw e;
  }
}
