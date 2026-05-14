import { CEFRLevel } from "@prisma/client";

export interface GrammarUnitData {
  title: string;
  level: CEFRLevel;
  order: number;
  lessons: { title: string; order: number; content: string; exercises: { type: "fill"; prompt: string; answer: string }[] }[];
}

export const GRAMMAR_UNITS: GrammarUnitData[] = [
  {
    title: "A1 · Basics",
    level: CEFRLevel.A1,
    order: 1,
    lessons: [
      {
        title: "Be verbs (am/is/are)",
        order: 1,
        content: "Use **am** with I, **is** with he/she/it, **are** with you/we/they.\n\nExample: I am happy. She is a doctor. They are students.",
        exercises: [
          { type: "fill", prompt: "I ___ a student.", answer: "am" },
          { type: "fill", prompt: "She ___ from Vietnam.", answer: "is" },
          { type: "fill", prompt: "We ___ best friends.", answer: "are" },
          { type: "fill", prompt: "He ___ not at home.", answer: "is" },
          { type: "fill", prompt: "They ___ in the kitchen.", answer: "are" },
        ],
      },
      {
        title: "Present Simple — affirmative",
        order: 2,
        content: "Use Present Simple for habits and facts.\nForm: Subject + V (add -s/-es for he/she/it).\n\nShe **works** in a hospital. I **work** from home.",
        exercises: [
          { type: "fill", prompt: "He ___ (play) tennis every weekend.", answer: "plays" },
          { type: "fill", prompt: "They ___ (live) in Hanoi.", answer: "live" },
          { type: "fill", prompt: "My sister ___ (study) Korean.", answer: "studies" },
          { type: "fill", prompt: "The shop ___ (open) at 9am.", answer: "opens" },
          { type: "fill", prompt: "I ___ (go) to the gym on Mondays.", answer: "go" },
        ],
      },
      {
        title: "Articles a/an/the",
        order: 3,
        content: "**a/an** = indefinite (one of many). Use **an** before vowel sounds.\n**the** = definite (specific).\n\nI saw **a** dog. **The** dog was brown.",
        exercises: [
          { type: "fill", prompt: "I have ___ apple.", answer: "an" },
          { type: "fill", prompt: "She is ___ teacher.", answer: "a" },
          { type: "fill", prompt: "___ sun is hot today.", answer: "The" },
          { type: "fill", prompt: "He bought ___ umbrella.", answer: "an" },
        ],
      },
    ],
  },
  {
    title: "A2 · Past & Continuous",
    level: CEFRLevel.A2,
    order: 1,
    lessons: [
      {
        title: "Past Simple",
        order: 1,
        content: "Use Past Simple for completed past actions.\nRegular verbs: add -ed (worked, played).\nIrregular: memorize (go→went, eat→ate, see→saw).",
        exercises: [
          { type: "fill", prompt: "Yesterday I ___ (visit) my grandma.", answer: "visited" },
          { type: "fill", prompt: "We ___ (go) to Da Nang last week.", answer: "went" },
          { type: "fill", prompt: "She ___ (buy) a new phone.", answer: "bought" },
          { type: "fill", prompt: "They ___ (eat) pizza for dinner.", answer: "ate" },
          { type: "fill", prompt: "He ___ (not/come) to school.", answer: "did not come" },
        ],
      },
      {
        title: "Present Continuous",
        order: 2,
        content: "Use for actions happening NOW or AROUND now.\nForm: Subject + am/is/are + V-ing.\n\nI **am studying** English right now.",
        exercises: [
          { type: "fill", prompt: "She ___ (cook) dinner now.", answer: "is cooking" },
          { type: "fill", prompt: "They ___ (play) football.", answer: "are playing" },
          { type: "fill", prompt: "I ___ (read) a great book these days.", answer: "am reading" },
          { type: "fill", prompt: "Look! It ___ (rain).", answer: "is raining" },
        ],
      },
      {
        title: "Comparatives & Superlatives",
        order: 3,
        content: "Short adjectives: -er / -est (taller, tallest).\nLong adjectives: more / most (more beautiful, most beautiful).\nIrregular: good→better→best, bad→worse→worst.",
        exercises: [
          { type: "fill", prompt: "Tom is ___ (tall) than his brother.", answer: "taller" },
          { type: "fill", prompt: "This is the ___ (beautiful) view.", answer: "most beautiful" },
          { type: "fill", prompt: "My English is ___ (good) than last year.", answer: "better" },
          { type: "fill", prompt: "It's the ___ (bad) day ever.", answer: "worst" },
        ],
      },
    ],
  },
  {
    title: "B1 · Perfect Tenses & Modals",
    level: CEFRLevel.B1,
    order: 1,
    lessons: [
      {
        title: "Present Perfect",
        order: 1,
        content: "Use for past actions with a result in the present, or experiences without specific time.\nForm: have/has + past participle.\n\nI **have visited** Tokyo three times.",
        exercises: [
          { type: "fill", prompt: "She ___ (live) here for 5 years.", answer: "has lived" },
          { type: "fill", prompt: "I ___ (never/eat) sushi before.", answer: "have never eaten" },
          { type: "fill", prompt: "We ___ (just/finish) our project.", answer: "have just finished" },
          { type: "fill", prompt: "They ___ (not/arrive) yet.", answer: "have not arrived" },
        ],
      },
      {
        title: "Future forms (will / going to)",
        order: 2,
        content: "**will**: spontaneous decisions, predictions.\n**going to**: plans, evidence-based predictions.\n\nI think it **will** rain. (prediction)\nLook at those clouds — it **is going to** rain. (evidence)",
        exercises: [
          { type: "fill", prompt: "I'm thirsty. I ___ (get) some water.", answer: "will get" },
          { type: "fill", prompt: "She ___ (visit) Paris next month. (plan)", answer: "is going to visit" },
          { type: "fill", prompt: "Watch out! You ___ (fall).", answer: "are going to fall" },
        ],
      },
      {
        title: "Modal verbs (can / should / must)",
        order: 3,
        content: "**can** = ability/possibility. **should** = advice. **must** = obligation/strong necessity.\n\nYou **should** drink more water. We **must** wear seatbelts.",
        exercises: [
          { type: "fill", prompt: "You ___ see a doctor. (advice)", answer: "should" },
          { type: "fill", prompt: "Children ___ go to school. (obligation)", answer: "must" },
          { type: "fill", prompt: "I ___ speak three languages. (ability)", answer: "can" },
        ],
      },
    ],
  },
  {
    title: "B2 · Conditionals & Passive",
    level: CEFRLevel.B2,
    order: 1,
    lessons: [
      {
        title: "Conditionals (Type 1 & 2)",
        order: 1,
        content: "**Type 1** (real future): If + Present, will + V.\n**Type 2** (unreal present): If + Past, would + V.\n\nIf it **rains**, I **will stay** home.\nIf I **had** money, I **would buy** a Tesla.",
        exercises: [
          { type: "fill", prompt: "If she ___ (study), she will pass.", answer: "studies" },
          { type: "fill", prompt: "If I ___ (be) you, I would resign.", answer: "were" },
          { type: "fill", prompt: "We ___ (call) you if we have time.", answer: "will call" },
          { type: "fill", prompt: "If he had more time, he ___ (travel) more.", answer: "would travel" },
        ],
      },
      {
        title: "Passive Voice",
        order: 2,
        content: "Object becomes subject. Form: be + past participle.\n\nActive: They built this bridge in 1990.\nPassive: This bridge **was built** in 1990.",
        exercises: [
          { type: "fill", prompt: "The cake ___ (eat) by the children.", answer: "was eaten" },
          { type: "fill", prompt: "English ___ (speak) all over the world.", answer: "is spoken" },
          { type: "fill", prompt: "The report ___ (write) by Sarah yesterday.", answer: "was written" },
        ],
      },
      {
        title: "Reported Speech",
        order: 3,
        content: "Tense usually shifts back one step.\nDirect: 'I am tired.' → Reported: He **said** he **was tired**.\n\nDirect: 'I will help.' → He said he **would help**.",
        exercises: [
          { type: "fill", prompt: "She said she ___ (be) hungry. (direct: 'I am hungry')", answer: "was" },
          { type: "fill", prompt: "He told me he ___ (visit) Paris. (direct: 'I visited Paris')", answer: "had visited" },
          { type: "fill", prompt: "They said they ___ (come) tomorrow. (direct: 'We will come')", answer: "would come" },
        ],
      },
    ],
  },
  {
    title: "C1 · Advanced Structures",
    level: CEFRLevel.C1,
    order: 1,
    lessons: [
      {
        title: "Mixed Conditionals",
        order: 1,
        content: "Mix Type 2 and 3 — unreal past affecting present, or unreal present affecting hypothetical past.\n\nIf I **had studied** medicine, I **would be** a doctor now.\nIf I **were** more confident, I **would have applied** for that job.",
        exercises: [
          { type: "fill", prompt: "If I ___ (take) that job, I would be in London now.", answer: "had taken" },
          { type: "fill", prompt: "If she ___ (be) here, she would have helped us.", answer: "were" },
        ],
      },
      {
        title: "Inversion for emphasis",
        order: 2,
        content: "After negative adverbs at the start, invert subject and verb.\n\nNever **have I seen** such beauty.\nNot only **did he win**, but he also broke a record.\nHardly **had I sat down** when the phone rang.",
        exercises: [
          { type: "fill", prompt: "Never ___ (I/see) such a thing!", answer: "have I seen" },
          { type: "fill", prompt: "Not until midnight ___ (he/arrive).", answer: "did he arrive" },
        ],
      },
      {
        title: "Cleft sentences (It is / What…)",
        order: 3,
        content: "Used to emphasize a particular piece of information.\n\n**It was** John **who** broke the vase.\n**What I need** is a holiday.",
        exercises: [
          { type: "fill", prompt: "___ Mary that called you, not me. (It was)", answer: "It was" },
          { type: "fill", prompt: "___ surprised me most was his calm.", answer: "What" },
        ],
      },
    ],
  },
  {
    title: "C2 · Mastery",
    level: CEFRLevel.C2,
    order: 1,
    lessons: [
      {
        title: "Subjunctive mood",
        order: 1,
        content: "Used after expressions like *suggest, demand, insist, recommend*.\n\nI suggest that he **be** on time. (not 'is')\nIt is essential that she **attend** the meeting.",
        exercises: [
          { type: "fill", prompt: "The director insists that everyone ___ (be) punctual.", answer: "be" },
          { type: "fill", prompt: "I demand that he ___ (apologize) immediately.", answer: "apologize" },
        ],
      },
      {
        title: "Advanced modals (could/might/should have)",
        order: 2,
        content: "**should have** = regret/criticism. **might have** = possibility in past. **could have** = unrealised ability/possibility.\n\nYou **should have called** me. (criticism)\nShe **might have missed** the bus. (possibility)",
        exercises: [
          { type: "fill", prompt: "You ___ (study) harder for the exam. (you didn't, regret)", answer: "should have studied" },
          { type: "fill", prompt: "He ___ (be) the thief — we'll never know. (uncertainty)", answer: "might have been" },
        ],
      },
      {
        title: "Discourse markers",
        order: 3,
        content: "Use connectors to make writing sophisticated.\n**however / nonetheless** = but (formal)\n**furthermore / moreover** = also (formal)\n**consequently** = as a result",
        exercises: [
          { type: "fill", prompt: "The project failed. ___, lessons were learned. (still, despite that)", answer: "Nonetheless" },
          { type: "fill", prompt: "Rents rose sharply. ___, many families left the city. (as a result)", answer: "Consequently" },
        ],
      },
    ],
  },
];
