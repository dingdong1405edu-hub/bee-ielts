import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  taskType: z.union([z.literal(1), z.literal(2)]),
  prompt: z.string().min(20),
  imageUrl: z.string().url().nullable(),
  minWords: z.number().min(50),
  timeLimit: z.number().min(60),
  bandStageId: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const task = await prisma.writingTask.create({
    data: { ...parsed.data, bandStageId: parsed.data.bandStageId ?? null },
  });
  return NextResponse.json({ id: task.id });
}
