import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BeeMascot } from "./bee-mascot";

/**
 * Mascot + speech bubble — the bee saying something. Great for tips, onboarding
 * hints, encouragement, or a friendly heads-up. Bubble sits to the side of the
 * mascot with a little tail.
 */
export function MascotBubble({
  children,
  className,
  tone = "default",
  side = "left",
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "success" | "tip";
  side?: "left" | "right";
}) {
  const toneClass =
    tone === "success"
      ? "bg-success/10 border-success/30 text-foreground"
      : tone === "tip"
        ? "bg-gold-50 border-gold-200 text-foreground dark:bg-gold-950/30 dark:border-gold-800/40"
        : "bg-card border-border text-foreground";

  return (
    <div className={cn("flex items-center gap-3", side === "right" && "flex-row-reverse", className)}>
      <BeeMascot className="w-16 shrink-0 drop-shadow-sm md:w-20" />
      <div
        className={cn(
          "relative rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-sm",
          toneClass,
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border",
            toneClass,
            side === "left" ? "-left-1.5 border-r-0 border-t-0" : "-right-1.5 border-l-0 border-b-0",
          )}
        />
        {children}
      </div>
    </div>
  );
}
