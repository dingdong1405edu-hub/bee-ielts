import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { MockRunner } from "./mock-runner";

export const dynamic = "force-dynamic";

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function pickByLevel<T extends { level: string }>(items: T[], targetBand: number): T {
  const target = targetBand <= 4.5 ? "A2" : targetBand <= 5.5 ? "B1" : targetBand <= 6.5 ? "B2" : targetBand <= 7.5 ? "C1" : "C2";
  return items.find((i) => i.level === target) ?? pickRandom(items);
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

  const [readingTests, listeningTests, writingTasks, speakingSets] = await Promise.all([
    prisma.readingTest.findMany({ include: { questions: { orderBy: { order: "asc" } } } }),
    prisma.listeningTest.findMany({ include: { questions: { orderBy: { order: "asc" } } } }),
    prisma.writingTask.findMany({ where: { taskType: 2 } }),
    prisma.speakingSet.findMany(),
  ]);

  if (!readingTests.length || !listeningTests.length || !writingTasks.length || !speakingSets.length) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <h1 className="text-2xl font-extrabold">Chưa đủ content để mock test</h1>
        <p className="text-muted-foreground mt-2">Cần ít nhất 1 bài mỗi kỹ năng. Admin hãy seed thêm.</p>
      </div>
    );
  }

  // Pick 3 readings from 3 different slots (A/B/C/D) so each passage has clean,
  // distinct question groups. Real IELTS uses 3 passages.
  const slottedTests = readingTests.filter((r) => r.slot);
  const slotsAvailable = Array.from(new Set(slottedTests.map((r) => r.slot)));
  const pickedSlots = pickMany(slotsAvailable, 3);
  let readings: typeof readingTests = [];
  for (const slot of pickedSlots) {
    const inSlot = slottedTests.filter((r) => r.slot === slot);
    if (inSlot.length === 0) continue;
    readings.push(pickRandom(inSlot));
  }
  if (readings.length === 0) readings = [pickByLevel(readingTests, targetBand)];

  const listening = pickRandom(listeningTests);
  const writing = pickRandom(writingTasks);
  const speaking = pickRandom(speakingSets);

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
        id: writing.id,
        prompt: writing.prompt,
        minWords: writing.minWords,
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
