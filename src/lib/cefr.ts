/**
 * CEFR difficulty helpers shared by the Shadowing + Podcasts modules.
 *
 * We only expose B1–C2 in the pickers (the levels learners practising for
 * IELTS care about) but the underlying enum keeps A1/A2 so older content and
 * the reading/listening modules stay compatible.
 */
import type { CEFRLevel } from "@prisma/client";

/** Levels offered in the Shadowing/Podcast difficulty pickers + filters. */
export const PRACTICE_LEVELS = ["B1", "B2", "C1", "C2"] as const;
export type PracticeLevel = (typeof PRACTICE_LEVELS)[number];

/** All valid CEFR codes — for validating incoming/estimated values. */
export const ALL_CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

/** Short Vietnamese description shown next to the code in pickers. */
export const LEVEL_DESC: Record<string, string> = {
  A1: "Mới bắt đầu",
  A2: "Sơ cấp",
  B1: "Trung cấp",
  B2: "Trên trung cấp",
  C1: "Cao cấp",
  C2: "Thành thạo",
};

/** Solid badge background (white text) per level — mirrors the colour scale
 *  the Reading module already uses (cool → warm = easy → hard). */
export const LEVEL_BADGE_CLASS: Record<string, string> = {
  A1: "bg-emerald-500",
  A2: "bg-teal-500",
  B1: "bg-sky-500",
  B2: "bg-indigo-500",
  C1: "bg-violet-500",
  C2: "bg-rose-500",
};

/** Soft pill (tinted bg + coloured text) for the filter tabs. */
export const LEVEL_PILL_CLASS: Record<string, string> = {
  A1: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  A2: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  B1: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  B2: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
  C1: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  C2: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

/** Narrow an arbitrary string to a CEFRLevel (or null). */
export function toCefrLevel(v: unknown): CEFRLevel | null {
  return typeof v === "string" && (ALL_CEFR_LEVELS as readonly string[]).includes(v)
    ? (v as CEFRLevel)
    : null;
}
