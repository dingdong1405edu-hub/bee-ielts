"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Bee IELTS mascot. Renders the uploaded artwork at `/bee-mascot.png` (the
 * friendly bee), falling back to an inline SVG bee if that file is missing so
 * the UI never shows a broken image. Drop the real PNG (square, transparent or
 * cream bg) at `public/bee-mascot.png` and it appears everywhere automatically.
 *
 * `pose` lets you point at alternate art if you add more files later, e.g.
 * `public/mascot/bee-cheer.png` → pose="cheer".
 */
export function BeeMascot({
  className,
  pose,
  alt = "Bee — linh vật Bee IELTS",
  priority,
}: {
  className?: string;
  pose?: string;
  alt?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const src = pose ? `/mascot/bee-${pose}.png` : "/bee-mascot.png";

  if (failed) return <BeeMascotFallback className={className} title={alt} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      onError={() => setFailed(true)}
      className={cn("block select-none", className)}
      draggable={false}
    />
  );
}

/** Inline cartoon-bee fallback — round yellow body, antennae, rosy cheeks. */
export function BeeMascotFallback({ className, title = "Bee" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 200 210" className={cn("block", className)} role="img" aria-label={title} fill="none">
      <title>{title}</title>
      {/* antennae */}
      <path d="M86 44 C74 18 66 12 60 10 M114 44 C126 18 134 12 140 10" stroke="#1F1B14" strokeWidth="7" strokeLinecap="round" />
      {/* wings */}
      <ellipse cx="55" cy="120" rx="30" ry="42" fill="#CFE0EC" stroke="#1F1B14" strokeWidth="6" transform="rotate(-22 55 120)" />
      <ellipse cx="145" cy="120" rx="30" ry="42" fill="#CFE0EC" stroke="#1F1B14" strokeWidth="6" transform="rotate(22 145 120)" />
      {/* body */}
      <ellipse cx="100" cy="120" rx="62" ry="70" fill="#F8C828" stroke="#1F1B14" strokeWidth="7" />
      {/* face */}
      <circle cx="80" cy="112" r="6.5" fill="#1F1B14" />
      <circle cx="120" cy="112" r="6.5" fill="#1F1B14" />
      <circle cx="68" cy="128" r="9" fill="#F2937E" opacity="0.7" />
      <circle cx="132" cy="128" r="9" fill="#F2937E" opacity="0.7" />
      <path d="M92 132 q8 8 16 0" stroke="#1F1B14" strokeWidth="5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
