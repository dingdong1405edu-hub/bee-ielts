/**
 * POST /api/submissions/writing — a student submits an essay for a WRITING
 * assignment; graded by AI and stored on the Submission (feedback = WritingResult).
 *
 * Body: { assignmentId, essay, durationSec?, cheatLogs? }
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { gradeWritingGroq } from "@/lib/groq";
import { attemptsAllowedOf, canAttempt } from "@/lib/attempts";

const schema = z.object({
  assignmentId: z.string().min(1),
  essay: z.string().max(20000).default(""),
  durationSec: z.number().min(0).optional(),
  cheatLogs: z
    .object({ count: z.number().int().min(0).default(0), events: z.array(z.object({ type: z.string(), at: z.string() })).default([]) })
    .optional(),
});

function readWriting(config: Prisma.JsonValue | null): { taskType: 1 | 2; prompt: string; minWords: number } {
  const c = (config && typeof config === "object" && !Array.isArray(config) ? (config as Record<string, unknown>).writing : null) as
    | Record<string, unknown>
    | null;
  const taskType = c?.taskType === 1 ? 1 : 2;
  return { taskType, prompt: typeof c?.prompt === "string" ? c.prompt : "", minWords: typeof c?.minWords === "number" ? c.minWords : 250 };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const studentId = session.user.id;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  const { assignmentId, essay, durationSec, cheatLogs } = parsed.data;

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, classId: true, skill: true, config: true },
  });
  if (!assignment) return NextResponse.json({ error: "Không tìm thấy bài tập" }, { status: 404 });
  if (assignment.skill !== "WRITING") return NextResponse.json({ error: "Bài này không phải Writing" }, { status: 400 });

  const membership = await prisma.classMember.findUnique({
    where: { classId_studentId: { classId: assignment.classId, studentId } },
    select: { id: true },
  });
  if (!membership) return NextResponse.json({ error: "Bạn không thuộc lớp của bài tập này" }, { status: 403 });

  const existing = await prisma.submission.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId } },
    select: { status: true, attemptCount: true },
  });
  const allowed = attemptsAllowedOf(assignment.config);
  const isDone = !!existing && (existing.status === "SUBMITTED" || existing.status === "GRADED");
  if (isDone && !canAttempt(allowed, existing!.attemptCount)) {
    return NextResponse.json({ error: "Bạn đã hết lượt làm bài này." }, { status: 409 });
  }
  const attemptCount = (existing?.attemptCount ?? 0) + 1;

  const { taskType, prompt } = readWriting(assignment.config);
  const me = await prisma.user.findUnique({ where: { id: studentId }, select: { targetBand: true } });
  const modelBand = Math.max(6, Math.round((me?.targetBand ?? 6.5) * 2) / 2);
  const wordCount = essay.trim().split(/\s+/).filter(Boolean).length;

  let result: { overallBand: number } & Record<string, unknown>;
  if (wordCount < 30) {
    result = {
      overallBand: 0,
      criteria: {
        taskAchievement: { band: 0, feedback: "Bài viết trống hoặc quá ngắn để chấm điểm." },
        coherenceCohesion: { band: 0, feedback: "Không có nội dung để đánh giá." },
        lexicalResource: { band: 0, feedback: "Không có nội dung để đánh giá." },
        grammaticalRange: { band: 0, feedback: "Không có nội dung để đánh giá." },
      },
      annotations: [],
      improvedVersion: "",
      modelBand,
      summary: "Bạn chưa viết bài (hoặc viết quá ít).",
    };
  } else {
    try {
      const graded = (await gradeWritingGroq({ taskType, prompt, essay, targetBand: modelBand })) as {
        overallBand: number;
        modelBand?: number;
      };
      result = { ...graded, modelBand: graded.modelBand ?? modelBand };
    } catch (e) {
      console.error("[submissions/writing] grade error", e);
      return NextResponse.json({ error: "AI chấm bài thất bại" }, { status: 500 });
    }
  }

  const band = Number.isFinite(result.overallBand) ? result.overallBand : 0;
  const data = {
    status: "GRADED" as const,
    totalScore: band,
    answers: { essay } as unknown as Prisma.InputJsonValue,
    feedback: result as unknown as Prisma.InputJsonValue,
    submittedAt: new Date(),
    cheatLogs: (cheatLogs ?? { count: 0, events: [] }) as unknown as Prisma.InputJsonValue,
    attemptCount,
  };
  await prisma.submission.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId } },
    create: { assignmentId, studentId, ...data },
    update: data,
  });
  // Also mirror to the student's own profile history.
  await prisma.attempt.create({
    data: { userId: studentId, skill: "WRITING", refId: `hw-${assignmentId}`, rawAnswer: { essay }, score: band, feedback: result as object, durationSec: durationSec ?? null },
  }).catch(() => {});

  return NextResponse.json({ band, result, attemptCount, attemptsAllowed: allowed });
}

export const maxDuration = 60;
