"use client";
import { useState } from "react";
import { BeeGuide, type TourStep } from "./bee-guide";

/**
 * Generic wrapper that mounts the BeeGuide overlay first; once the learner
 * finishes or skips the tour, it unmounts the overlay and the children
 * (the actual skill player) take over the screen.
 *
 * When `steps` is null OR empty the bee is COMPLETELY suppressed — no
 * overlay, no default tour. This lets admin opt-in per-exercise: only
 * exercises whose `bandClimbTips` JSON has been authored show a tour.
 */
export function BandClimbIntro({
  steps,
  children,
}: {
  steps: TourStep[] | null;
  children: React.ReactNode;
}) {
  const hasTour = !!steps && steps.length > 0;
  const [open, setOpen] = useState(hasTour);
  return (
    <>
      {open && hasTour && <BeeGuide steps={steps!} onFinish={() => setOpen(false)} />}
      {children}
    </>
  );
}
