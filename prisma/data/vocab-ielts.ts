/**
 * IELTS-focused vocab expansion. 12 thematic units across B1 / B2 / C1,
 * each with 3-4 lessons, ~8-10 exercises per lesson → ~300+ practice
 * items covering ~240 unique IELTS-relevant words.
 *
 * Generation strategy: each unit defines a flat `words` array (English +
 * Vietnamese pairs). The `buildLessonExercises` helper rotates each word
 * through 2-3 exercise types (translate / match / type) and shuffles the
 * distractors from the same lesson's word pool. This is denser content
 * than hand-writing every exercise and keeps quality consistent.
 *
 * Order ranges live in the 10+ band per level so they sort AFTER the
 * starter A1/A2/B1/B2/C1 units already in `vocab.ts` — learners hit the
 * basics first, then the IELTS-specific blocks.
 *
 * Idempotency: the seed adds these by title, skipping any already in DB
 * (see prisma/seed.ts → IELTS additive block). Re-deploy never duplicates.
 */
import { CEFRLevel } from "@prisma/client";

type Exercise =
  | { type: "translate"; prompt: string; options: string[]; answer: string }
  | { type: "match"; prompt: string; options: string[]; answer: string }
  | { type: "type"; prompt: string; answer: string };

interface VocabUnitData {
  title: string;
  level: CEFRLevel;
  order: number;
  iconKey?: string;
  lessons: { title: string; order: number; exercises: Exercise[] }[];
}

/** [English, Vietnamese] pair. Compact authoring shape. */
type Word = [en: string, vi: string];

/** Deterministic pseudo-random shuffle so distractor sets stay stable
 *  across seed runs (otherwise the same lesson would have different
 *  options in dev vs prod, breaking tests). */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Pick `n` random items from `pool` excluding `exclude`, using seeded
 *  shuffle. Used to build MCQ distractors. */
function pickDistractors<T>(pool: T[], exclude: T, n: number, seed: number): T[] {
  const available = pool.filter((x) => x !== exclude);
  return seededShuffle(available, seed).slice(0, n);
}

/** Generate a vocab lesson's full exercise set from a word list. Each
 *  word contributes 2 exercises (translate vi→en MCQ + match en→vi MCQ +
 *  occasional type-it), so 5 words → 10 exercises. */
function buildLessonExercises(words: Word[], lessonSeed: number): Exercise[] {
  const exercises: Exercise[] = [];
  const englishPool = words.map(([en]) => en);
  const vietnamesePool = words.map(([, vi]) => vi);

  words.forEach(([en, vi], idx) => {
    const seed = lessonSeed * 1000 + idx;
    // 1) Translate vi → en (MCQ, 4 options)
    const enDistractors = pickDistractors(englishPool, en, 3, seed);
    const enOptions = seededShuffle([en, ...enDistractors], seed + 1);
    exercises.push({
      type: "translate",
      prompt: `Translate: '${vi}'`,
      options: enOptions,
      answer: en,
    });
    // 2) Match en → vi (MCQ, 4 options)
    const viDistractors = pickDistractors(vietnamesePool, vi, 3, seed + 2);
    const viOptions = seededShuffle([vi, ...viDistractors], seed + 3);
    exercises.push({
      type: "match",
      prompt: `Match: '${en}'`,
      options: viOptions,
      answer: vi,
    });
    // 3) Every 3rd word → type-it (typing exercise reinforces spelling)
    if (idx % 3 === 0) {
      exercises.push({
        type: "type",
        prompt: `Type the English for: '${vi}'`,
        answer: en.toLowerCase(),
      });
    }
  });

  return exercises;
}

/** Helper to build a unit from a topic name + word lists per lesson. */
function unit(
  title: string,
  level: CEFRLevel,
  order: number,
  iconKey: string,
  lessons: Array<{ title: string; words: Word[] }>,
): VocabUnitData {
  return {
    title,
    level,
    order,
    iconKey,
    lessons: lessons.map((l, i) => ({
      title: l.title,
      order: i + 1,
      exercises: buildLessonExercises(l.words, order * 100 + i),
    })),
  };
}

// ============================================================================
// B1 — IELTS 5.0-6.0 candidate vocabulary
// ============================================================================
const B1_EDUCATION = unit(
  "IELTS B1 · Education & School Life",
  CEFRLevel.B1,
  11,
  "graduation",
  [
    {
      title: "Classroom essentials",
      words: [
        ["classroom", "lớp học"],
        ["lecture", "bài giảng"],
        ["homework", "bài tập về nhà"],
        ["semester", "học kỳ"],
        ["subject", "môn học"],
        ["textbook", "sách giáo khoa"],
        ["assignment", "bài tập lớn"],
        ["deadline", "hạn chót"],
      ],
    },
    {
      title: "People at school",
      words: [
        ["classmate", "bạn cùng lớp"],
        ["tutor", "gia sư"],
        ["principal", "hiệu trưởng"],
        ["graduate", "tốt nghiệp"],
        ["scholarship", "học bổng"],
        ["enrol", "ghi danh"],
        ["mentor", "người hướng dẫn"],
        ["alumni", "cựu sinh viên"],
      ],
    },
    {
      title: "Studying & exams",
      words: [
        ["revise", "ôn tập"],
        ["exam", "kỳ thi"],
        ["pass", "đỗ"],
        ["fail", "trượt"],
        ["grade", "điểm số"],
        ["certificate", "chứng chỉ"],
        ["curriculum", "chương trình học"],
        ["motivation", "động lực"],
      ],
    },
  ],
);

const B1_HEALTH = unit(
  "IELTS B1 · Health & Lifestyle",
  CEFRLevel.B1,
  12,
  "heart",
  [
    {
      title: "Body & symptoms",
      words: [
        ["headache", "đau đầu"],
        ["fever", "sốt"],
        ["cough", "ho"],
        ["dizzy", "chóng mặt"],
        ["allergy", "dị ứng"],
        ["injury", "chấn thương"],
        ["recover", "hồi phục"],
        ["symptom", "triệu chứng"],
      ],
    },
    {
      title: "Doctor & treatment",
      words: [
        ["prescription", "đơn thuốc"],
        ["pharmacy", "hiệu thuốc"],
        ["clinic", "phòng khám"],
        ["surgery", "phẫu thuật"],
        ["vaccine", "vắc-xin"],
        ["diagnosis", "chẩn đoán"],
        ["medication", "thuốc"],
        ["dose", "liều"],
      ],
    },
    {
      title: "Healthy lifestyle",
      words: [
        ["diet", "chế độ ăn"],
        ["nutrition", "dinh dưỡng"],
        ["exercise", "tập thể dục"],
        ["fitness", "thể lực"],
        ["wellness", "sức khỏe toàn diện"],
        ["balanced", "cân bằng"],
        ["hygiene", "vệ sinh"],
        ["sleep", "giấc ngủ"],
      ],
    },
  ],
);

const B1_TRAVEL = unit(
  "IELTS B1 · Travel & Tourism",
  CEFRLevel.B1,
  13,
  "globe",
  [
    {
      title: "Planning a trip",
      words: [
        ["destination", "điểm đến"],
        ["itinerary", "lịch trình"],
        ["reservation", "đặt chỗ"],
        ["accommodation", "chỗ ở"],
        ["passport", "hộ chiếu"],
        ["visa", "thị thực"],
        ["currency", "tiền tệ"],
        ["package", "gói du lịch"],
      ],
    },
    {
      title: "At the airport",
      words: [
        ["departure", "khởi hành"],
        ["arrival", "đến nơi"],
        ["baggage", "hành lý"],
        ["boarding", "lên máy bay"],
        ["delay", "trễ giờ"],
        ["customs", "hải quan"],
        ["terminal", "nhà ga"],
        ["transit", "quá cảnh"],
      ],
    },
    {
      title: "Sightseeing",
      words: [
        ["landmark", "địa danh nổi tiếng"],
        ["souvenir", "đồ lưu niệm"],
        ["tourist", "khách du lịch"],
        ["sightseeing", "tham quan"],
        ["guide", "hướng dẫn viên"],
        ["museum", "viện bảo tàng"],
        ["heritage", "di sản"],
        ["scenic", "phong cảnh đẹp"],
      ],
    },
  ],
);

const B1_WORK = unit(
  "IELTS B1 · Work & Career",
  CEFRLevel.B1,
  14,
  "briefcase",
  [
    {
      title: "Job hunting",
      words: [
        ["resume", "lý lịch"],
        ["interview", "phỏng vấn"],
        ["vacancy", "vị trí trống"],
        ["candidate", "ứng viên"],
        ["recruit", "tuyển dụng"],
        ["qualification", "trình độ"],
        ["apply", "ứng tuyển"],
        ["application", "đơn ứng tuyển"],
      ],
    },
    {
      title: "At the workplace",
      words: [
        ["colleague", "đồng nghiệp"],
        ["supervisor", "cấp trên"],
        ["department", "phòng ban"],
        ["overtime", "tăng ca"],
        ["deadline", "hạn chót"],
        ["meeting", "cuộc họp"],
        ["schedule", "lịch làm việc"],
        ["task", "nhiệm vụ"],
      ],
    },
    {
      title: "Career growth",
      words: [
        ["promotion", "thăng chức"],
        ["salary", "lương"],
        ["bonus", "tiền thưởng"],
        ["benefit", "phúc lợi"],
        ["skill", "kỹ năng"],
        ["experience", "kinh nghiệm"],
        ["network", "mạng lưới quan hệ"],
        ["resign", "từ chức"],
      ],
    },
  ],
);

// ============================================================================
// B2 — IELTS 6.0-7.0 candidate vocabulary
// ============================================================================
const B2_ENVIRONMENT = unit(
  "IELTS B2 · Environment & Climate",
  CEFRLevel.B2,
  11,
  "leaf",
  [
    {
      title: "Pollution & impact",
      words: [
        ["pollution", "ô nhiễm"],
        ["emission", "khí thải"],
        ["deforestation", "phá rừng"],
        ["contamination", "nhiễm bẩn"],
        ["toxic", "độc hại"],
        ["greenhouse", "nhà kính"],
        ["acid rain", "mưa axit"],
        ["smog", "khói bụi"],
      ],
    },
    {
      title: "Sustainability",
      words: [
        ["sustainable", "bền vững"],
        ["renewable", "tái tạo"],
        ["recycle", "tái chế"],
        ["conservation", "bảo tồn"],
        ["biodiversity", "đa dạng sinh học"],
        ["ecosystem", "hệ sinh thái"],
        ["preserve", "gìn giữ"],
        ["organic", "hữu cơ"],
      ],
    },
    {
      title: "Climate change",
      words: [
        ["drought", "hạn hán"],
        ["flood", "lũ lụt"],
        ["extinct", "tuyệt chủng"],
        ["endangered", "nguy cấp"],
        ["fossil fuel", "nhiên liệu hóa thạch"],
        ["solar", "năng lượng mặt trời"],
        ["wildlife", "động vật hoang dã"],
        ["habitat", "môi trường sống"],
      ],
    },
  ],
);

const B2_TECHNOLOGY = unit(
  "IELTS B2 · Technology & Digital Life",
  CEFRLevel.B2,
  12,
  "cpu",
  [
    {
      title: "Devices & tools",
      words: [
        ["device", "thiết bị"],
        ["gadget", "đồ công nghệ nhỏ"],
        ["wireless", "không dây"],
        ["upgrade", "nâng cấp"],
        ["software", "phần mềm"],
        ["hardware", "phần cứng"],
        ["database", "cơ sở dữ liệu"],
        ["network", "mạng lưới"],
      ],
    },
    {
      title: "Digital concepts",
      words: [
        ["algorithm", "thuật toán"],
        ["automation", "tự động hóa"],
        ["virtual", "ảo"],
        ["cybersecurity", "an ninh mạng"],
        ["encryption", "mã hóa"],
        ["cloud", "đám mây"],
        ["interface", "giao diện"],
        ["bandwidth", "băng thông"],
      ],
    },
    {
      title: "Innovation & impact",
      words: [
        ["innovation", "đổi mới sáng tạo"],
        ["breakthrough", "đột phá"],
        ["disrupt", "phá vỡ truyền thống"],
        ["infrastructure", "cơ sở hạ tầng"],
        ["accessibility", "khả năng tiếp cận"],
        ["addiction", "nghiện"],
        ["dependency", "sự phụ thuộc"],
        ["productivity", "năng suất"],
      ],
    },
  ],
);

const B2_SOCIETY = unit(
  "IELTS B2 · Society & Culture",
  CEFRLevel.B2,
  13,
  "users",
  [
    {
      title: "Community & identity",
      words: [
        ["community", "cộng đồng"],
        ["identity", "bản sắc"],
        ["diverse", "đa dạng"],
        ["multicultural", "đa văn hóa"],
        ["minority", "thiểu số"],
        ["majority", "đa số"],
        ["generation", "thế hệ"],
        ["heritage", "di sản"],
      ],
    },
    {
      title: "Inequality & change",
      words: [
        ["equality", "bình đẳng"],
        ["inequality", "bất bình đẳng"],
        ["prejudice", "định kiến"],
        ["discriminate", "phân biệt"],
        ["integrate", "hòa nhập"],
        ["urbanization", "đô thị hóa"],
        ["migration", "di cư"],
        ["poverty", "nghèo đói"],
      ],
    },
    {
      title: "Tradition & lifestyle",
      words: [
        ["tradition", "truyền thống"],
        ["custom", "phong tục"],
        ["ritual", "nghi lễ"],
        ["lifestyle", "lối sống"],
        ["modern", "hiện đại"],
        ["conservative", "bảo thủ"],
        ["progressive", "tiến bộ"],
        ["norm", "chuẩn mực"],
      ],
    },
  ],
);

const B2_MEDIA = unit(
  "IELTS B2 · Media & Communication",
  CEFRLevel.B2,
  14,
  "megaphone",
  [
    {
      title: "News & journalism",
      words: [
        ["broadcast", "phát sóng"],
        ["headline", "tiêu đề"],
        ["journalism", "báo chí"],
        ["anchor", "người dẫn chương trình"],
        ["coverage", "đưa tin"],
        ["source", "nguồn tin"],
        ["bias", "thiên vị"],
        ["credibility", "độ tin cậy"],
      ],
    },
    {
      title: "Advertising & influence",
      words: [
        ["advertise", "quảng cáo"],
        ["audience", "khán giả"],
        ["influence", "tầm ảnh hưởng"],
        ["endorse", "quảng bá"],
        ["target", "đối tượng mục tiêu"],
        ["consumer", "người tiêu dùng"],
        ["campaign", "chiến dịch"],
        ["brand", "thương hiệu"],
      ],
    },
    {
      title: "Social media & ethics",
      words: [
        ["censorship", "kiểm duyệt"],
        ["propaganda", "tuyên truyền"],
        ["manipulate", "thao túng"],
        ["misinformation", "thông tin sai lệch"],
        ["viral", "lan truyền"],
        ["trending", "xu hướng"],
        ["privacy", "quyền riêng tư"],
        ["transparency", "tính minh bạch"],
      ],
    },
  ],
);

// ============================================================================
// C1 — IELTS 7.0-8.0+ candidate vocabulary
// ============================================================================
const C1_ACADEMIC_I = unit(
  "IELTS C1 · Academic Vocabulary I",
  CEFRLevel.C1,
  11,
  "scroll-text",
  [
    {
      title: "Analysis & method",
      words: [
        ["analyse", "phân tích"],
        ["approach", "phương pháp tiếp cận"],
        ["assess", "đánh giá"],
        ["conclude", "kết luận"],
        ["conduct", "tiến hành"],
        ["consist", "bao gồm"],
        ["derive", "bắt nguồn"],
        ["evident", "rõ ràng"],
      ],
    },
    {
      title: "Concepts & data",
      words: [
        ["framework", "khuôn khổ"],
        ["hypothesis", "giả thuyết"],
        ["identify", "xác định"],
        ["indicate", "chỉ ra"],
        ["interpret", "diễn giải"],
        ["methodology", "phương pháp luận"],
        ["data", "dữ liệu"],
        ["variable", "biến số"],
      ],
    },
    {
      title: "Inference & evidence",
      words: [
        ["infer", "suy luận"],
        ["assume", "giả định"],
        ["evidence", "bằng chứng"],
        ["correlation", "mối tương quan"],
        ["causation", "quan hệ nhân quả"],
        ["validate", "xác thực"],
        ["disprove", "bác bỏ"],
        ["ambiguous", "mơ hồ"],
      ],
    },
  ],
);

const C1_ACADEMIC_II = unit(
  "IELTS C1 · Academic Vocabulary II",
  CEFRLevel.C1,
  12,
  "library",
  [
    {
      title: "Theoretical thinking",
      words: [
        ["paradigm", "khuôn mẫu tư duy"],
        ["perceive", "nhận thức"],
        ["perspective", "góc nhìn"],
        ["postulate", "định đề"],
        ["theoretical", "lý thuyết"],
        ["abstract", "trừu tượng"],
        ["concept", "khái niệm"],
        ["principle", "nguyên tắc"],
      ],
    },
    {
      title: "Conditions & limits",
      words: [
        ["sufficient", "đủ"],
        ["adequate", "thỏa đáng"],
        ["redundant", "thừa"],
        ["pertinent", "thích đáng"],
        ["constraint", "ràng buộc"],
        ["variable", "thay đổi"],
        ["constant", "không đổi"],
        ["finite", "hữu hạn"],
      ],
    },
    {
      title: "Significance & impact",
      words: [
        ["significance", "tầm quan trọng"],
        ["implication", "hệ quả"],
        ["subsequent", "tiếp theo"],
        ["ultimately", "cuối cùng"],
        ["inherent", "vốn có"],
        ["predominant", "chiếm ưu thế"],
        ["scrutinize", "xem xét kỹ"],
        ["substantial", "đáng kể"],
      ],
    },
  ],
);

const C1_ARGUMENT = unit(
  "IELTS C1 · Argumentation & Discussion",
  CEFRLevel.C1,
  13,
  "scale",
  [
    {
      title: "Stating a position",
      words: [
        ["advocate", "ủng hộ"],
        ["contend", "khẳng định"],
        ["articulate", "diễn đạt rõ ràng"],
        ["assert", "tuyên bố"],
        ["maintain", "khẳng định"],
        ["acknowledge", "thừa nhận"],
        ["concede", "nhượng bộ"],
        ["claim", "tuyên bố"],
      ],
    },
    {
      title: "Challenging & refuting",
      words: [
        ["refute", "bác bỏ"],
        ["contradict", "phản bác"],
        ["dispute", "tranh cãi"],
        ["undermine", "làm suy yếu"],
        ["challenge", "thách thức"],
        ["question", "đặt nghi vấn"],
        ["allege", "cáo buộc"],
        ["denounce", "lên án"],
      ],
    },
    {
      title: "Strength of evidence",
      words: [
        ["compelling", "thuyết phục"],
        ["plausible", "hợp lý"],
        ["substantiate", "chứng minh"],
        ["justify", "biện minh"],
        ["rationale", "lý do"],
        ["viable", "khả thi"],
        ["dubious", "đáng ngờ"],
        ["unfounded", "vô căn cứ"],
      ],
    },
  ],
);

const C1_ECONOMY = unit(
  "IELTS C1 · Economy & Business",
  CEFRLevel.C1,
  14,
  "trending-up",
  [
    {
      title: "Money & markets",
      words: [
        ["asset", "tài sản"],
        ["capital", "vốn"],
        ["revenue", "doanh thu"],
        ["profit", "lợi nhuận"],
        ["debt", "nợ"],
        ["deficit", "thâm hụt"],
        ["surplus", "thặng dư"],
        ["liquidity", "tính thanh khoản"],
      ],
    },
    {
      title: "Economic cycles",
      words: [
        ["inflation", "lạm phát"],
        ["deflation", "giảm phát"],
        ["recession", "suy thoái"],
        ["recovery", "phục hồi"],
        ["boom", "bùng nổ"],
        ["bubble", "bong bóng"],
        ["fiscal", "ngân sách"],
        ["monetary", "tiền tệ"],
      ],
    },
    {
      title: "Trade & business",
      words: [
        ["stakeholder", "bên liên quan"],
        ["subsidy", "trợ cấp"],
        ["tariff", "thuế quan"],
        ["import", "nhập khẩu"],
        ["export", "xuất khẩu"],
        ["merger", "sáp nhập"],
        ["investment", "đầu tư"],
        ["turnover", "doanh số"],
      ],
    },
  ],
);

export const IELTS_VOCAB_UNITS: VocabUnitData[] = [
  B1_EDUCATION, B1_HEALTH, B1_TRAVEL, B1_WORK,
  B2_ENVIRONMENT, B2_TECHNOLOGY, B2_SOCIETY, B2_MEDIA,
  C1_ACADEMIC_I, C1_ACADEMIC_II, C1_ARGUMENT, C1_ECONOMY,
];
