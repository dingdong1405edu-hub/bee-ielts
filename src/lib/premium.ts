/**
 * Premium tier helpers. The app has three roles:
 *
 *   OWNER    — single account (nguyenminhsantafe@gmail.com). Implicitly
 *              premium. Only one who can grant/revoke premium on others.
 *   ADMIN    — content team. Implicitly premium. Cannot grant premium.
 *   LEARNER  — default. Premium iff User.isPremium = true.
 *
 * Use `effectivePremium(user)` everywhere — never check role + isPremium
 * inline. Centralises the rule so a single edit covers every gate.
 */

import { prisma } from "@/lib/db";
// Re-export the canonical owner-email constant from admin.ts so callers can
// import everything premium-related from one module.
import { OWNER_EMAIL } from "@/lib/admin";
export { OWNER_EMAIL };

/** Minimal shape: anything with role + isPremium qualifies. */
export interface PremiumCheckUser {
  role: "LEARNER" | "ADMIN" | "OWNER";
  isPremium: boolean;
}

/** True when this user's role is OWNER (DB role check, distinct from email check). */
export function userIsOwner(user: { role: string } | null | undefined): boolean {
  return user?.role === "OWNER";
}

export function isAdminOrOwner(user: { role: string } | null | undefined): boolean {
  return user?.role === "ADMIN" || user?.role === "OWNER";
}

/**
 * Does this user have premium access? OWNER + ADMIN are implicitly premium;
 * LEARNER only counts when isPremium has been explicitly granted.
 */
export function effectivePremium(user: PremiumCheckUser | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "OWNER" || user.role === "ADMIN") return true;
  return user.isPremium === true;
}

/**
 * Can this user grant premium to others? Only OWNER. Admins receive
 * premium themselves but cannot upgrade other accounts — the policy is
 * "owner decides, admin operates".
 */
export function canGrantPremium(user: { role: string } | null | undefined): boolean {
  return user?.role === "OWNER";
}

/**
 * Bootstrap the OWNER account. If the configured OWNER_EMAIL exists in
 * the users table and is NOT already OWNER, promote it. Safe to call on
 * every signin — idempotent + cheap (one indexed lookup, one update at
 * most). Catches errors so a failed bootstrap never blocks login.
 */
export async function ensureOwner(userIdOrEmail?: string | null): Promise<void> {
  if (!userIdOrEmail) return;
  try {
    const where = userIdOrEmail.includes("@")
      ? { email: userIdOrEmail.toLowerCase() }
      : { id: userIdOrEmail };
    const user = await prisma.user.findUnique({
      where,
      select: { id: true, email: true, role: true },
    });
    if (!user) return;
    if (user.email.toLowerCase() !== OWNER_EMAIL) return;
    if (user.role === "OWNER") return;
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "OWNER", isPremium: true },
    });
  } catch (e) {
    // Owner bootstrap must NEVER block signin — log + swallow.
    console.error("[ensureOwner]", e);
  }
}

/**
 * Mock-test weekly quota for free users. Returns whether the user is
 * allowed to start a new mock right now, plus the timestamp of the
 * next allowed attempt (so the UI can render a countdown).
 *
 * Rule: LEARNER without premium → max 1 completed MockAttempt in the
 * last 7 rolling days. Premium (OWNER/ADMIN/isPremium=true) → unlimited.
 */
export async function checkMockQuota(userId: string): Promise<{
  allowed: boolean;
  isPremium: boolean;
  /** ISO timestamp when the next attempt will be allowed (null = now). */
  nextAllowedAt: string | null;
  /** Last attempt timestamp inside the 7-day window, for UI hints. */
  lastAttemptAt: string | null;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isPremium: true },
  });
  if (!user) {
    // Defensive: missing user should still fail closed.
    return { allowed: false, isPremium: false, nextAllowedAt: null, lastAttemptAt: null };
  }
  const premium = effectivePremium(user as PremiumCheckUser);
  if (premium) {
    return { allowed: true, isPremium: true, nextAllowedAt: null, lastAttemptAt: null };
  }
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const last = await prisma.mockAttempt.findFirst({
    where: { userId, completedAt: { gte: sevenDaysAgo } },
    orderBy: { completedAt: "desc" },
    select: { completedAt: true },
  });
  if (!last) {
    return { allowed: true, isPremium: false, nextAllowedAt: null, lastAttemptAt: null };
  }
  // The window slides — 1 attempt allowed every 7 days from the last one.
  const nextAllowed = new Date(last.completedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    allowed: false,
    isPremium: false,
    nextAllowedAt: nextAllowed.toISOString(),
    lastAttemptAt: last.completedAt.toISOString(),
  };
}
