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
      {
        title: "Plural nouns",
        order: 4,
        content: "Most nouns add **-s**. Nouns ending in -s/-sh/-ch/-x add **-es**. Some are irregular.\n\none book → two **books**; one box → two **boxes**; one child → two **children**.",
        exercises: [
          { type: "fill", prompt: "I have three ___ (book).", answer: "books" },
          { type: "fill", prompt: "There are two ___ (box) on the table.", answer: "boxes" },
          { type: "fill", prompt: "She has five ___ (child).", answer: "children" },
          { type: "fill", prompt: "We took many ___ (bus) today.", answer: "buses" },
        ],
      },
      {
        title: "Possessive adjectives",
        order: 5,
        content: "Use **my, your, his, her, its, our, their** before a noun to show who owns something.\n\nThis is **my** bag. That is **her** car.",
        exercises: [
          { type: "fill", prompt: "I love ___ family. (I)", answer: "my" },
          { type: "fill", prompt: "He is washing ___ car. (he)", answer: "his" },
          { type: "fill", prompt: "They painted ___ house. (they)", answer: "their" },
          { type: "fill", prompt: "She lost ___ keys. (she)", answer: "her" },
        ],
      },
      {
        title: "There is / There are",
        order: 6,
        content: "Use **there is** for one thing (singular) and **there are** for more than one (plural).\n\n**There is** a cat in the garden. **There are** five books on the shelf.",
        exercises: [
          { type: "fill", prompt: "___ a pen on the desk.", answer: "There is" },
          { type: "fill", prompt: "___ three windows in this room.", answer: "There are" },
          { type: "fill", prompt: "___ some milk in the fridge.", answer: "There is" },
          { type: "fill", prompt: "___ many people at the party.", answer: "There are" },
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
      {
        title: "Adverbs of frequency",
        order: 4,
        content: "**always, usually, often, sometimes, rarely, never** say how often. They go BEFORE the main verb but AFTER 'be'.\n\nI **always** drink coffee. She is **never** late.",
        exercises: [
          { type: "fill", prompt: "He ___ goes to bed before midnight. (100% of the time)", answer: "always" },
          { type: "fill", prompt: "I ___ eat fast food. (0% — not at all)", answer: "never" },
          { type: "fill", prompt: "We ___ visit our grandparents on Sundays. (most of the time)", answer: "usually" },
        ],
      },
      {
        title: "some / any / much / many",
        order: 5,
        content: "**some** = positive sentences. **any** = negatives & questions.\n**much** = uncountable nouns; **many** = countable nouns.\n\nThere is **some** water. Is there **any** sugar? I don't have **much** time. How **many** books?",
        exercises: [
          { type: "fill", prompt: "Do you have ___ money?", answer: "any" },
          { type: "fill", prompt: "There are ___ apples in the basket.", answer: "some" },
          { type: "fill", prompt: "How ___ students are in the class?", answer: "many" },
          { type: "fill", prompt: "I don't drink ___ coffee.", answer: "much" },
        ],
      },
      {
        title: "Past Continuous",
        order: 6,
        content: "Use for an action in progress at a past moment. Form: was/were + V-ing.\n\nAt 8pm I **was watching** TV. They **were studying** when I called.",
        exercises: [
          { type: "fill", prompt: "I ___ (sleep) when the phone rang.", answer: "was sleeping" },
          { type: "fill", prompt: "They ___ (play) football at 5pm yesterday.", answer: "were playing" },
          { type: "fill", prompt: "She ___ (cook) dinner when I arrived.", answer: "was cooking" },
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
      {
        title: "Gerunds & Infinitives",
        order: 4,
        content: "Some verbs are followed by **-ing** (enjoy, avoid, finish), others by **to + V** (want, decide, hope).\n\nI enjoy **swimming**. She wants **to leave**.",
        exercises: [
          { type: "fill", prompt: "I enjoy ___ (read) before bed.", answer: "reading" },
          { type: "fill", prompt: "They decided ___ (move) to Hue.", answer: "to move" },
          { type: "fill", prompt: "He avoids ___ (eat) too much sugar.", answer: "eating" },
          { type: "fill", prompt: "We hope ___ (see) you soon.", answer: "to see" },
        ],
      },
      {
        title: "used to",
        order: 5,
        content: "**used to + V** describes past habits or states that are no longer true.\n\nI **used to** play piano. She **used to** live in Da Lat.",
        exercises: [
          { type: "fill", prompt: "I ___ (smoke), but I quit last year.", answer: "used to smoke" },
          { type: "fill", prompt: "There ___ (be) a cinema here.", answer: "used to be" },
          { type: "fill", prompt: "We ___ (walk) to school every day.", answer: "used to walk" },
        ],
      },
      {
        title: "Defining relative clauses",
        order: 6,
        content: "Use **who** (people), **which** (things), **that** (both) to give essential information about a noun.\n\nThe man **who** called you is my uncle. The book **which** I bought is great.",
        exercises: [
          { type: "fill", prompt: "The woman ___ lives next door is a nurse. (person)", answer: "who" },
          { type: "fill", prompt: "This is the phone ___ I told you about. (thing)", answer: "which" },
          { type: "fill", prompt: "The team ___ wins will get a prize. (people or things)", answer: "that" },
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
      {
        title: "Third Conditional (Type 3)",
        order: 4,
        content: "Type 3 talks about an unreal, imaginary PAST. Form: If + Past Perfect, would have + past participle.\n\nIf I **had studied**, I **would have passed** the exam.",
        exercises: [
          { type: "fill", prompt: "If she ___ (leave) earlier, she would have caught the train.", answer: "had left" },
          { type: "fill", prompt: "If we had known, we ___ (help) you.", answer: "would have helped" },
          { type: "fill", prompt: "He would have called if he ___ (have) your number.", answer: "had had" },
        ],
      },
      {
        title: "Wish / If only",
        order: 5,
        content: "**wish + Past** = regret about the present. **wish + Past Perfect** = regret about the past.\n\nI **wish I had** more time. I **wish I had studied** harder.",
        exercises: [
          { type: "fill", prompt: "I wish I ___ (be) taller.", answer: "were" },
          { type: "fill", prompt: "She wishes she ___ (not/say) that yesterday.", answer: "had not said" },
          { type: "fill", prompt: "If only I ___ (know) the answer now!", answer: "knew" },
        ],
      },
      {
        title: "The Causative (have something done)",
        order: 6,
        content: "Use **have/get + object + past participle** when someone else does the action for you.\n\nI **had my hair cut**. She **got her car repaired**.",
        exercises: [
          { type: "fill", prompt: "I need to have my house ___ (paint).", answer: "painted" },
          { type: "fill", prompt: "She had her photo ___ (take) by a pro.", answer: "taken" },
          { type: "fill", prompt: "We got the document ___ (translate).", answer: "translated" },
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
      {
        title: "Participle clauses",
        order: 4,
        content: "Shorten a clause using a participle. **-ing** = active meaning; **-ed** = passive meaning.\n\n**Feeling** tired, she went to bed. **Built** in 1900, the house is old.",
        exercises: [
          { type: "fill", prompt: "___ (not/know) what to say, he stayed silent.", answer: "Not knowing" },
          { type: "fill", prompt: "___ (write) in haste, the letter had errors. (passive)", answer: "Written" },
          { type: "fill", prompt: "___ (live) abroad for years, she speaks four languages.", answer: "Having lived" },
        ],
      },
      {
        title: "Concession (although / despite)",
        order: 5,
        content: "**although / even though + clause**. **despite / in spite of + noun or -ing**.\n\n**Although** it rained, we went out. **Despite** the rain, we went out.",
        exercises: [
          { type: "fill", prompt: "___ being tired, she finished the work. (preposition + -ing)", answer: "Despite" },
          { type: "fill", prompt: "___ he was rich, he felt unhappy. (conjunction + clause)", answer: "Although" },
          { type: "fill", prompt: "They arrived on time in ___ of the heavy traffic.", answer: "spite" },
        ],
      },
      {
        title: "Emphasis with auxiliary 'do'",
        order: 6,
        content: "Add **do / does / did** before the main verb to emphasise it.\n\nI **do** like your idea. She **did** finish on time.",
        exercises: [
          { type: "fill", prompt: "I ___ believe you — I'm not lying! (present emphasis)", answer: "do" },
          { type: "fill", prompt: "He ___ apologise, eventually. (past emphasis)", answer: "did" },
          { type: "fill", prompt: "She ___ enjoy the trip very much. (present, 3rd person)", answer: "does" },
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
      {
        title: "Fronting & marked word order",
        order: 4,
        content: "Move a phrase to the front for emphasis or cohesion. With **so/such** at the front, invert the verb.\n\n**So** loud **was** the music that we left.\n**Such** was his talent that everyone admired him.",
        exercises: [
          { type: "fill", prompt: "So quiet ___ (be) the room that we heard a pin drop.", answer: "was" },
          { type: "fill", prompt: "Such ___ (be) his charm that nobody could refuse.", answer: "was" },
        ],
      },
      {
        title: "Ellipsis & substitution",
        order: 5,
        content: "Avoid repetition by omitting words or using **one / so / do**.\n\n'Do you like tea?' — 'I think **so**.'\nShe can swim and **so can** he.",
        exercises: [
          { type: "fill", prompt: "'Is it raining?' — 'I'm afraid ___.'", answer: "so" },
          { type: "fill", prompt: "I haven't seen it, and neither ___ she. (auxiliary)", answer: "has" },
          { type: "fill", prompt: "He likes coffee and so ___ I. (auxiliary)", answer: "do" },
        ],
      },
      {
        title: "Hedging & cautious language",
        order: 6,
        content: "Academic writing uses cautious language: **tend to, appear to, it seems that, may, arguably**.\n\nThis **tends to** suggest... It **appears** that...",
        exercises: [
          { type: "fill", prompt: "The results ___ to indicate a clear trend. (tend/appear)", answer: "tend" },
          { type: "fill", prompt: "It ___ that the policy was effective. (it ___ that...)", answer: "seems" },
          { type: "fill", prompt: "This finding ___ arguably be questioned. (modal of possibility)", answer: "may" },
        ],
      },
    ],
  },
];
