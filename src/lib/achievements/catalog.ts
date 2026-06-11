/**
 * Achievement catalog. Static — lives in code, NOT a DB table. Add a
 * new entry → it appears in the badge wall on next deploy. Award helper
 * looks up by `code` so renames break user unlocks; new codes only.
 *
 * Tiering rule: starter badges fire on the VERY first action so users
 * see momentum immediately. Higher tiers reward depth.
 */

export type AchievementCategory =
  | "vocab"
  | "shadowing"
  | "dictation"
  | "reading"
  | "listening"
  | "writing"
  | "speaking"
  | "mock"
  | "streak"
  | "xp";

export type AchievementTier = "bronze" | "silver" | "gold";

export interface Achievement {
  code: string;
  category: AchievementCategory;
  family: string;
  tier: AchievementTier;
  title: string;
  name: string;
  description: string;
  iconKey: string;
  color: string;
  order: number;
}

/** Vocab — starter → perfect tiers. Starter fires on the very first
 *  lesson regardless of score so users see something immediately. */
const VOCAB_BADGES: Achievement[] = [
  {
    code: "vocab_first_lesson",
    category: "vocab",
    family: "vocab",
    tier: "bronze",
    title: "Mầm Tri Thức",
    name: "Bài vocab đầu tiên",
    description: "Hoàn thành bài học từ vựng đầu tiên.",
    iconKey: "sprout",
    color: "emerald",
    order: 1,
  },
  {
    code: "vocab_perfect_70",
    category: "vocab",
    family: "vocab",
    tier: "bronze",
    title: "Học Trò Cần Cù",
    name: "Vocab 70%+",
    description: "Trả lời đúng từ 70% trở lên trong một bài vocab.",
    iconKey: "book-marked",
    color: "amber",
    order: 2,
  },
  {
    code: "vocab_perfect_80",
    category: "vocab",
    family: "vocab",
    tier: "silver",
    title: "Cao Thủ Từ Vựng",
    name: "Vocab 80%+",
    description: "Trả lời đúng từ 80% trở lên trong một bài vocab.",
    iconKey: "graduation-cap",
    color: "violet",
    order: 3,
  },
  {
    code: "vocab_master_90",
    category: "vocab",
    family: "vocab",
    tier: "gold",
    title: "Bậc Thầy Từ Vựng",
    name: "Vocab 90%+",
    description: "Trả lời đúng từ 90% trở lên trong một bài vocab.",
    iconKey: "sparkles",
    color: "amber",
    order: 4,
  },
];

/** Shadowing — first lesson → marathon. */
const SHADOWING_BADGES: Achievement[] = [
  {
    code: "shadowing_first",
    category: "shadowing",
    family: "shadowing",
    tier: "bronze",
    title: "Tiếng Vọng Đầu Tiên",
    name: "Shadowing #1",
    description: "Hoàn thành bài shadowing đầu tiên.",
    iconKey: "mic",
    color: "rose",
    order: 1,
  },
  {
    code: "shadowing_x3",
    category: "shadowing",
    family: "shadowing",
    tier: "bronze",
    title: "Người Hát Theo",
    name: "Shadowing ×3",
    description: "Hoàn thành 3 bài shadowing khác nhau.",
    iconKey: "music",
    color: "rose",
    order: 2,
  },
  {
    code: "shadowing_x5",
    category: "shadowing",
    family: "shadowing",
    tier: "silver",
    title: "Cánh Én Vang Vọng",
    name: "Shadowing ×5",
    description: "Hoàn thành 5 bài shadowing khác nhau.",
    iconKey: "radio",
    color: "rose",
    order: 3,
  },
  {
    code: "shadowing_marathon_10",
    category: "shadowing",
    family: "shadowing",
    tier: "gold",
    title: "Người Ngân Vọng",
    name: "Shadowing ×10",
    description: "Hoàn thành 10 bài shadowing.",
    iconKey: "mic",
    color: "rose",
    order: 4,
  },
];

const DICTATION_BADGES: Achievement[] = [
  {
    code: "dictation_master_10",
    category: "dictation",
    family: "dictation",
    tier: "gold",
    title: "Cây Bút Vô Hình",
    name: "Dictation ×10",
    description: "Hoàn thành 10 bài dictation.",
    iconKey: "pencil",
    color: "violet",
    order: 1,
  },
];

/** Daily streak — fires from any activity (vocab/shadowing/mock) the day
 *  the user's streakDays counter crosses the threshold. */
const STREAK_BADGES: Achievement[] = [
  {
    code: "streak_3",
    category: "streak",
    family: "streak",
    tier: "bronze",
    title: "Lửa Mới Nhen",
    name: "Streak 3 ngày",
    description: "Giữ chuỗi học 3 ngày liên tục.",
    iconKey: "flame",
    color: "amber",
    order: 1,
  },
  {
    code: "streak_7",
    category: "streak",
    family: "streak",
    tier: "silver",
    title: "Tuần Lễ Bùng Cháy",
    name: "Streak 7 ngày",
    description: "Giữ chuỗi học 7 ngày liên tục.",
    iconKey: "flame",
    color: "rose",
    order: 2,
  },
  {
    code: "streak_30",
    category: "streak",
    family: "streak",
    tier: "gold",
    title: "Ngọn Lửa Bất Diệt",
    name: "Streak 30 ngày",
    description: "Giữ chuỗi học 30 ngày liên tục.",
    iconKey: "flame",
    color: "rose",
    order: 3,
  },
];

/** XP milestones — fires when cumulative XP crosses thresholds. */
const XP_BADGES: Achievement[] = [
  {
    code: "xp_100",
    category: "xp",
    family: "xp",
    tier: "bronze",
    title: "Tân Binh",
    name: "100 XP",
    description: "Tích lũy được 100 XP.",
    iconKey: "zap",
    color: "amber",
    order: 1,
  },
  {
    code: "xp_500",
    category: "xp",
    family: "xp",
    tier: "silver",
    title: "Lão Luyện",
    name: "500 XP",
    description: "Tích lũy được 500 XP.",
    iconKey: "zap",
    color: "violet",
    order: 2,
  },
  {
    code: "xp_1000",
    category: "xp",
    family: "xp",
    tier: "gold",
    title: "Tinh Anh Cự Phách",
    name: "1000 XP",
    description: "Tích lũy được 1000 XP.",
    iconKey: "trophy",
    color: "amber",
    order: 3,
  },
];

function makeBandTier(
  category: AchievementCategory,
  family: string,
  baseColor: string,
  titles: { bronze: string; silver: string; gold: string },
  iconKey: string,
  bandPrefix: string,
): Achievement[] {
  return [
    {
      code: `${family}_band_60`,
      category,
      family,
      tier: "bronze",
      title: titles.bronze,
      name: `${bandPrefix} 6.0+`,
      description: `Đạt band ${bandPrefix.toLowerCase()} 6.0-6.5.`,
      iconKey,
      color: baseColor,
      order: 1,
    },
    {
      code: `${family}_band_70`,
      category,
      family,
      tier: "silver",
      title: titles.silver,
      name: `${bandPrefix} 7.0+`,
      description: `Đạt band ${bandPrefix.toLowerCase()} 7.0-7.5.`,
      iconKey,
      color: baseColor,
      order: 2,
    },
    {
      code: `${family}_band_80`,
      category,
      family,
      tier: "gold",
      title: titles.gold,
      name: `${bandPrefix} 8.0+`,
      description: `Đạt band ${bandPrefix.toLowerCase()} 8.0-8.5+.`,
      iconKey,
      color: baseColor,
      order: 3,
    },
  ];
}

const READING_BADGES = makeBandTier(
  "reading",
  "reading",
  "sky",
  { bronze: "Tân Học Giả", silver: "Trí Giả", gold: "Hiền Triết Sách Vở" },
  "book-open",
  "Reading",
);

const LISTENING_BADGES = makeBandTier(
  "listening",
  "listening",
  "emerald",
  { bronze: "Tai Tinh", silver: "Vọng Âm Tướng Quân", gold: "Nhị Nhĩ Thông Thiên" },
  "headphones",
  "Listening",
);

const WRITING_BADGES = makeBandTier(
  "writing",
  "writing",
  "violet",
  { bronze: "Bút Sinh", silver: "Văn Khách Lưu Danh", gold: "Văn Hào Tinh Hoa" },
  "pen-line",
  "Writing",
);

const SPEAKING_BADGES = makeBandTier(
  "speaking",
  "speaking",
  "rose",
  { bronze: "Khẩu Khí", silver: "Hùng Biện Gia", gold: "Diễn Giả Bậc Thầy" },
  "mic",
  "Speaking",
);

const MOCK_BADGES: Achievement[] = [
  {
    code: "mock_overall_60",
    category: "mock",
    family: "mock",
    tier: "bronze",
    title: "Tân Binh Diệt Rồng",
    name: "Mock 6.0+",
    description: "Overall band 6.0-6.5 trong một bài thi thử.",
    iconKey: "shield",
    color: "amber",
    order: 1,
  },
  {
    code: "mock_overall_70",
    category: "mock",
    family: "mock",
    tier: "silver",
    title: "Lão Tướng Phá Trận",
    name: "Mock 7.0+",
    description: "Overall band 7.0-7.5 trong một bài thi thử.",
    iconKey: "shield",
    color: "amber",
    order: 2,
  },
  {
    code: "mock_overall_80",
    category: "mock",
    family: "mock",
    tier: "gold",
    title: "Vạn Tướng Quân",
    name: "Mock 8.0+",
    description: "Overall band 8.0-8.5+ trong một bài thi thử.",
    iconKey: "crown",
    color: "amber",
    order: 3,
  },
];

export const ACHIEVEMENTS: Achievement[] = [
  ...VOCAB_BADGES,
  ...SHADOWING_BADGES,
  ...DICTATION_BADGES,
  ...STREAK_BADGES,
  ...XP_BADGES,
  ...READING_BADGES,
  ...LISTENING_BADGES,
  ...WRITING_BADGES,
  ...SPEAKING_BADGES,
  ...MOCK_BADGES,
];

export const ACHIEVEMENT_BY_CODE: Record<string, Achievement> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.code, a]),
);

export function bandTierCode(family: string, band: number): string | null {
  if (band >= 8.0) return `${family}_band_80`;
  if (band >= 7.0) return `${family}_band_70`;
  if (band >= 6.0) return `${family}_band_60`;
  return null;
}

export function allBandTiersBelow(family: string, band: number): string[] {
  const out: string[] = [];
  if (band >= 6.0) out.push(`${family}_band_60`);
  if (band >= 7.0) out.push(`${family}_band_70`);
  if (band >= 8.0) out.push(`${family}_band_80`);
  return out;
}

/** Vocab perfection tiers — call with the lesson score to get every
 *  perfection medal at-or-below it (collector's mentality, like band). */
export function allVocabPerfectionCodes(score: number): string[] {
  const out: string[] = [];
  if (score >= 70) out.push("vocab_perfect_70");
  if (score >= 80) out.push("vocab_perfect_80");
  if (score >= 90) out.push("vocab_master_90");
  return out;
}

/** Streak/XP threshold checks — pure functions on the new numeric value. */
export function streakTierCodes(streakDays: number): string[] {
  const out: string[] = [];
  if (streakDays >= 3) out.push("streak_3");
  if (streakDays >= 7) out.push("streak_7");
  if (streakDays >= 30) out.push("streak_30");
  return out;
}

export function xpTierCodes(totalXp: number): string[] {
  const out: string[] = [];
  if (totalXp >= 100) out.push("xp_100");
  if (totalXp >= 500) out.push("xp_500");
  if (totalXp >= 1000) out.push("xp_1000");
  return out;
}
