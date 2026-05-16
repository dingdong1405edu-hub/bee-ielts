import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { gradeWritingGroq } from "@/lib/groq";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  taskId: z.string(),
  essay: z.string(),
  durationSec: z.number().min(0).optional(),
});

/** Count words in an essay. */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  const task = await prisma.writingTask.findUnique({ where: { id: parsed.data.taskId } });
  if (!task) return NextResponse.json({ error: "Task không tồn tại" }, { status: 404 });

  const essay = parsed.data.essay;

  // Empty / near-empty essay → band 0.0, no AI call wasted.
  if (countWords(essay) < 30) {
    const result = {
      overallBand: 0,
      criteria: {
        taskAchievement: { band: 0, feedback: "Bài viết trống hoặc quá ngắn để chấm điểm." },
        coherenceCohesion: { band: 0, feedback: "Không có nội dung để đánh giá." },
        lexicalResource: { band: 0, feedback: "Không có nội dung để đánh giá." },
        grammaticalRange: { band: 0, feedback: "Không có nội dung để đánh giá." },
      },
      annotations: [],
      linkingPhrases: [],
      usefulStructures: [],
      openingSentences: [],
      closingSentences: [],
      improvedVersion: "",
      summary: "Bạn chưa viết bài (hoặc viết quá ít). Hãy viết ít nhất 150 từ cho Task 1 và 250 từ cho Task 2 để được chấm điểm.",
    };
    await prisma.attempt.create({
      data: {
        userId: session.user.id,
        skill: "WRITING",
        refId: task.id,
        rawAnswer: { essay },
        score: 0,
        feedback: result as object,
        durationSec: parsed.data.durationSec ?? null,
      },
    });
    return NextResponse.json({ result });
  }

  try {
    const result = (await gradeWritingGroq({
      taskType: task.taskType as 1 | 2,
      prompt: task.prompt,
      essay,
    })) as { overallBand: number };

    await prisma.attempt.create({
      data: {
        userId: session.user.id,
        skill: "WRITING",
        refId: task.id,
        rawAnswer: { essay },
        score: result.overallBand,
        feedback: result as object,
        durationSec: parsed.data.durationSec ?? null,
      },
    });

    await recordActivity(session.user.id, { xpGain: 50 });

    return NextResponse.json({ result });
  } catch (e) {
    console.error("[grade/writing] error", e);
    return NextResponse.json({ error: "AI chấm bài thất bại" }, { status: 500 });
  }
}

export const maxDuration = 60;
