import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { checkMockQuota } from "@/lib/premium";
import { pickLeastRecentId, recentRefIdsForSkill } from "@/lib/pick-next";

/** Pick the least-recently-done item (by id) from a pool of objects. */
function pickFresh<T extends { id: string }>(arr: T[], recentIds: string[]): T {
  const id = pickLeastRecentId(arr.map((x) => x.id), recentIds);
  return arr.find((x) => x.id === id) ?? arr[0];
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Mirror the page gate so a direct POST cannot bypass the weekly quota.
  const quota = await checkMockQuota(session.user.id);
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: "Tuần này bạn đã dùng lượt thi thử miễn phí — nâng cấp Premium để thi không giới hạn.",
        quotaExceeded: true,
        nextAllowedAt: quota.nextAllowedAt,
      },
      { status: 403 },
    );
  }

  // bandStageId: null gates out Vượt band tests so the mock pool only draws
  // from the regular practice/mock kho. Reading/listening also pin bank to
  // MOCK so practice-only items never sneak in.
  const [listenings, readings, writingTask1s, writingTask2s, speakings] = await Promise.all([
    prisma.listeningTest.findMany({
      where: { bank: "MOCK", bandStageId: null },
      include: { questions: { orderBy: { order: "asc" } } },
    }),
    prisma.readingTest.findMany({
      where: { bank: "MOCK", bandStageId: null },
      include: { questions: { orderBy: { order: "asc" } } },
    }),
    prisma.writingTask.findMany({ where: { taskType: 1, bandStageId: null } }),
    prisma.writingTask.findMany({ where: { taskType: 2, bandStageId: null } }),
    prisma.speakingSet.findMany({ where: { bandStageId: null } }),
  ]);

  if (!listenings.length || !readings.length || !writingTask1s.length || !writingTask2s.length || !speakings.length) {
    return NextResponse.json({ error: "Content chưa đủ để thi thử" }, { status: 400 });
  }

  // Tránh ra lại đề đã thi gần đây — chọn least-recently-done từng phần.
  const [rL, rR, rW, rS] = await Promise.all([
    recentRefIdsForSkill(prisma, session.user.id, "LISTENING"),
    recentRefIdsForSkill(prisma, session.user.id, "READING"),
    recentRefIdsForSkill(prisma, session.user.id, "WRITING"),
    recentRefIdsForSkill(prisma, session.user.id, "SPEAKING"),
  ]);

  return NextResponse.json({
    listening: pickFresh(listenings, rL),
    reading: pickFresh(readings, rR),
    writing1: pickFresh(writingTask1s, rW),
    writing2: pickFresh(writingTask2s, rW),
    speaking: pickFresh(speakings, rS),
  });
}
