import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Short human label for an audio source. An uploaded file is stored as a
 * multi-MB `data:` URL — never render that raw in a list, it blows up the
 * layout. A public URL is shown as-is so the admin can recognise it.
 */
export function audioSourceLabel(url: string | null | undefined): string {
  const u = (url ?? "").trim();
  if (!u) return "Chưa có audio";
  if (u.startsWith("data:")) return "🎵 Audio đã tải lên";
  if (u.startsWith("file:")) return "⚠️ Link file nội bộ — người học không nghe được";
  return u;
}

/**
 * Grade a learner's answer (case-insensitive, trimmed).
 *
 * For text answers (fill-in-the-blank / short answer) the answer key may list
 * alternatives separated by "/", e.g. "8 / eight" — the whole key OR any
 * single alternative counts as correct. MCQ / matching / true-false answers
 * are a fixed choice and are always matched exactly.
 */
export function isAnswerCorrect(
  userAnswer: string | null | undefined,
  correctAnswer: string | null | undefined,
  type?: string | null,
): boolean {
  const norm = (s: string) => s.trim().toLowerCase();
  const user = norm(userAnswer ?? "");
  if (!user) return false;
  const key = correctAnswer ?? "";
  const exactOnly =
    type === "MCQ" ||
    type === "TRUE_FALSE" ||
    type === "TRUE_FALSE_NOT_GIVEN" ||
    (type ? type.startsWith("MATCHING") : false);
  if (exactOnly) return user === norm(key);
  // Accept the whole key or any "/"-separated alternative.
  return [norm(key), ...key.split("/").map(norm)].filter(Boolean).includes(user);
}

/**
 * Replace IELTS-examiner pronouns like "Ứng viên" with the learner's actual
 * name (or "Bạn"/"bạn" if no name) so AI feedback feels addressed to them.
 */
export function personalize(text: string | null | undefined, name?: string | null): string {
  if (!text) return "";
  const trimmed = name?.trim();
  if (trimmed) {
    return text.replace(/[Ứứ]ng viên/g, trimmed);
  }
  return text.replace(/Ứng viên/g, "Bạn").replace(/ứng viên/g, "bạn");
}
