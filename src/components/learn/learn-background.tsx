"use client";
import { usePathname } from "next/navigation";
import { AmbientBackground } from "@/components/ambient-background";

/**
 * Ambient background for learner pages. The Community feed keeps a plain white
 * background, so the effect is skipped there; every other learner page shares
 * this backdrop so they stay visually in sync.
 */
export function LearnBackground() {
  const pathname = usePathname();
  if (pathname.startsWith("/community")) {
    return null;
  }
  return <AmbientBackground />;
}
