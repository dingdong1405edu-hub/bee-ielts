import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { MockRunner } from "./mock-runner";

export const dynamic = "force-dynamic";

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function pickMany<T>(items: T[], n: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < n && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

export default async function MockTestPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { targetBand: true },
  });
  const targetBand = user?.targetBand ?? 6.0;

  const [readingTests, listeningTests, writingT1, writingT2, speakingSets, recent] =
    await Promise.all([
      prisma.readingTest.findMany({ include: { questions: { orderBy: { order: "asc" } } } }),
      prisma.listeningTest.findMany({ include: { questions: { orderBy: { order: "asc" } } } }),
      prisma.writingTask.findMany({ where: { taskType: 1 } }),
      prisma.writingTask.findMany({ where: { taskType: 2 } }),
      prisma.speakingSet.findMany(),
      prisma.attempt.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 60,
        select: { refId: true },
      }),
    ]);

  if (!readingTests.length || !listeningTests.length || !writingT1.length || !writingT2.length || !speakingSets.length) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <h1 className="text-2xl font-extrabold">Chưa đủ content để mock test</h1>
        <p className="text-muted-foreground mt-2">Cần ít nhất 1 bài mỗi kỹ năng (Writing cần cả Task 1 & 2).</p>
      </div>
    );
  }

  // IDs the learner has worked on recently — used to reduce how often a test repeats.
  const recentIds = new Set<string>();
  for (const a of recent) {
    a.refId.replace(/^mock-/, "").split("+").forEach((id) => id && recentIds.add(id));
  }
  /** Prefer items the learner has not done recently; fall back to the full pool. */
  function fresh<T extends { id: string }>(items: T[]): T[] {
    const f = items.filter((i) => !recentIds.has(i.id));
    return f.length > 0 ? f : items;
  }

  // Reading: 4 passages, one from each slot (A/B/C/D) so every question type appears.
  const slottedTests = readingTests.filter((r) => r.slot);
  const slotsAvailable = Array.from(new Set(slottedTests.map((r) => r.slot)));
  const pickedSlots = pickMany(slotsAvailable, 4);
  let readings: typeof readingTests = [];
  for (const slot of pickedSlots) {
    const inSlot = slottedTests.filter((r) => r.slot === slot);
    if (inSlot.length === 0) continue;
    readings.push(pickRandom(fresh(inSlot)));
  }
  if (readings.length === 0) readings = pickMany(readingTests, Math.min(4, readingTests.length));

  const listening = pickRandom(fresh(listeningTests));
  const writing1 = pickRandom(fresh(writingT1));
  const writing2 = pickRandom(fresh(writingT2));
  const speaking = pickRandom(fresh(speakingSets));

  return (
    <MockRunner
      targetBand={targetBand}
      listening={{
        id: listening.id,
        title: listening.title,
        audioUrl: listening.audioUrl,
        transcript: listening.transcript,
        questions: listening.questions.map((q) => ({
          id: q.id,
          type: q.type,
          prompt: q.prompt,
          options: (q.options as string[] | null) ?? null,
          correctAnswer: q.correctAnswer as string,
        })),
      }}
      readings={readings.map((reading) => ({
        id: reading.id,
        title: reading.title,
        level: reading.level,
        passage: reading.passage,
        questions: reading.questions.map((q) => ({
          id: q.id,
          type: q.type,
          prompt: q.prompt,
          options: (q.options as string[] | null) ?? null,
          correctAnswer: q.correctAnswer as string,
        })),
      }))}
      writing={{
        task1: {
          id: writing1.id,
          prompt: writing1.prompt,
          minWords: writing1.minWords,
          diagramSvg: writing1.diagramSvg,
        },
        task2: {
          id: writing2.id,
          prompt: writing2.prompt,
          minWords: writing2.minWords,
        },
      }}
      speaking={{
        id: speaking.id,
        topic: speaking.topic,
        part1Questions: speaking.part1Questions as string[],
        part2CueCard: speaking.part2CueCard as { topic: string; points: string[] },
        part3Questions: speaking.part3Questions as string[],
      }}
    />
  );
}
