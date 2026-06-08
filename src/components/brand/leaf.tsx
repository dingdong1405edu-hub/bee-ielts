import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * Maple-leaf accent — echoes the newsprint-collage leaf artwork. Pure SVG so it
 * tints via `currentColor` (set a text-* class). Use as a small decorative mark,
 * a scatter motif, or — at low opacity — a section background flourish.
 */
export function Leaf({
  className,
  style,
  title,
}: {
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 110"
      className={cn("block", className)}
      style={style}
      fill="currentColor"
      aria-hidden={!title}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path d="M50 4 L58 26 L80 18 L70 40 L92 44 L74 58 L88 74 L64 70 L66 92 L50 78 L34 92 L36 70 L12 74 L26 58 L8 44 L30 40 L20 18 L42 26 Z" />
      <path d="M50 78 L50 104" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * A faint scattered-leaf field for section backgrounds. Decorative; absolutely
 * positioned by the caller (give it `absolute inset-0` + low opacity).
 */
export function LeafField({ className }: { className?: string }) {
  const leaves = [
    { x: "8%", y: "14%", s: 38, r: -18, o: 0.07 },
    { x: "74%", y: "8%", s: 30, r: 24, o: 0.06 },
    { x: "86%", y: "60%", s: 46, r: -8, o: 0.06 },
    { x: "20%", y: "70%", s: 28, r: 32, o: 0.07 },
    { x: "50%", y: "40%", s: 22, r: 10, o: 0.05 },
  ];
  return (
    <div className={cn("pointer-events-none overflow-hidden", className)} aria-hidden>
      {leaves.map((l, i) => (
        <Leaf
          key={i}
          className="absolute text-leaf"
          style={{ left: l.x, top: l.y, width: l.s, height: "auto", opacity: l.o, transform: `rotate(${l.r}deg)` }}
        />
      ))}
    </div>
  );
}
