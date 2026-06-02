import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  return NextResponse.json({
    listening: pickOne(listenings),
    reading: pickOne(readings),
    writing1: pickOne(writingTask1s),
    writing2: pickOne(writingTask2s),
    speaking: pickOne(speakings),
  });
}
