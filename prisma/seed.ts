import { PrismaClient, CEFRLevel, QuestionType, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Admin user
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

  // Demo learner
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

  // Vocab unit A1
  const vocabUnit = await prisma.vocabUnit.upsert({
    where: { level_order: { level: CEFRLevel.A1, order: 1 } },
    update: {},
    create: {
      title: "Basics 1 — Greetings & People",
      level: CEFRLevel.A1,
      order: 1,
      iconKey: "users",
    },
  });

  await prisma.vocabLesson.deleteMany({ where: { unitId: vocabUnit.id } });
  await prisma.vocabLesson.create({
    data: {
      unitId: vocabUnit.id,
      title: "Greetings",
      order: 1,
      exercises: [
        {
          type: "translate",
          prompt: "Translate to English: 'Xin chào'",
          options: ["Hello", "Goodbye", "Thanks", "Sorry"],
          answer: "Hello",
        },
        {
          type: "translate",
          prompt: "Translate to English: 'Cảm ơn'",
          options: ["Sorry", "Please", "Thank you", "Welcome"],
          answer: "Thank you",
        },
        {
          type: "match",
          prompt: "Match: 'Goodbye'",
          options: ["Tạm biệt", "Xin chào", "Cảm ơn", "Xin lỗi"],
          answer: "Tạm biệt",
        },
        {
          type: "type",
          prompt: "Type the English for: 'Tôi tên là Nam'",
          answer: "my name is nam",
        },
      ],
    },
  });

  await prisma.vocabLesson.create({
    data: {
      unitId: vocabUnit.id,
      title: "Family",
      order: 2,
      exercises: [
        {
          type: "translate",
          prompt: "Translate: 'Bố'",
          options: ["Father", "Mother", "Brother", "Sister"],
          answer: "Father",
        },
        {
          type: "translate",
          prompt: "Translate: 'Mẹ'",
          options: ["Aunt", "Mother", "Grandma", "Daughter"],
          answer: "Mother",
        },
        {
          type: "match",
          prompt: "Match: 'Sister'",
          options: ["Anh trai", "Em gái/Chị gái", "Bố", "Mẹ"],
          answer: "Em gái/Chị gái",
        },
      ],
    },
  });

  // Grammar unit
  const grammarUnit = await prisma.grammarUnit.create({
    data: {
      title: "Present Simple",
      level: CEFRLevel.A2,
      order: 1,
    },
  });
  await prisma.grammarLesson.create({
    data: {
      unitId: grammarUnit.id,
      title: "Affirmative form",
      order: 1,
      content:
        "Present Simple is used for habits and facts. Form: Subject + V(s/es).\nExample: She **works** at a hospital.",
      exercises: [
        {
          type: "fill",
          prompt: "He ___ (play) football every Sunday.",
          answer: "plays",
        },
        {
          type: "fill",
          prompt: "They ___ (live) in Hanoi.",
          answer: "live",
        },
      ],
    },
  });

  // Reading test
  await prisma.readingTest.create({
    data: {
      title: "The History of Coffee",
      level: CEFRLevel.B1,
      timeLimit: 1200,
      passage: `Coffee is one of the most consumed beverages in the world. Its history can be traced back to ancient coffee forests on the Ethiopian plateau, where legend says a goat herder named Kaldi first discovered the potential of these beloved beans. Kaldi noticed that his goats became so energetic after eating berries from a certain tree, they did not want to sleep at night. Kaldi reported his findings to the abbot of the local monastery, who made a drink with the berries and found that it kept him alert through the long hours of evening prayer.

By the 15th century, coffee was being grown in the Yemeni district of Arabia, and by the 16th century, it was known in Persia, Egypt, Syria, and Turkey. Coffee was not only enjoyed in homes, but also in the many public coffee houses — called qahveh khaneh — which began to appear in cities across the Near East. Patrons engaged in all manner of social activity, listened to music, watched performers, played chess, and kept current on the news.

European travelers to the Near East brought back stories of an unusual dark black beverage. By the 17th century, coffee had made its way to Europe and was becoming popular across the continent. Some people reacted to this new beverage with suspicion or fear, calling it the "bitter invention of Satan." The local clergy condemned coffee when it came to Venice in 1615. The controversy was so great that Pope Clement VIII was asked to intervene. He decided to taste the beverage for himself before making a decision, and found the drink so satisfying that he gave it papal approval.`,
      questions: {
        create: [
          {
            type: QuestionType.MCQ,
            prompt: "Who is said to have discovered coffee?",
            options: ["A monk", "A king", "A goat herder named Kaldi", "An Ethiopian farmer"],
            correctAnswer: "A goat herder named Kaldi",
            order: 1,
          },
          {
            type: QuestionType.TRUE_FALSE,
            prompt: "Coffee houses in the Near East were called 'qahveh khaneh'.",
            options: ["True", "False"],
            correctAnswer: "True",
            order: 2,
          },
          {
            type: QuestionType.MCQ,
            prompt: "Why did Pope Clement VIII approve coffee?",
            options: [
              "He never tried it",
              "He found it satisfying",
              "He was forced by his court",
              "He thought it was healthy",
            ],
            correctAnswer: "He found it satisfying",
            order: 3,
          },
          {
            type: QuestionType.FILL_BLANK,
            prompt: "Coffee was being grown in the ___ district of Arabia by the 15th century.",
            correctAnswer: "Yemeni",
            order: 4,
          },
        ],
      },
    },
  });

  // Listening test
  await prisma.listeningTest.create({
    data: {
      title: "Sample IELTS Listening — Section 1",
      audioUrl: "/audio/sample-section1.mp3",
      transcript: "Hello, this is a sample listening transcript...",
      timeLimit: 600,
      questions: {
        create: [
          {
            type: QuestionType.FILL_BLANK,
            prompt: "The speaker's name is ___.",
            correctAnswer: "Sarah",
            order: 1,
          },
          {
            type: QuestionType.MCQ,
            prompt: "What is the speaker booking?",
            options: ["A hotel", "A flight", "A tour", "A taxi"],
            correctAnswer: "A hotel",
            order: 2,
          },
        ],
      },
    },
  });

  // Writing tasks
  await prisma.writingTask.createMany({
    data: [
      {
        taskType: 1,
        prompt:
          "The chart below shows the percentage of households in owned and rented accommodation in England and Wales between 1918 and 2011.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.",
        minWords: 150,
        timeLimit: 1200,
      },
      {
        taskType: 2,
        prompt:
          "Some people think that the best way to reduce crime is to give longer prison sentences. Others, however, believe there are better alternative ways of reducing crime.\n\nDiscuss both views and give your own opinion.\n\nWrite at least 250 words.",
        minWords: 250,
        timeLimit: 2400,
      },
    ],
  });

  // Speaking set
  await prisma.speakingSet.create({
    data: {
      topic: "Hometown & Daily Life",
      part1Questions: [
        "Where is your hometown?",
        "What do you like most about your hometown?",
        "How has your hometown changed in recent years?",
        "Would you like to live there in the future?",
      ],
      part2CueCard: {
        topic: "Describe a place you often visit",
        points: [
          "Where it is",
          "How often you go there",
          "What you do there",
          "Why you like it",
        ],
      },
      part3Questions: [
        "Why do people enjoy visiting parks?",
        "How important are public spaces in modern cities?",
        "Should governments invest more in recreational facilities?",
        "Do you think these places will change in the future?",
      ],
    },
  });

  console.log("Seed complete. Admin:", admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
