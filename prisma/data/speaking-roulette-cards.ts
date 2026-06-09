/**
 * Speaking Roulette deck — static seed for /speaking/roulette.
 *
 * Each card = an IELTS Speaking prompt. 12 Part 1 (interview), 6 Part 2 (cue
 * card), 6 Part 3 (discussion). hue cycles through 6 palette tokens so the
 * deck looks visually varied when fanned out.
 *
 * vocab[] is the "Useful vocabulary in context" block — each entry is a
 * sentence with one key word the learner can click to see meaning. We pick
 * mid-band IELTS-friendly vocab (B2+) so it stretches Part 1 candidates and
 * stays natural at Part 3.
 */
export interface RouletteCardSeed {
  part: 1 | 2 | 3;
  topic: string;
  question: string;
  talkPoints: string[];
  vocab: { sentence: string; keyWord: string }[];
  hue: "rose" | "amber" | "emerald" | "sky" | "violet" | "teal";
  order: number;
}

const HUES = ["rose", "amber", "emerald", "sky", "violet", "teal"] as const;

function hue(i: number): RouletteCardSeed["hue"] {
  return HUES[i % HUES.length];
}

const PART1: Omit<RouletteCardSeed, "hue" | "order">[] = [
  {
    part: 1,
    topic: "Art",
    question: "Are you interested in art?",
    talkPoints: [
      "Types of art you like",
      "Whether you create any",
      "Visiting galleries or museums",
    ],
    vocab: [
      { sentence: "I'm not very creative, but I admire those who are.", keyWord: "creative" },
      { sentence: "I went to a fascinating exhibition last month.", keyWord: "exhibition" },
      { sentence: "I really appreciate modern art.", keyWord: "appreciate" },
      { sentence: "Seeing a famous masterpiece in person was amazing.", keyWord: "masterpiece" },
    ],
  },
  {
    part: 1,
    topic: "Family",
    question: "Can you tell me about your family?",
    talkPoints: [
      "How many people in your family",
      "Who you're closest to and why",
      "Things you do together",
    ],
    vocab: [
      { sentence: "We're a very close-knit family.", keyWord: "close-knit" },
      { sentence: "My sister and I always look out for each other.", keyWord: "look out for" },
      { sentence: "We get together for dinner every Sunday.", keyWord: "get together" },
      { sentence: "I take after my mother in personality.", keyWord: "take after" },
    ],
  },
  {
    part: 1,
    topic: "Food",
    question: "What kind of food do you enjoy eating?",
    talkPoints: [
      "Your favourite cuisine",
      "Cooking at home vs eating out",
      "Foods you avoid",
    ],
    vocab: [
      { sentence: "I have a sweet tooth — I can't resist desserts.", keyWord: "sweet tooth" },
      { sentence: "Vietnamese street food is absolutely mouthwatering.", keyWord: "mouthwatering" },
      { sentence: "I try to stick to a balanced diet during the week.", keyWord: "balanced diet" },
      { sentence: "Eating out is a real treat for me.", keyWord: "a real treat" },
    ],
  },
  {
    part: 1,
    topic: "Hobbies",
    question: "What do you do in your free time?",
    talkPoints: [
      "Your main hobby",
      "When you got into it",
      "Why you find it enjoyable",
    ],
    vocab: [
      { sentence: "I've been into photography since I was a teenager.", keyWord: "into" },
      { sentence: "It helps me unwind after a long day.", keyWord: "unwind" },
      { sentence: "I really enjoy picking up new skills.", keyWord: "picking up" },
      { sentence: "It's a great way to recharge my batteries.", keyWord: "recharge my batteries" },
    ],
  },
  {
    part: 1,
    topic: "Music",
    question: "Do you like listening to music?",
    talkPoints: [
      "Genres you prefer",
      "When you listen to music",
      "A favourite artist or song",
    ],
    vocab: [
      { sentence: "I'm really into indie music at the moment.", keyWord: "indie" },
      { sentence: "Music helps me concentrate while I work.", keyWord: "concentrate" },
      { sentence: "I always have a soft spot for 80s pop.", keyWord: "a soft spot for" },
      { sentence: "Their latest album is a real game-changer.", keyWord: "game-changer" },
    ],
  },
  {
    part: 1,
    topic: "Travel",
    question: "Do you enjoy travelling?",
    talkPoints: [
      "Places you've visited",
      "Solo travel vs with friends",
      "What you bring back from a trip",
    ],
    vocab: [
      { sentence: "I love getting off the beaten track.", keyWord: "off the beaten track" },
      { sentence: "Travelling broadens your horizons.", keyWord: "broadens your horizons" },
      { sentence: "I prefer to soak up the local culture.", keyWord: "soak up" },
      { sentence: "Every trip leaves me with unforgettable memories.", keyWord: "unforgettable" },
    ],
  },
  {
    part: 1,
    topic: "Sport",
    question: "Do you play any sports?",
    talkPoints: [
      "Sports you play or watch",
      "How often you exercise",
      "Benefits of staying active",
    ],
    vocab: [
      { sentence: "I try to stay active throughout the week.", keyWord: "stay active" },
      { sentence: "It's a great way to blow off steam.", keyWord: "blow off steam" },
      { sentence: "I'm a die-hard fan of football.", keyWord: "die-hard" },
      { sentence: "Working out keeps me in good shape.", keyWord: "in good shape" },
    ],
  },
  {
    part: 1,
    topic: "Weather",
    question: "What kind of weather do you like?",
    talkPoints: [
      "Your favourite season",
      "Weather where you live",
      "How weather affects your mood",
    ],
    vocab: [
      { sentence: "I'm really not a fan of scorching summers.", keyWord: "scorching" },
      { sentence: "A crisp autumn morning is my favourite.", keyWord: "crisp" },
      { sentence: "It's been pouring down all week.", keyWord: "pouring down" },
      { sentence: "The weather can really lift your spirits.", keyWord: "lift your spirits" },
    ],
  },
  {
    part: 1,
    topic: "Reading",
    question: "Do you read often?",
    talkPoints: [
      "What you enjoy reading",
      "When and where you read",
      "Paper books vs e-books",
    ],
    vocab: [
      { sentence: "I always have a book on the go.", keyWord: "on the go" },
      { sentence: "A good novel can be totally absorbing.", keyWord: "absorbing" },
      { sentence: "I tend to dive into fiction at weekends.", keyWord: "dive into" },
      { sentence: "Reading has broadened my vocabulary a lot.", keyWord: "broadened" },
    ],
  },
  {
    part: 1,
    topic: "Routine",
    question: "What's your daily routine like?",
    talkPoints: [
      "When you wake up and sleep",
      "How you spend mornings",
      "A typical evening",
    ],
    vocab: [
      { sentence: "I'm definitely a morning person.", keyWord: "morning person" },
      { sentence: "I like to ease into my day with coffee.", keyWord: "ease into" },
      { sentence: "Evenings are when I wind down.", keyWord: "wind down" },
      { sentence: "Sticking to a routine keeps me productive.", keyWord: "sticking to" },
    ],
  },
  {
    part: 1,
    topic: "Friends",
    question: "Are friends important to you?",
    talkPoints: [
      "Your closest friends",
      "How you met",
      "How you stay in touch",
    ],
    vocab: [
      { sentence: "My friends and I go way back.", keyWord: "go way back" },
      { sentence: "We hit it off the first time we met.", keyWord: "hit it off" },
      { sentence: "It's nice to catch up with old friends.", keyWord: "catch up with" },
      { sentence: "Good friends always have your back.", keyWord: "have your back" },
    ],
  },
  {
    part: 1,
    topic: "Weekend",
    question: "What do you usually do at weekends?",
    talkPoints: [
      "Sleeping in vs early start",
      "Going out vs staying home",
      "A perfect weekend",
    ],
    vocab: [
      { sentence: "I love to sleep in on Saturdays.", keyWord: "sleep in" },
      { sentence: "We sometimes hit the road for a short trip.", keyWord: "hit the road" },
      { sentence: "I always look forward to the weekend.", keyWord: "look forward to" },
      { sentence: "A cosy weekend at home is my idea of bliss.", keyWord: "bliss" },
    ],
  },
];

const PART2: Omit<RouletteCardSeed, "hue" | "order">[] = [
  {
    part: 2,
    topic: "A person",
    question:
      "Describe a person who has influenced you. You should say who they are, how you know them, what they did, and explain why they influenced you.",
    talkPoints: [
      "Who they are and how you met",
      "Specific things they did or said",
      "How your life or thinking changed",
    ],
    vocab: [
      { sentence: "She had a profound impact on my career.", keyWord: "profound impact" },
      { sentence: "He was a mentor in the truest sense.", keyWord: "mentor" },
      { sentence: "Her words still resonate with me today.", keyWord: "resonate" },
      { sentence: "I look up to him even now.", keyWord: "look up to" },
    ],
  },
  {
    part: 2,
    topic: "A place",
    question:
      "Describe a place you would love to visit. You should say where it is, how you heard about it, what you would do there, and why you want to go.",
    talkPoints: [
      "Location and how to get there",
      "What draws you to the place",
      "What you'd hope to take away from the trip",
    ],
    vocab: [
      { sentence: "It's been on my bucket list for years.", keyWord: "bucket list" },
      { sentence: "The scenery there is supposed to be breathtaking.", keyWord: "breathtaking" },
      { sentence: "I'd want to immerse myself in the culture.", keyWord: "immerse myself" },
      { sentence: "It would be the trip of a lifetime.", keyWord: "trip of a lifetime" },
    ],
  },
  {
    part: 2,
    topic: "A meal",
    question:
      "Describe a memorable meal you have had. You should say what the meal was, who you were with, where it took place, and explain why it was memorable.",
    talkPoints: [
      "What was on the table",
      "Who you shared it with",
      "Why it stays in your memory",
    ],
    vocab: [
      { sentence: "The flavours were absolutely out of this world.", keyWord: "out of this world" },
      { sentence: "The whole meal was beautifully presented.", keyWord: "beautifully presented" },
      { sentence: "It brought everyone together.", keyWord: "brought together" },
      { sentence: "I'll savour the memory for a long time.", keyWord: "savour" },
    ],
  },
  {
    part: 2,
    topic: "A challenge",
    question:
      "Describe a challenge you have overcome. You should say what the challenge was, when it happened, how you handled it, and what you learned.",
    talkPoints: [
      "What made it difficult",
      "Steps you took to deal with it",
      "What it taught you",
    ],
    vocab: [
      { sentence: "I had to step out of my comfort zone.", keyWord: "comfort zone" },
      { sentence: "I worked through it bit by bit.", keyWord: "bit by bit" },
      { sentence: "It really tested my resilience.", keyWord: "resilience" },
      { sentence: "Looking back, it was a blessing in disguise.", keyWord: "blessing in disguise" },
    ],
  },
  {
    part: 2,
    topic: "A gift",
    question:
      "Describe a gift you have given or received. You should say what it was, who gave or received it, why it was special, and how you felt about it.",
    talkPoints: [
      "The gift itself",
      "The occasion",
      "Why it meant so much",
    ],
    vocab: [
      { sentence: "It was a thoughtful gesture.", keyWord: "thoughtful gesture" },
      { sentence: "The gift had real sentimental value.", keyWord: "sentimental value" },
      { sentence: "It put a huge smile on my face.", keyWord: "put a smile on my face" },
      { sentence: "I'll treasure it for years to come.", keyWord: "treasure" },
    ],
  },
  {
    part: 2,
    topic: "A skill",
    question:
      "Describe a skill you would like to learn. You should say what the skill is, why you want to learn it, how you would learn it, and how it might change your life.",
    talkPoints: [
      "Why this skill appeals to you",
      "Resources or teachers you would use",
      "What you'd do with it once mastered",
    ],
    vocab: [
      { sentence: "I'd love to pick up a new language.", keyWord: "pick up" },
      { sentence: "It would broaden my career prospects.", keyWord: "career prospects" },
      { sentence: "I'd practise diligently every day.", keyWord: "diligently" },
      { sentence: "Mastering it would be a huge milestone.", keyWord: "milestone" },
    ],
  },
];

const PART3: Omit<RouletteCardSeed, "hue" | "order">[] = [
  {
    part: 3,
    topic: "Technology",
    question:
      "How has technology changed the way families spend time together?",
    talkPoints: [
      "Positive effects",
      "Negative effects on conversation",
      "What families could do differently",
    ],
    vocab: [
      { sentence: "Screens can dominate family time.", keyWord: "dominate" },
      { sentence: "Technology has bridged long distances.", keyWord: "bridged" },
      { sentence: "Families need to set healthy boundaries.", keyWord: "set boundaries" },
      { sentence: "Quality time has become harder to come by.", keyWord: "come by" },
    ],
  },
  {
    part: 3,
    topic: "Education",
    question:
      "Do you think traditional classrooms are still the best place to learn?",
    talkPoints: [
      "Strengths of in-person learning",
      "Where online learning works better",
      "A blended future",
    ],
    vocab: [
      { sentence: "Classrooms foster face-to-face interaction.", keyWord: "foster" },
      { sentence: "Online learning offers great flexibility.", keyWord: "flexibility" },
      { sentence: "A blended approach has clear advantages.", keyWord: "blended approach" },
      { sentence: "Self-discipline is crucial for online learners.", keyWord: "self-discipline" },
    ],
  },
  {
    part: 3,
    topic: "Environment",
    question: "Who is most responsible for protecting the environment — individuals, businesses, or governments?",
    talkPoints: [
      "Role of individual choices",
      "Corporate responsibility",
      "Government regulation",
    ],
    vocab: [
      { sentence: "We all have a part to play.", keyWord: "a part to play" },
      { sentence: "Corporations need to take real accountability.", keyWord: "accountability" },
      { sentence: "Strict regulation can curb emissions.", keyWord: "curb" },
      { sentence: "Sustainability has to be at the heart of policy.", keyWord: "sustainability" },
    ],
  },
  {
    part: 3,
    topic: "Tourism",
    question: "Does tourism do more good than harm to local communities?",
    talkPoints: [
      "Economic benefits",
      "Cultural and environmental damage",
      "Sustainable tourism",
    ],
    vocab: [
      { sentence: "Tourism can boost local economies.", keyWord: "boost" },
      { sentence: "Mass tourism puts pressure on infrastructure.", keyWord: "puts pressure on" },
      { sentence: "Over-tourism can dilute local culture.", keyWord: "dilute" },
      { sentence: "Ecotourism is a step in the right direction.", keyWord: "step in the right direction" },
    ],
  },
  {
    part: 3,
    topic: "Work",
    question: "Is work-life balance achievable in today's world?",
    talkPoints: [
      "Why it's harder now",
      "Healthy strategies",
      "Employer responsibility",
    ],
    vocab: [
      { sentence: "Many people feel burned out at work.", keyWord: "burned out" },
      { sentence: "Setting clear boundaries is essential.", keyWord: "boundaries" },
      { sentence: "Remote work has been a double-edged sword.", keyWord: "double-edged sword" },
      { sentence: "Companies should prioritise employee wellbeing.", keyWord: "wellbeing" },
    ],
  },
  {
    part: 3,
    topic: "Culture",
    question: "How important is it to preserve traditional culture in modern times?",
    talkPoints: [
      "Why traditions matter",
      "Tensions with modern life",
      "Practical ways to preserve them",
    ],
    vocab: [
      { sentence: "Traditions give us a sense of identity.", keyWord: "sense of identity" },
      { sentence: "Globalisation can erode local cultures.", keyWord: "erode" },
      { sentence: "Festivals help keep traditions alive.", keyWord: "keep alive" },
      { sentence: "Heritage should be safeguarded for the next generation.", keyWord: "safeguarded" },
    ],
  },
];

export const SPEAKING_ROULETTE_CARDS: RouletteCardSeed[] = [
  ...PART1.map((c, i) => ({ ...c, hue: hue(i), order: i })),
  ...PART2.map((c, i) => ({ ...c, hue: hue(i + 1), order: i })),
  ...PART3.map((c, i) => ({ ...c, hue: hue(i + 2), order: i })),
];
