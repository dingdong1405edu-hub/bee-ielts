import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toNullableJsonArray } from "@/lib/prisma-json";

const schema = z.object({
  topic: z.string().trim().min(1),
  imageUrl: z.string().url().nullable().optional(),
  part1Questions: z.array(z.string().trim().min(1)).min(1),
  part2CueCard: z.object({
    topic: z.string().trim().min(1),
    points: z.array(z.string().trim().min(1)).min(1),
  }),
  part3Questions: z.array(z.string().trim().min(1)).min(1),
  bandStageId: z.string().nullable().optional(),
  bandClimbTips: z.array(z.unknown()).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.speakingSet.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy set" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { topic, imageUrl, part1Questions, part2CueCard, part3Questions, bandStageId, bandClimbTips } = parsed.data;

  await prisma.speakingSet.update({
    where: { id },
    data: {
      topic,
      imageUrl: imageUrl ?? null,
      part1Questions,
      part2CueCard,
      part3Questions,
      bandStageId: bandStageId ?? null,
      bandClimbTips: toNullableJsonArray(bandClimbTips),
    },
  });
  return NextResponse.json({ id });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const existing = await prisma.speakingSet.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy set" }, { status: 404 });
  await prisma.speakingSet.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
