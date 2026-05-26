"use client";
import { useState } from "react";
import { BeeGuide, type TourStep } from "./bee-guide";

/**
 * Generic wrapper that mounts the BeeGuide overlay first; once the learner
 * finishes or skips the tour, it unmounts the overlay and the children
 * (the actual skill player) take over the screen.
 */
export function BandClimbIntro({
  steps,
  children,
}: {
  steps: TourStep[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <>
      {open && <BeeGuide steps={steps} onFinish={() => setOpen(false)} />}
      {children}
    </>
  );
}
