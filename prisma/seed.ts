import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { VOCAB_UNITS } from "./data/vocab";
import { IELTS_VOCAB_UNITS } from "./data/vocab-ielts";
import { GRAMMAR_UNITS } from "./data/grammar";
import { READING_TESTS } from "./data/reading";
import { READING_TESTS_V2 } from "./data/reading-v2";
import { READING_V3_A } from "./data/reading-v3a";
import { READING_V3_B } from "./data/reading-v3b";
import { READING_V3_C } from "./data/reading-v3c";
import { READING_V3_D } from "./data/reading-v3d";
import { LISTENING_TESTS } from "./data/listening";
import { WRITING_TASKS, SPEAKING_SETS } from "./data/writing-speaking";
import { SPEAKING_ROULETTE_CARDS } from "./data/speaking-roulette-cards";

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

  // IELTS-themed vocab expansion — ADDITIVE. Adds any unit/lesson from
  // IELTS_VOCAB_UNITS that doesn't already exist by title. Re-deploy never
  // duplicates, and admin can still delete units they don't want (they
  // won't be re-created unless their title disappears from the array).
  let ieltsCreated = 0;
  for (const unit of IELTS_VOCAB_UNITS) {
    const existingUnit = await prisma.vocabUnit.findFirst({
      where: { title: unit.title },
    });
    let unitId = existingUnit?.id;
    if (!unitId) {
      const created = await prisma.vocabUnit.create({
        data: {
          title: unit.title,
          level: unit.level,
          order: unit.order,
          iconKey: unit.iconKey ?? null,
        },
      });
      unitId = created.id;
      ieltsCreated++;
    }
    for (const l of unit.lessons) {
      const existingLesson = await prisma.vocabLesson.findFirst({
        where: { unitId, title: l.title },
      });
      if (!existingLesson) {
        await prisma.vocabLesson.create({
          data: { unitId, title: l.title, order: l.order, exercises: l.exercises },
        });
      }
    }
  }
  if (ieltsCreated > 0) {
    console.log(`Vocab IELTS: added ${ieltsCreated} new themed units.`);
  } else {
    console.log("Vocab IELTS: no new units to add (already up-to-date).");
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

  // Speaking Roulette cards — static deck for /speaking/roulette. Only
  // seeded on a fresh DB; once admin curates (future feature) we leave it
  // alone. Cards are unrelated to SpeakingSet (that's the existing IELTS
  // band-set flow).
  if ((await prisma.speakingTopicCard.count()) === 0) {
    for (const c of SPEAKING_ROULETTE_CARDS) {
      await prisma.speakingTopicCard.create({
        data: {
          part: c.part,
          topic: c.topic,
          question: c.question,
          talkPoints: c.talkPoints,
          vocab: c.vocab,
          hue: c.hue,
          order: c.order,
        },
      });
    }
    console.log("Speaking Roulette: seeded.");
  } else {
    console.log("Speaking Roulette: skipped (đã có dữ liệu).");
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

  // Speaking voices — seed the catalogue once. Admin can then add / remove
  // entries from /admin/voices. Idempotent: if the table already has data
  // (even partial), we leave it alone so admin curation isn't overwritten.
  if ((await prisma.speakingVoice.count()) === 0) {
    const seedVoices = [
      { voiceId: "aura-2-aurora-en", name: "Aurora", accent: "Anh - Mỹ", gender: "Nữ", isDefault: true, order: 0 },
      { voiceId: "aura-asteria-en", name: "Asteria", accent: "Anh - Mỹ", gender: "Nữ", order: 1 },
      { voiceId: "aura-luna-en", name: "Luna", accent: "Anh - Mỹ", gender: "Nữ", order: 2 },
      { voiceId: "aura-stella-en", name: "Stella", accent: "Anh - Mỹ", gender: "Nữ", order: 3 },
      { voiceId: "aura-orion-en", name: "Orion", accent: "Anh - Mỹ", gender: "Nam", order: 4 },
      { voiceId: "aura-arcas-en", name: "Arcas", accent: "Anh - Mỹ", gender: "Nam", order: 5 },
      { voiceId: "aura-perseus-en", name: "Perseus", accent: "Anh - Mỹ", gender: "Nam", order: 6 },
      { voiceId: "aura-athena-en", name: "Athena", accent: "Anh - Anh", gender: "Nữ", order: 7 },
      { voiceId: "aura-2-pandora-en", name: "Pandora", accent: "Anh - Anh", gender: "Nữ", order: 8 },
      { voiceId: "aura-helios-en", name: "Helios", accent: "Anh - Anh", gender: "Nam", order: 9 },
      { voiceId: "aura-2-draco-en", name: "Draco", accent: "Anh - Anh", gender: "Nam", order: 10 },
      { voiceId: "aura-angus-en", name: "Angus", accent: "Anh - Ireland", gender: "Nam", order: 11 },
      { voiceId: "aura-2-theia-en", name: "Theia", accent: "Anh - Úc", gender: "Nữ", order: 12 },
      { voiceId: "aura-2-hyperion-en", name: "Hyperion", accent: "Anh - Úc", gender: "Nam", order: 13 },
    ];
    for (const v of seedVoices) {
      await prisma.speakingVoice.create({ data: v });
    }
    console.log(`Speaking voices: seeded ${seedVoices.length} entries.`);
  } else {
    console.log("Speaking voices: skipped (đã có dữ liệu).");
  }

  // Idempotent upserts — add NEW voices to existing prod DBs without
  // touching anything the admin has tweaked. `update: {}` means existing
  // rows are left alone, only missing voiceIds get inserted.
  const ensureVoices = [
    // Energetic, conversational Aura-2 female voice — the "fun Aurora" variant.
    {
      voiceId: "aura-2-asteria-en",
      name: "Aurora Vui",
      accent: "Anh - Mỹ",
      gender: "Nữ",
      order: 100,
    },
  ];
  for (const v of ensureVoices) {
    await prisma.speakingVoice.upsert({
      where: { voiceId: v.voiceId },
      update: {},
      create: { ...v, enabled: true, isDefault: false },
    });
  }
  console.log(`Speaking voices: ensured ${ensureVoices.length} extra voices.`);

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
