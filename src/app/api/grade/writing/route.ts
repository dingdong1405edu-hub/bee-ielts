import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { gradeWriting } from "@/lib/claude";

const schema = z.object({
  taskId: z.string(),
  essay: z.string().min(20),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bài viết quá ngắn" }, { status: 400 });

  const task = await prisma.writingTask.findUnique({ where: { id: parsed.data.taskId } });
  if (!task) return NextResponse.json({ error: "Task không tồn tại" }, { status: 404 });

  try {
    const result = (await gradeWriting({
      taskType: task.taskType as 1 | 2,
      prompt: task.prompt,
      essay: parsed.data.essay,
    })) as { overallBand: number };

    await prisma.attempt.create({
      data: {
        userId: session.user.id,
        skill: "WRITING",
        refId: task.id,
        rawAnswer: { essay: parsed.data.essay },
        score: result.overallBand,
        feedback: result as object,
      },
    });

    await prisma.user.update({
      where: { id: session.user.id },
      data: { xp: { increment: 50 }, lastActiveAt: new Date() },
    });

    return NextResponse.json({ result });
  } catch (e) {
    console.error("[grade/writing] error", e);
    return NextResponse.json({ error: "AI chấm bài thất bại" }, { status: 500 });
  }
}

export const maxDuration = 60;
