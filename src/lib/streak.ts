const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(a: Date, b: Date) {
  return Math.floor((startOfDay(a).getTime() - startOfDay(b).getTime()) / DAY_MS);
}

export function currentMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function computeDisplayStreak(streakDays: number, lastActiveAt: Date | null | undefined): number {
  if (!lastActiveAt) return 0;
  const days = daysBetween(new Date(), lastActiveAt);
  if (days <= 1) return streakDays;
  return 0;
}

export function nextStreakOnActivity(streakDays: number, lastActiveAt: Date | null | undefined): { newStreak: number; isNewDay: boolean } {
  const now = new Date();
  if (!lastActiveAt) return { newStreak: 1, isNewDay: true };
  const days = daysBetween(now, lastActiveAt);
  if (days === 0) return { newStreak: streakDays || 1, isNewDay: false };
  if (days === 1) return { newStreak: streakDays + 1, isNewDay: true };
  return { newStreak: 1, isNewDay: true };
}

export const STREAK_RESTORE_MAX_PER_MONTH = 5;

export function getStreakRestoreState(user: { streakRestoresUsed: number; streakRestoreMonth: string | null }) {
  const current = currentMonthKey();
  const usedThisMonth = user.streakRestoreMonth === current ? user.streakRestoresUsed : 0;
  return {
    used: usedThisMonth,
    remaining: STREAK_RESTORE_MAX_PER_MONTH - usedThisMonth,
    month: current,
  };
}
