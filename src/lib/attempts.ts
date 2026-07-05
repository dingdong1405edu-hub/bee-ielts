/**
 * Retake / attempt-limit helpers for homework.
 *
 * A teacher decides how many times a student may do an assignment via
 * `config.attemptsAllowed` on the Assignment:
 *   - 1 (default) → one attempt, no retake
 *   - N > 1       → N attempts total
 *   - 0           → unlimited retakes
 * Submission.attemptCount tracks how many times the student has submitted.
 */
import type { Prisma } from "@prisma/client";

export function attemptsAllowedOf(config: Prisma.JsonValue | null | undefined): number {
  if (config && typeof config === "object" && !Array.isArray(config)) {
    const a = (config as Record<string, unknown>).attemptsAllowed;
    if (typeof a === "number" && Number.isFinite(a) && a >= 0) return Math.floor(a);
  }
  return 1;
}

/** Whether a student may (re)submit given how many they've allowed vs used. */
export function canAttempt(allowed: number, attemptCount: number): boolean {
  return allowed === 0 || attemptCount < allowed;
}

/** Human label for remaining attempts (Vietnamese). */
export function remainingLabel(allowed: number, attemptCount: number): string {
  if (allowed === 0) return "không giới hạn";
  return `còn ${Math.max(0, allowed - attemptCount)} lượt`;
}
