/**
 * Sample Reading practice for the 4.0 → 5.0 Vượt Band stage.
 *
 * Designed to drill two specific tips from the band-climb brief:
 *  1. "Săn từ neo cứng" — every question's answer sits next to a hard
 *     keyword (a number, year, capitalised name, country or quoted term)
 *     that paraphrase cannot disguise.
 *  2. "Ưu tiên dạng bài theo thứ tự" — the first 6 questions are order-based
 *     (T/F/NG, Fill, Short Answer) and the 2 MATCHING_HEADINGS sit at the
 *     end so learners can practise skipping them until everything else is done.
 *
 * The passage is deliberately about honey bees so it lines up with the 🐝
 * mascot guiding the tour.
 */

export interface SampleQuestion {
  type:
    | "TRUE_FALSE_NOT_GIVEN"
    | "FILL_BLANK"
    | "SHORT_ANSWER"
    | "MATCHING_HEADINGS";
  prompt: string;
  options: string[] | null;
  correctAnswer: string;
  explanation: string;
  order: number;
}

export interface SampleReadingTest {
  title: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  timeLimit: number;
  passage: string;
  questions: SampleQuestion[];
}

const PASSAGE = `The Hidden World of Honey Bees

A. Honey bees (Apis mellifera) are among the most studied insects on Earth. A single hive can contain up to 60,000 bees living together in a tightly organised society. Every member has a clear role: the queen lays eggs, the workers gather nectar and protect the colony, and the drones mate with new queens. Ancient writers were already fascinated by this social order — Aristotle described bee colonies in detail more than two thousand years ago, though he wrote little about how individual bees actually communicate.

B. In 1851, the American pastor Lorenzo Langstroth designed the first practical moveable-frame hive. His design used a precise spacing of about 9 millimetres between frames, the so-called "bee space", which prevents bees from gluing the frames together with wax. This single discovery allowed beekeepers to inspect hives without destroying them, and it is still the basis of nearly every commercial hive in use today.

C. One of the most remarkable bee behaviours is communication. The Austrian biologist Karl von Frisch decoded the famous "waggle dance" in the 1940s, work for which he later shared the Nobel Prize in 1973. When a forager returns to the hive after finding flowers, she dances on the vertical comb. The angle of her dance tells other bees the direction of the flowers relative to the sun, while the duration of the dance shows the distance — sometimes 20 to 40 km away from the hive.

D. Honey bees are not native to Australia. They were brought there from England in 1822 and quickly spread across the country, where they became important pollinators for crops such as almonds and apples. Today, roughly one third of every meal we eat depends, directly or indirectly, on insect pollination. Charles Darwin once joked that without bees, large parts of the British countryside would simply look very different.

E. Despite their importance, honey bees face serious threats. Since 2006, beekeepers in North America and Europe have reported sudden hive collapses, a phenomenon now called "Colony Collapse Disorder". The suspected causes include pesticides, parasitic mites, viruses and the stress of being transported long distances for commercial pollination. Researchers warn that losing honey bees would not only damage agriculture but also reshape entire ecosystems.`;

const HEADINGS = [
  "i. A modern threat to bee populations",
  "ii. The invention of the modern hive",
  "iii. How bees share information",
  "iv. Bees as travellers across continents",
  "v. The structure of a bee colony",
];

export const SAMPLE_READING_4_TO_5: SampleReadingTest = {
  title: "Vượt 4→5: The Hidden World of Honey Bees",
  level: "A2",
  timeLimit: 1200,
  passage: PASSAGE,
  questions: [
    {
      type: "TRUE_FALSE_NOT_GIVEN",
      prompt: "A single honey bee hive can hold as many as 60,000 bees.",
      options: ["TRUE", "FALSE", "NOT GIVEN"],
      correctAnswer: "TRUE",
      explanation:
        "Từ neo: con số '60,000' ở đoạn A. Câu hỏi paraphrase 'up to 60,000 bees' → 'as many as 60,000 bees'. Quét bài tìm con số sẽ ra đáp án ngay.",
      order: 0,
    },
    {
      type: "TRUE_FALSE_NOT_GIVEN",
      prompt:
        "Aristotle wrote a detailed description of how individual bees communicate with each other.",
      options: ["TRUE", "FALSE", "NOT GIVEN"],
      correctAnswer: "FALSE",
      explanation:
        "Từ neo: tên riêng 'Aristotle' ở đoạn A. Bài viết: 'he wrote little about how individual bees actually communicate' — ngược lại với câu hỏi, nên FALSE (không phải NOT GIVEN vì bài có nhắc tới).",
      order: 1,
    },
    {
      type: "TRUE_FALSE_NOT_GIVEN",
      prompt: "Karl von Frisch received the Nobel Prize before he decoded the waggle dance.",
      options: ["TRUE", "FALSE", "NOT GIVEN"],
      correctAnswer: "FALSE",
      explanation:
        "Từ neo: hai năm '1940s' và '1973' ở đoạn C. Frisch giải mã waggle dance trong 1940s rồi mới được Nobel năm 1973 — tức là sau, không phải trước.",
      order: 2,
    },
    {
      type: "FILL_BLANK",
      prompt:
        "Langstroth's hive design uses a spacing of about ____ millimetres between frames.",
      options: null,
      correctAnswer: "9",
      explanation:
        "Từ neo: cụm trong ngoặc kép '\"bee space\"' và con số '9 millimetres' ở đoạn B. Đáp án nằm sát ngay cạnh con số — kỹ thuật 'săn từ neo' kinh điển.",
      order: 3,
    },
    {
      type: "FILL_BLANK",
      prompt: "Honey bees were first brought to Australia from ____ in 1822.",
      options: null,
      correctAnswer: "England",
      explanation:
        "Từ neo: tên quốc gia 'Australia' và năm '1822' ở đoạn D. Hai từ neo này nằm cùng một câu với đáp án → quét tên riêng viết hoa là ra.",
      order: 4,
    },
    {
      type: "SHORT_ANSWER",
      prompt:
        "According to the passage, what does the ANGLE of a bee's waggle dance indicate? (one word)",
      options: null,
      correctAnswer: "direction",
      explanation:
        "Từ neo: cụm trong ngoặc kép '\"waggle dance\"' ở đoạn C. Câu chứa đáp án: 'The angle of her dance tells other bees the direction of the flowers' — đáp án là 'direction'.",
      order: 5,
    },
    {
      type: "MATCHING_HEADINGS",
      prompt: "Choose the best heading for Paragraph C.",
      options: HEADINGS,
      correctAnswer: "iii. How bees share information",
      explanation:
        "Mẹo: dạng Matching Headings để CUỐI cùng. Đoạn C nói về waggle dance và cách bees truyền tin về phương hướng + khoảng cách → khớp với 'How bees share information'.",
      order: 6,
    },
    {
      type: "MATCHING_HEADINGS",
      prompt: "Choose the best heading for Paragraph E.",
      options: HEADINGS,
      correctAnswer: "i. A modern threat to bee populations",
      explanation:
        "Mẹo: dạng Matching Headings để CUỐI cùng. Đoạn E nói về 'Colony Collapse Disorder' từ 2006, các nguyên nhân đe doạ đàn ong → khớp với 'A modern threat to bee populations'.",
      order: 7,
    },
  ],
};

/**
 * The tip block that gets sent to Groq as `bandClimbContext` whenever a
 * learner asks for an AI explanation during the 4→5 stage. Keep it short —
 * the model needs to weave these into its reasoning, not regurgitate them.
 */
export const BAND_4_TO_5_TIPS = `Stage: Vượt band 4.0 → 5.0 (Reading).
Two key techniques the learner is practising:
1. SĂN TỪ NEO CỨNG — locate the answer by scanning for "hard keywords" that paraphrase cannot hide: numbers, years, capitalised names, country names, and terms inside quotation marks. The answer almost always sits within 1-2 sentences of the anchor.
2. ƯU TIÊN DẠNG BÀI THEO THỨ TỰ — order-based question types (TRUE/FALSE/NOT GIVEN, FILL_BLANK, SHORT_ANSWER) should be tackled first because the answers appear in passage order. MATCHING_HEADINGS and "Which paragraph contains" should be left until the end to avoid wasting time.`;
