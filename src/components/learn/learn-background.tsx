"use client";
import { usePathname } from "next/navigation";
import { AmbientBackground } from "@/components/ambient-background";

/**
 * Ambient background for learner pages. The Community and Profile pages keep
 * a plain background, so the effect is skipped there.
 */
export function LearnBackground() {
  const pathname = usePathname();
  if (pathname.startsWith("/community") || pathname.startsWith("/profile")) {
    return null;
  }
  return <AmbientBackground />;
}
