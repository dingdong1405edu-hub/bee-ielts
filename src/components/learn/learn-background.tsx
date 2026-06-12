"use client";
import { usePathname } from "next/navigation";
import { NightAmbience } from "./night-ambience";

/**
 * Ambient background for learner pages. Light mode stays a clean flat surface
 * (NightAmbience renders nothing there — gated to `.dark` in CSS). The Community
 * feed keeps a plain background, so the effect is skipped there entirely.
 */
export function LearnBackground() {
  const pathname = usePathname();
  if (pathname.startsWith("/community")) {
    return null;
  }
  return <NightAmbience />;
}
