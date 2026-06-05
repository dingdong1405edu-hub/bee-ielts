import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toNullableJsonArray } from "@/lib/prisma-json";
import { logAdminActivity } from "@/lib/admin-activity";

const schema = z.object({
  taskType: z.union([z.literal(1), z.literal(2)]),
  prompt: z.string().min(20),
  imageUrl: z.string().url().nullable(),
  minWords: z.number().min(50),
  timeLimit: z.number().min(60),
  bandStageId: z.string().nullable().optional(),
  bandClimbTips: z.array(z.unknown()).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN" && session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.writingTask.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy task" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const { bandClimbTips, ...rest } = parsed.data;
  const updated = await prisma.writingTask.update({
    where: { id },
    data: {
      ...rest,
      bandStageId: rest.bandStageId ?? null,
      bandClimbTips: toNullableJsonArray(bandClimbTips),
    },
  });
  await logAdminActivity({
    action: "UPDATE",
    entityType: "WRITING_TASK",
    entityId: id,
    entityTitle: `Task ${updated.taskType} · ${updated.prompt.slice(0, 80)}`,
  });
  return NextResponse.json({ id });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN" && session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const existing = await prisma.writingTask.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy task" }, { status: 404 });
  await prisma.writingTask.delete({ where: { id } });
  await logAdminActivity({
    action: "DELETE",
    entityType: "WRITING_TASK",
    entityId: id,
    entityTitle: `Task ${existing.taskType} · ${existing.prompt.slice(0, 80)}`,
    entityHref: null,
  });
  return NextResponse.json({ ok: true });
}
