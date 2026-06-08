import { cn } from "@/lib/utils";

/**
 * Warm kraft / newsprint paper grain — a faint procedural texture (no asset
 * needed) that gives surfaces a tactile, editorial feel matching the leaf-paper
 * artwork. Drop on a relatively-positioned card/section as `absolute inset-0`.
 */
export function PaperGrain({ className, opacity = 0.5 }: { className?: string; opacity?: number }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{
        opacity,
        mixBlendMode: "multiply",
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='k'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23k)' opacity='0.5'/%3E%3C/svg%3E\")",
      }}
    />
  );
}
