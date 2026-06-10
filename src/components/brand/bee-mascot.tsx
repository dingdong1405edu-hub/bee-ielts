"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Bee IELTS mascot. Renders the transparent bee cutout at `/textures/bee.png`
 * (the BeeEnglish mascot), falling back to an inline SVG bee if that file is
 * missing. Because the PNG is a transparent cutout it looks best raw —
 * `frame="none"` (the default) shows it with a soft drop-shadow; set
 * `frame="rounded"` for a card or `frame="circle"` for an avatar badge.
 */
export function BeeMascot({
  className,
  frame = "rounded",
  pose,
  alt = "Bee — linh vật Bee IELTS",
  priority,
}: {
  className?: string;
  frame?: "rounded" | "circle" | "none";
  pose?: string;
  alt?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const src = pose ? `/textures/bee-${pose}.png` : "/textures/bee.png";

  if (failed) return <BeeMascotFallback className={className} title={alt} />;

  const imgProps = {
    src,
    alt,
    loading: priority ? ("eager" as const) : ("lazy" as const),
    onError: () => setFailed(true),
    draggable: false,
  };

  if (frame === "none") {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        {...imgProps}
        className={cn("block select-none object-contain drop-shadow-[0_18px_30px_rgba(43,36,23,0.28)]", className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "relative inline-block select-none overflow-hidden bg-cream align-middle ring-1 ring-ink/10 shadow-sm",
        frame === "circle" ? "aspect-square rounded-full" : "rounded-2xl",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        {...imgProps}
        className={cn(
          frame === "circle" ? "absolute inset-0 h-full w-full object-cover object-[50%_38%]" : "block h-auto w-full",
        )}
      />
    </span>
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
