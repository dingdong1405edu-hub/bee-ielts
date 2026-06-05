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

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN" && session.user.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { bandClimbTips, ...rest } = parsed.data;
  const task = await prisma.writingTask.create({
    data: {
      ...rest,
      bandStageId: rest.bandStageId ?? null,
      bandClimbTips: toNullableJsonArray(bandClimbTips),
    },
  });
  await logAdminActivity({
    action: "CREATE",
    entityType: "WRITING_TASK",
    entityId: task.id,
    entityTitle: `Task ${task.taskType} · ${task.prompt.slice(0, 80)}`,
  });
  return NextResponse.json({ id: task.id });
}
