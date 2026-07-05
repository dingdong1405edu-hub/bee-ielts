/**
 * POST /api/submissions/speaking — a student submits their spoken-answer
 * transcript for a SPEAKING assignment; graded by AI and stored on the
 * Submission (feedback = SpeakingResult, transcript). Audio is NOT persisted —
 * same as the profile speaking review, which shows transcript + band only.
 *
 * Body: { assignmentId, transcript, durationSec?, cheatLogs? }
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { gradeSpeakingGroq } from "@/lib/groq";
import { attemptsAllowedOf, canAttempt } from "@/lib/attempts";

const schema = z.object({
  assignmentId: z.string().min(1),
  transcript: z.string().max(20000).default(""),
  durationSec: z.number().min(0).optional(),
  cheatLogs: z
    .object({ count: z.number().int().min(0).default(0), events: z.array(z.object({ type: z.string(), at: z.string() })).default([]) })
    .optional(),
});

function readSpeaking(config: Prisma.JsonValue | null): { part: 1 | 2 | 3; topic: string; questions: string[] } {
  const c = (config && typeof config === "object" && !Array.isArray(config) ? (config as Record<string, unknown>).speaking : null) as
    | Record<string, unknown>
    | null;
  const partRaw = c?.part;
  const part = partRaw === 2 ? 2 : partRaw === 3 ? 3 : 1;
  const questions = Array.isArray(c?.questions) ? (c!.questions as unknown[]).filter((q): q is string => typeof q === "string") : [];
  return { part, topic: typeof c?.topic === "string" ? c.topic : "", questions };
}

function ungradeable(reason: string) {
  return {
    overallBand: 0,
    criteria: {
      fluencyCoherence: { band: 0, feedback: reason },
      lexicalResource: { band: 0, feedback: reason },
      grammaticalRange: { band: 0, feedback: reason },
      pronunciation: { band: 0, feedback: reason },
    },
    observations: [reason],
    corrections: [],
    questionTips: [],
    summary: reason,
  };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const studentId = session.user.id;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  const { assignmentId, transcript, durationSec, cheatLogs } = parsed.data;

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, classId: true, skill: true, config: true },
  });
  if (!assignment) return NextResponse.json({ error: "Không tìm thấy bài tập" }, { status: 404 });
  if (assignment.skill !== "SPEAKING") return NextResponse.json({ error: "Bài này không phải Speaking" }, { status: 400 });

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

  const { part, topic, questions } = readSpeaking(assignment.config);
  const me = await prisma.user.findUnique({ where: { id: studentId }, select: { targetBand: true } });
  const targetBand = me?.targetBand ?? 6.5;

  let result: { overallBand: number } & Record<string, unknown>;
  if (transcript.trim().length < 20) {
    result = ungradeable("Không nghe được bài nói (transcript trống hoặc quá ngắn) — band 0.0.");
  } else {
    try {
      result = (await gradeSpeakingGroq({ part, topic, questions, transcript, targetBand })) as {
        overallBand: number;
      } & Record<string, unknown>;
    } catch (e) {
      console.error("[submissions/speaking] grade error", e);
      result = ungradeable("AI không chấm được — band 0.0.");
    }
  }

  const band = Number.isFinite(result.overallBand) && result.overallBand >= 0 ? result.overallBand : 0;
  const data = {
    status: "GRADED" as const,
    totalScore: band,
    transcript,
    answers: { transcript } as unknown as Prisma.InputJsonValue,
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
  await prisma.attempt.create({
    data: { userId: studentId, skill: "SPEAKING", refId: `hw-${assignmentId}`, rawAnswer: { part, transcript }, score: band, feedback: result as object, durationSec: durationSec ?? null },
  }).catch(() => {});

  return NextResponse.json({ band, result, attemptCount, attemptsAllowed: allowed });
}

export const maxDuration = 60;
