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
