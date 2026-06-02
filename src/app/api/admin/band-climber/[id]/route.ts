import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const existing = await prisma.bandStage.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy chặng" }, { status: 404 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const data = parsed.data;
  if (data.toBand <= data.fromBand) {
    return NextResponse.json({ error: "Band đích phải lớn hơn band gốc" }, { status: 400 });
  }

  try {
    await prisma.bandStage.update({
      where: { id },
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
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (typeof e === "object" && e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Đã có chặng khác dùng cặp band này" },
        { status: 409 },
      );
    }
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const existing = await prisma.bandStage.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy chặng" }, { status: 404 });
  await prisma.bandStage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
