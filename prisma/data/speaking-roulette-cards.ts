/**
 * Speaking Roulette deck — static seed for /speaking/roulette.
 *
 * Each card = an IELTS Speaking prompt. 24 Part 1 (interview), 14 Part 2 (cue
 * card), 14 Part 3 (discussion) — 52 cards total. hue cycles through 6
 * palette tokens so the deck looks visually varied when fanned out.
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
  {
    part: 1,
    topic: "Hometown",
    question: "Can you describe your hometown?",
    talkPoints: [
      "Where it is and what it's like",
      "What it's known for",
      "Whether you'd like to keep living there",
    ],
    vocab: [
      { sentence: "It's a bustling city with a lot going on.", keyWord: "bustling" },
      { sentence: "The town has a laid-back atmosphere.", keyWord: "laid-back" },
      { sentence: "It's steeped in history.", keyWord: "steeped in history" },
      { sentence: "I was born and raised there.", keyWord: "born and raised" },
    ],
  },
  {
    part: 1,
    topic: "Work / Study",
    question: "Do you work or are you a student?",
    talkPoints: [
      "What you do or study",
      "What a typical day looks like",
      "What you enjoy most about it",
    ],
    vocab: [
      { sentence: "I'm currently juggling work and studying.", keyWord: "juggling" },
      { sentence: "My job can be quite demanding at times.", keyWord: "demanding" },
      { sentence: "I find the work really rewarding.", keyWord: "rewarding" },
      { sentence: "I'm hoping to climb the career ladder.", keyWord: "climb the career ladder" },
    ],
  },
  {
    part: 1,
    topic: "Smartphones",
    question: "How often do you use your smartphone?",
    talkPoints: [
      "What you mainly use it for",
      "Whether you use it too much",
      "Life before smartphones",
    ],
    vocab: [
      { sentence: "I'm pretty much glued to my phone.", keyWord: "glued to" },
      { sentence: "It's become an indispensable tool.", keyWord: "indispensable" },
      { sentence: "I try to cut down on screen time.", keyWord: "cut down on" },
      { sentence: "Notifications can be really distracting.", keyWord: "distracting" },
    ],
  },
  {
    part: 1,
    topic: "Shopping",
    question: "Do you enjoy shopping?",
    talkPoints: [
      "What you like to shop for",
      "Online vs in-store",
      "Whether you shop on impulse",
    ],
    vocab: [
      { sentence: "I'm a bit of a shopaholic, to be honest.", keyWord: "shopaholic" },
      { sentence: "I often buy things on impulse.", keyWord: "on impulse" },
      { sentence: "I always look out for a good bargain.", keyWord: "bargain" },
      { sentence: "Online shopping is so convenient.", keyWord: "convenient" },
    ],
  },
  {
    part: 1,
    topic: "Clothes",
    question: "Are you interested in fashion?",
    talkPoints: [
      "Your personal style",
      "Comfort vs looking good",
      "Where you buy clothes",
    ],
    vocab: [
      { sentence: "I tend to dress casually most days.", keyWord: "casually" },
      { sentence: "Comfort always comes first for me.", keyWord: "comes first" },
      { sentence: "I don't really follow the latest trends.", keyWord: "trends" },
      { sentence: "I like outfits that are versatile.", keyWord: "versatile" },
    ],
  },
  {
    part: 1,
    topic: "Animals",
    question: "Do you like animals or have any pets?",
    talkPoints: [
      "Pets you have or had",
      "Your favourite animal",
      "Whether pets are good for people",
    ],
    vocab: [
      { sentence: "My dog is incredibly loyal.", keyWord: "loyal" },
      { sentence: "Pets can be great companions.", keyWord: "companions" },
      { sentence: "Looking after a pet teaches responsibility.", keyWord: "responsibility" },
      { sentence: "I've always been an animal lover.", keyWord: "animal lover" },
    ],
  },
  {
    part: 1,
    topic: "Photos",
    question: "Do you like taking photographs?",
    talkPoints: [
      "What you like to photograph",
      "Phone camera vs real camera",
      "What you do with your photos",
    ],
    vocab: [
      { sentence: "I love capturing little moments.", keyWord: "capturing" },
      { sentence: "Photos help me hold on to memories.", keyWord: "hold on to" },
      { sentence: "A good photo is worth a thousand words.", keyWord: "worth a thousand words" },
      { sentence: "I like editing my shots afterwards.", keyWord: "editing" },
    ],
  },
  {
    part: 1,
    topic: "Sleep",
    question: "Do you usually get enough sleep?",
    talkPoints: [
      "Your sleeping habits",
      "Whether you nap",
      "How sleep affects your day",
    ],
    vocab: [
      { sentence: "I'm a bit of a night owl.", keyWord: "night owl" },
      { sentence: "I often struggle to drift off.", keyWord: "drift off" },
      { sentence: "A good night's sleep works wonders.", keyWord: "works wonders" },
      { sentence: "I feel groggy if I sleep too little.", keyWord: "groggy" },
    ],
  },
  {
    part: 1,
    topic: "Social media",
    question: "How much time do you spend on social media?",
    talkPoints: [
      "Apps you use most",
      "What you post or watch",
      "Pros and cons of it",
    ],
    vocab: [
      { sentence: "I mainly use it to stay in the loop.", keyWord: "stay in the loop" },
      { sentence: "It's easy to scroll mindlessly for hours.", keyWord: "mindlessly" },
      { sentence: "Social media keeps me connected with friends.", keyWord: "connected" },
      { sentence: "Sometimes it can be a real time-waster.", keyWord: "time-waster" },
    ],
  },
  {
    part: 1,
    topic: "Festivals",
    question: "What is your favourite festival or holiday?",
    talkPoints: [
      "How people celebrate it",
      "What you do with family",
      "Why you enjoy it",
    ],
    vocab: [
      { sentence: "The whole city is decked out for the festival.", keyWord: "decked out" },
      { sentence: "It's a time to get together with loved ones.", keyWord: "loved ones" },
      { sentence: "There's a real festive atmosphere.", keyWord: "festive" },
      { sentence: "We uphold a lot of old customs.", keyWord: "customs" },
    ],
  },
  {
    part: 1,
    topic: "Nature",
    question: "Do you like spending time in nature?",
    talkPoints: [
      "Outdoor places you go",
      "Activities you do there",
      "How it makes you feel",
    ],
    vocab: [
      { sentence: "Being outdoors helps me clear my head.", keyWord: "clear my head" },
      { sentence: "The countryside is so peaceful and serene.", keyWord: "serene" },
      { sentence: "I love breathing in the fresh air.", keyWord: "fresh air" },
      { sentence: "Nature really helps me de-stress.", keyWord: "de-stress" },
    ],
  },
  {
    part: 1,
    topic: "Transport",
    question: "How do you usually get around?",
    talkPoints: [
      "Your main mode of transport",
      "Public transport where you live",
      "Driving vs walking or cycling",
    ],
    vocab: [
      { sentence: "I usually commute by bus.", keyWord: "commute" },
      { sentence: "Traffic during rush hour is a nightmare.", keyWord: "rush hour" },
      { sentence: "Cycling is a cheap and eco-friendly option.", keyWord: "eco-friendly" },
      { sentence: "Public transport here is pretty reliable.", keyWord: "reliable" },
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
  {
    part: 2,
    topic: "A possession",
    question:
      "Describe a possession that is important to you. You should say what it is, how you got it, how often you use it, and explain why it matters to you.",
    talkPoints: [
      "What the object is",
      "How it came into your life",
      "Why you'd hate to lose it",
    ],
    vocab: [
      { sentence: "It has huge sentimental value to me.", keyWord: "sentimental value" },
      { sentence: "I'd be lost without it.", keyWord: "lost without it" },
      { sentence: "It was handed down to me.", keyWord: "handed down" },
      { sentence: "I cherish it more than anything.", keyWord: "cherish" },
    ],
  },
  {
    part: 2,
    topic: "An event",
    question:
      "Describe a memorable event or celebration you attended. You should say what it was, where it took place, who was there, and explain why it was memorable.",
    talkPoints: [
      "The occasion and setting",
      "Who you were with",
      "The highlight of the day",
    ],
    vocab: [
      { sentence: "The atmosphere was absolutely electric.", keyWord: "electric" },
      { sentence: "It was a once-in-a-lifetime experience.", keyWord: "once-in-a-lifetime" },
      { sentence: "Everyone was in high spirits.", keyWord: "in high spirits" },
      { sentence: "It went off without a hitch.", keyWord: "without a hitch" },
    ],
  },
  {
    part: 2,
    topic: "A book or film",
    question:
      "Describe a book or film that made an impression on you. You should say what it was, what it was about, when you read or watched it, and explain why it stayed with you.",
    talkPoints: [
      "The story or main idea",
      "A character or moment that struck you",
      "How it made you think or feel",
    ],
    vocab: [
      { sentence: "The plot had me hooked from the start.", keyWord: "hooked" },
      { sentence: "It really struck a chord with me.", keyWord: "struck a chord" },
      { sentence: "The ending was a real eye-opener.", keyWord: "eye-opener" },
      { sentence: "It's a thought-provoking story.", keyWord: "thought-provoking" },
    ],
  },
  {
    part: 2,
    topic: "A decision",
    question:
      "Describe an important decision you have made. You should say what it was, why you had to make it, how you decided, and explain how you feel about it now.",
    talkPoints: [
      "The situation you faced",
      "How you weighed your options",
      "Whether it was the right call",
    ],
    vocab: [
      { sentence: "I had to weigh up the pros and cons.", keyWord: "weigh up" },
      { sentence: "It was a tough call to make.", keyWord: "tough call" },
      { sentence: "In hindsight, I made the right choice.", keyWord: "in hindsight" },
      { sentence: "I had to trust my gut.", keyWord: "trust my gut" },
    ],
  },
  {
    part: 2,
    topic: "A hobby",
    question:
      "Describe a hobby or activity you enjoy doing. You should say what it is, how you got into it, how often you do it, and explain why you find it enjoyable.",
    talkPoints: [
      "How you started",
      "What it involves",
      "How it makes you feel",
    ],
    vocab: [
      { sentence: "I got hooked on it almost instantly.", keyWord: "got hooked" },
      { sentence: "It's the perfect way to unwind.", keyWord: "unwind" },
      { sentence: "I find it really therapeutic.", keyWord: "therapeutic" },
      { sentence: "I've stuck with it for years.", keyWord: "stuck with" },
    ],
  },
  {
    part: 2,
    topic: "A teacher",
    question:
      "Describe a teacher who had an impact on you. You should say who they were, what they taught, what they were like, and explain how they influenced you.",
    talkPoints: [
      "What made them stand out",
      "How they taught",
      "The lasting effect on you",
    ],
    vocab: [
      { sentence: "She brought the subject to life.", keyWord: "brought to life" },
      { sentence: "He always pushed us to do our best.", keyWord: "pushed us" },
      { sentence: "She believed in me when I didn't.", keyWord: "believed in me" },
      { sentence: "He inspired a lifelong love of learning.", keyWord: "inspired" },
    ],
  },
  {
    part: 2,
    topic: "A city",
    question:
      "Describe a city you have visited and liked. You should say where it is, when you went, what you did there, and explain why you liked it.",
    talkPoints: [
      "First impressions",
      "What you saw and did",
      "What made it special",
    ],
    vocab: [
      { sentence: "The city has a real charm to it.", keyWord: "charm" },
      { sentence: "It's a vibrant, cosmopolitan place.", keyWord: "cosmopolitan" },
      { sentence: "There was so much to take in.", keyWord: "take in" },
      { sentence: "I'd go back in a heartbeat.", keyWord: "in a heartbeat" },
    ],
  },
  {
    part: 2,
    topic: "A goal",
    question:
      "Describe a goal you hope to achieve in the future. You should say what it is, why you set it, what steps you'll take, and explain how you'll feel when you reach it.",
    talkPoints: [
      "What the goal is",
      "Why it matters to you",
      "Your plan to get there",
    ],
    vocab: [
      { sentence: "I'm determined to see it through.", keyWord: "see it through" },
      { sentence: "I've set myself a realistic target.", keyWord: "target" },
      { sentence: "I'm willing to put in the hard work.", keyWord: "put in the hard work" },
      { sentence: "Reaching it would mean the world to me.", keyWord: "mean the world to me" },
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
  {
    part: 3,
    topic: "Society",
    question: "How are the roles of men and women changing in society today?",
    talkPoints: [
      "Changes in the workplace and home",
      "What's driving the change",
      "Remaining inequalities",
    ],
    vocab: [
      { sentence: "Old gender stereotypes are breaking down.", keyWord: "stereotypes" },
      { sentence: "There's been a real shift in attitudes.", keyWord: "shift" },
      { sentence: "We still have a long way to go on equality.", keyWord: "equality" },
      { sentence: "Shared responsibilities are becoming the norm.", keyWord: "the norm" },
    ],
  },
  {
    part: 3,
    topic: "Media",
    question: "Can we trust the news and information we read online?",
    talkPoints: [
      "The spread of misinformation",
      "How to check sources",
      "Role of social media",
    ],
    vocab: [
      { sentence: "Fake news spreads like wildfire online.", keyWord: "fake news" },
      { sentence: "We need to verify our sources.", keyWord: "verify" },
      { sentence: "People should think critically about what they read.", keyWord: "think critically" },
      { sentence: "Clickbait headlines can be misleading.", keyWord: "misleading" },
    ],
  },
  {
    part: 3,
    topic: "Health",
    question: "Whose responsibility is it to keep people healthy?",
    talkPoints: [
      "Personal lifestyle choices",
      "Role of governments",
      "Healthcare and education",
    ],
    vocab: [
      { sentence: "Prevention is better than cure.", keyWord: "prevention" },
      { sentence: "Governments should promote healthy lifestyles.", keyWord: "promote" },
      { sentence: "People need to take ownership of their health.", keyWord: "take ownership" },
      { sentence: "Affordable healthcare is a basic right.", keyWord: "affordable" },
    ],
  },
  {
    part: 3,
    topic: "Money",
    question: "Do you think money can buy happiness?",
    talkPoints: [
      "What money can and can't provide",
      "Security vs fulfilment",
      "Other sources of happiness",
    ],
    vocab: [
      { sentence: "Money can provide a sense of security.", keyWord: "security" },
      { sentence: "Beyond a point, more money brings diminishing returns.", keyWord: "diminishing returns" },
      { sentence: "True fulfilment comes from relationships.", keyWord: "fulfilment" },
      { sentence: "Chasing wealth can be a hollow pursuit.", keyWord: "hollow" },
    ],
  },
  {
    part: 3,
    topic: "City life",
    question: "What are the main advantages and disadvantages of living in a big city?",
    talkPoints: [
      "Opportunities and convenience",
      "Cost and quality of life",
      "City vs countryside",
    ],
    vocab: [
      { sentence: "Cities offer a wealth of opportunities.", keyWord: "a wealth of" },
      { sentence: "The cost of living can be sky-high.", keyWord: "sky-high" },
      { sentence: "Overcrowding is a growing problem.", keyWord: "overcrowding" },
      { sentence: "There's always something going on.", keyWord: "going on" },
    ],
  },
  {
    part: 3,
    topic: "The future",
    question: "How do you think jobs will change in the next fifty years?",
    talkPoints: [
      "Automation and AI",
      "Skills that will matter",
      "New kinds of work",
    ],
    vocab: [
      { sentence: "Automation will replace many routine jobs.", keyWord: "automation" },
      { sentence: "Workers will need to adapt and reskill.", keyWord: "reskill" },
      { sentence: "Creativity will become increasingly valuable.", keyWord: "increasingly" },
      { sentence: "The job market is evolving fast.", keyWord: "evolving" },
    ],
  },
  {
    part: 3,
    topic: "Languages",
    question: "Should everyone learn a second language?",
    talkPoints: [
      "Benefits of being bilingual",
      "Cultural understanding",
      "Is English enough?",
    ],
    vocab: [
      { sentence: "Speaking another language broadens your mind.", keyWord: "broadens your mind" },
      { sentence: "It opens doors to new cultures.", keyWord: "opens doors" },
      { sentence: "Being bilingual is a huge asset.", keyWord: "asset" },
      { sentence: "Language barriers can cause misunderstandings.", keyWord: "language barriers" },
    ],
  },
  {
    part: 3,
    topic: "Youth",
    question: "Do young people today have more opportunities than previous generations?",
    talkPoints: [
      "Access to education and technology",
      "New pressures they face",
      "Comparing generations",
    ],
    vocab: [
      { sentence: "Young people have unprecedented access to information.", keyWord: "unprecedented" },
      { sentence: "They face fierce competition for jobs.", keyWord: "fierce competition" },
      { sentence: "There's a lot of pressure to succeed.", keyWord: "pressure" },
      { sentence: "Technology has levelled the playing field.", keyWord: "levelled the playing field" },
    ],
  },
];

export const SPEAKING_ROULETTE_CARDS: RouletteCardSeed[] = [
  ...PART1.map((c, i) => ({ ...c, hue: hue(i), order: i })),
  ...PART2.map((c, i) => ({ ...c, hue: hue(i + 1), order: i })),
  ...PART3.map((c, i) => ({ ...c, hue: hue(i + 2), order: i })),
];
