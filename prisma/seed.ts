import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { VOCAB_UNITS } from "./data/vocab";
import { GRAMMAR_UNITS } from "./data/grammar";
import { READING_TESTS } from "./data/reading";
import { READING_TESTS_V2 } from "./data/reading-v2";
import { READING_V3_A } from "./data/reading-v3a";
import { READING_V3_B } from "./data/reading-v3b";
import { READING_V3_C } from "./data/reading-v3c";
import { READING_V3_D } from "./data/reading-v3d";
import { LISTENING_TESTS } from "./data/listening";
import { WRITING_TASKS, SPEAKING_SETS } from "./data/writing-speaking";

const prisma = new PrismaClient();

/**
 * Idempotent seed.
 *
 * This runs on every Railway deploy, so it MUST NOT overwrite content the
 * admin has created or deleted. Each content block below only runs when its
 * table is still empty (a fresh database). On a populated database every
 * block is skipped, so admin edits and deletions are permanent.
 */
async function main() {
  console.log("Seeding database...");

  // Users — always upsert. Harmless to repeat; never deletes anything.
  const adminPass = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@bee-ielts.com" },
    update: {},
    create: {
      email: "admin@bee-ielts.com",
      name: "Admin",
      passwordHash: adminPass,
      role: Role.ADMIN,
    },
  });

  const learnerPass = await bcrypt.hash("demo1234", 10);
  await prisma.user.upsert({
    where: { email: "demo@bee-ielts.com" },
    update: {},
    create: {
      email: "demo@bee-ielts.com",
      name: "Demo Learner",
      passwordHash: learnerPass,
      role: Role.LEARNER,
      xp: 120,
      streakDays: 3,
    },
  });

  // Vocab — only on a fresh DB.
  if ((await prisma.vocabUnit.count()) === 0) {
    for (const unit of VOCAB_UNITS) {
      const u = await prisma.vocabUnit.create({
        data: {
          title: unit.title,
          level: unit.level,
          order: unit.order,
          iconKey: unit.iconKey ?? null,
        },
      });
      for (const l of unit.lessons) {
        await prisma.vocabLesson.create({
          data: { unitId: u.id, title: l.title, order: l.order, exercises: l.exercises },
        });
      }
    }
    console.log("Vocab: seeded.");
  } else {
    console.log("Vocab: skipped (đã có dữ liệu).");
  }

  // Grammar — only on a fresh DB.
  if ((await prisma.grammarUnit.count()) === 0) {
    for (const unit of GRAMMAR_UNITS) {
      const u = await prisma.grammarUnit.create({
        data: { title: unit.title, level: unit.level, order: unit.order },
      });
      for (const l of unit.lessons) {
        await prisma.grammarLesson.create({
          data: { unitId: u.id, title: l.title, order: l.order, content: l.content, exercises: l.exercises },
        });
      }
    }
    console.log("Grammar: seeded.");
  } else {
    console.log("Grammar: skipped (đã có dữ liệu).");
  }

  // Reading — only on a fresh DB.
  if ((await prisma.readingTest.count()) === 0) {
    const allReadings = [
      ...READING_TESTS_V2,
      ...READING_V3_A,
      ...READING_V3_B,
      ...READING_V3_C,
      ...READING_V3_D,
    ];
    for (const r of allReadings) {
      await prisma.readingTest.create({
        data: {
          title: r.title,
          level: r.level,
          timeLimit: r.timeLimit,
          passage: r.passage,
          slot: r.slot ?? null,
          questions: {
            create: r.questions.map((q, i) => ({
              type: q.type,
              prompt: q.prompt,
              options: q.options ?? undefined,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation ?? null,
              order: i + 1,
            })),
          },
        },
      });
    }
    console.log("Reading: seeded.");
  } else {
    console.log("Reading: skipped (đã có dữ liệu).");
  }

  // Listening — only on a fresh DB.
  if ((await prisma.listeningTest.count()) === 0) {
    for (const l of LISTENING_TESTS) {
      await prisma.listeningTest.create({
        data: {
          title: l.title,
          audioUrl: l.audioUrl,
          transcript: l.transcript,
          timeLimit: l.timeLimit,
          questions: {
            create: l.questions.map((q, i) => ({
              type: q.type,
              prompt: q.prompt,
              options: q.options ?? undefined,
              correctAnswer: q.correctAnswer,
              order: i + 1,
            })),
          },
        },
      });
    }
    console.log("Listening: seeded.");
  } else {
    console.log("Listening: skipped (đã có dữ liệu).");
  }

  // Writing — only on a fresh DB.
  if ((await prisma.writingTask.count()) === 0) {
    for (const t of WRITING_TASKS) {
      await prisma.writingTask.create({
        data: {
          taskType: t.taskType,
          prompt: t.prompt,
          imageUrl: t.imageUrl ?? null,
          diagramSvg: t.diagramSvg ?? null,
          minWords: t.minWords,
          timeLimit: t.timeLimit,
        },
      });
    }
    console.log("Writing: seeded.");
  } else {
    console.log("Writing: skipped (đã có dữ liệu).");
  }

  // Speaking — only on a fresh DB.
  if ((await prisma.speakingSet.count()) === 0) {
    for (const s of SPEAKING_SETS) {
      await prisma.speakingSet.create({
        data: {
          topic: s.topic,
          part1Questions: s.part1Questions,
          part2CueCard: s.part2CueCard,
          part3Questions: s.part3Questions,
        },
      });
    }
    console.log("Speaking: seeded.");
  } else {
    console.log("Speaking: skipped (đã có dữ liệu).");
  }

  console.log(`Seed done. Admin: ${admin.email}`);
  console.log(
    `Source data: vocab=${VOCAB_UNITS.length}, grammar=${GRAMMAR_UNITS.length}, reading legacy=${READING_TESTS.length}, listening=${LISTENING_TESTS.length}, writing=${WRITING_TASKS.length}, speaking=${SPEAKING_SETS.length}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
