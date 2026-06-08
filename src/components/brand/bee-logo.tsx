import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * Bee IELTS brand mark — a line-art bee inside a pentagon, recreated as a
 * crisp, themeable SVG (slate-blue wings, gold body, ink outline). The outline
 * follows `currentColor`, so on a light surface set `text-ink`/`text-foreground`
 * and on a dark/sage hero set `text-cream`. Wings/body use the brand tokens.
 *
 * Variants:
 *  - "full"  → pentagon + bee (default, for nav / footer / hero)
 *  - "bare"  → bee only, no pentagon (for favicons, tight chips)
 */
export function BeeLogo({
  className,
  style,
  variant = "full",
  title = "Bee IELTS",
}: {
  className?: string;
  style?: CSSProperties;
  variant?: "full" | "bare";
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("block", className)}
      style={style}
      role="img"
      aria-label={title}
      fill="none"
    >
      <title>{title}</title>

      {variant === "full" && (
        <path
          d="M50 7 L88 35 L73 86 L27 86 L12 35 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="4.5"
          strokeLinejoin="round"
        />
      )}

      {/* ── Bee ── centred ~ (50, 54) ── */}
      <g strokeLinejoin="round" strokeLinecap="round">
        {/* antennae */}
        <path
          d="M45 31 C41 22 37 19 33 18 M55 31 C59 22 63 19 67 18"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
        />

        {/* wings — slate blue */}
        <g fill="var(--slate, #3F5168)" stroke="currentColor" strokeWidth="3">
          <path d="M44 44 C30 33 18 38 22 50 C25 60 38 58 46 52 Z" />
          <path d="M56 44 C70 33 82 38 78 50 C75 60 62 58 54 52 Z" />
          <path d="M45 54 C33 50 24 56 28 65 C31 72 42 69 47 62 Z" />
          <path d="M55 54 C67 50 76 56 72 65 C69 72 58 69 53 62 Z" />
        </g>

        {/* head */}
        <circle cx="50" cy="36" r="8" fill="var(--gold, #FFC107)" stroke="currentColor" strokeWidth="3" />
        {/* abdomen — gold with ink stripes */}
        <path
          d="M50 44 C58 44 62 50 62 58 C62 70 56 80 50 80 C44 80 38 70 38 58 C38 50 42 44 50 44 Z"
          fill="var(--gold, #FFC107)"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path d="M41 56 H59 M42 64 H58 M44 72 H56" stroke="currentColor" strokeWidth="3" fill="none" />
      </g>
    </svg>
  );
}
