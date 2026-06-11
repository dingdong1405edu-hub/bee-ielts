/**
 * Client-side helper: scan a fetch response body for an `unlocked` array
 * (per the convention that every server route which can award badges
 * returns it) and fire the unlock popup for each entry. Safe to call
 * with any object — does nothing when the field is missing or empty.
 *
 * Usage in API call sites:
 *   const data = await (await fetch(...)).json();
 *   triggerUnlocksFromResponse(data);
 */
import type { Achievement } from "@/lib/achievements/catalog";
import { triggerAchievementUnlock } from "@/components/achievements/achievement-unlock-popup";

export function triggerUnlocksFromResponse(data: unknown): void {
  if (!data || typeof data !== "object") return;
  const unlocked = (data as { unlocked?: unknown }).unlocked;
  if (!Array.isArray(unlocked)) return;
  for (const a of unlocked) {
    if (a && typeof a === "object" && "code" in a && "title" in a) {
      triggerAchievementUnlock(a as Achievement);
    }
  }
}
