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

async function main() {
  console.log("Seeding database...");

  // Users
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

  // Vocab
  for (const unit of VOCAB_UNITS) {
    const u = await prisma.vocabUnit.upsert({
      where: { level_order: { level: unit.level, order: unit.order } },
      update: { title: unit.title },
      create: {
        title: unit.title,
        level: unit.level,
        order: unit.order,
        iconKey: unit.iconKey ?? null,
      },
    });
    await prisma.vocabLesson.deleteMany({ where: { unitId: u.id } });
    for (const l of unit.lessons) {
      await prisma.vocabLesson.create({
        data: {
          unitId: u.id,
          title: l.title,
          order: l.order,
          exercises: l.exercises,
        },
      });
    }
  }

  // Grammar
  await prisma.grammarLesson.deleteMany({});
  await prisma.grammarUnit.deleteMany({});
  for (const unit of GRAMMAR_UNITS) {
    const u = await prisma.grammarUnit.create({
      data: {
        title: unit.title,
        level: unit.level,
        order: unit.order,
      },
    });
    for (const l of unit.lessons) {
      await prisma.grammarLesson.create({
        data: {
          unitId: u.id,
          title: l.title,
          order: l.order,
          content: l.content,
          exercises: l.exercises,
        },
      });
    }
  }

  // Reading: reseed the slot-tagged practice bank (slot A–D) only.
  // Admin-created reading tests (slot = null) are preserved across deploys;
  // leftover legacy un-slotted seed tests are removed once by title.
  await prisma.readingTest.deleteMany({ where: { slot: { not: null } } });
  await prisma.readingTest.deleteMany({ where: { title: { in: READING_TESTS.map((r) => r.title) } } });
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

  // Listening
  await prisma.question.deleteMany({ where: { listeningId: { not: null } } });
  await prisma.listeningTest.deleteMany({});
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

  // Writing
  await prisma.writingTask.deleteMany({});
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

  // Speaking
  await prisma.speakingSet.deleteMany({});
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

  console.log(`Seed done. Admin: ${admin.email}`);
  console.log(`Stats: vocab=${VOCAB_UNITS.length} units, grammar=${GRAMMAR_UNITS.length} units, reading=${READING_TESTS.length}, listening=${LISTENING_TESTS.length}, writing=${WRITING_TASKS.length}, speaking=${SPEAKING_SETS.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
