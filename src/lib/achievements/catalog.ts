/**
 * Achievement catalog. Static — lives in code, NOT a DB table. Add a
 * new entry → it appears in the badge wall on next deploy. Award helper
 * looks up by `code` so renames break user unlocks; new codes only.
 *
 * Naming style is intentionally over-the-top game-y per user request
 * ("như trong game có danh hiệu kẻ diệt rồng"). Each badge has BOTH:
 *   - `title`: the danh hiệu (e.g. "Hiền Triết Sách Vở") — short, flashy
 *   - `name`:  the badge name (e.g. "Reading 8.0") — what shows on the
 *              badge artwork itself
 *   - `description`: how to earn it (admin-facing + tooltip)
 *
 * Tier badges share a `family` (e.g. "reading") so the UI can group
 * them. Each family has 3 tiers; unlocking a higher tier doesn't
 * supersede lower ones (collector's mentality).
 */

export type AchievementCategory =
  | "vocab"
  | "shadowing"
  | "dictation"
  | "reading"
  | "listening"
  | "writing"
  | "speaking"
  | "mock";

export type AchievementTier = "bronze" | "silver" | "gold";

export interface Achievement {
  /** Stable identifier — never rename. */
  code: string;
  category: AchievementCategory;
  /** Groups tier badges for UI ordering. */
  family: string;
  tier: AchievementTier;
  /** Big game-style title shown above the badge artwork. */
  title: string;
  /** Short name printed on the badge medal. */
  name: string;
  /** One-line earn condition shown on the badge wall. */
  description: string;
  /** Lucide icon key OR custom svg key for the badge artwork. */
  iconKey: string;
  /** Tailwind color stem for the badge accent (e.g. "amber", "emerald"). */
  color: string;
  /** Sort order within (category, family). */
  order: number;
}

/** Vocab — earn by scoring 90%+ on any single lesson. */
const VOCAB_BADGES: Achievement[] = [
  {
    code: "vocab_master_90",
    category: "vocab",
    family: "vocab",
    tier: "gold",
    title: "Bậc Thầy Từ Vựng",
    name: "Vocab 90%",
    description: "Trả lời đúng 90% trở lên trong một bài vocab.",
    iconKey: "sparkles",
    color: "amber",
    order: 1,
  },
];

/** Shadowing & Dictation — earn by completing 10 lessons. */
const SHADOWING_BADGES: Achievement[] = [
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
    order: 1,
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

/** Helper to spawn a 3-tier band family (Reading/Listening/Writing/Speaking/Mock). */
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

/** Mock — overall band tier. The "game boss" achievement of the platform. */
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
  ...READING_BADGES,
  ...LISTENING_BADGES,
  ...WRITING_BADGES,
  ...SPEAKING_BADGES,
  ...MOCK_BADGES,
];

/** O(1) lookup by code. */
export const ACHIEVEMENT_BY_CODE: Record<string, Achievement> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.code, a]),
);

/** Which band-tier code (if any) a numeric band score unlocks. Used by the
 *  award helper for Reading/Listening/Writing/Speaking/Mock check. Returns
 *  the HIGHEST tier reached — caller still inserts lower tiers separately
 *  via this function called with the same family (idempotent via DB unique). */
export function bandTierCode(family: string, band: number): string | null {
  if (band >= 8.0) return `${family}_band_80`;
  if (band >= 7.0) return `${family}_band_70`;
  if (band >= 6.0) return `${family}_band_60`;
  return null;
}

/** Every tier code at-or-below the user's band — used so we award all
 *  lower medals when someone jumps straight to gold. */
export function allBandTiersBelow(family: string, band: number): string[] {
  const out: string[] = [];
  if (band >= 6.0) out.push(`${family}_band_60`);
  if (band >= 7.0) out.push(`${family}_band_70`);
  if (band >= 8.0) out.push(`${family}_band_80`);
  return out;
}
