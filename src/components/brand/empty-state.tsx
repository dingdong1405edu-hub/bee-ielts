import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BeeMascot } from "./bee-mascot";
import {} from "./textures";

/**
 * Branded empty state — the friendly bee mascot + a clear message + CTA. Use
 * wherever a list/result is empty so the app never shows a bare "no data".
 */
export function EmptyState({
  title,
  description,
  action,
  className,
  mascotPose,
  compact,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  mascotPose?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border bg-card text-center",
        compact ? "p-8" : "p-10 md:p-14",
        className,
      )}
    >
      
      <div className="relative mx-auto flex max-w-md flex-col items-center">
        <BeeMascot className={cn("drop-shadow-sm", compact ? "w-24" : "w-32 md:w-40")} />
        <h3 className="mt-4 font-display text-xl font-semibold tracking-tight md:text-2xl">{title}</h3>
        {description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">{description}</p>}
        {action && <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{action}</div>}
      </div>
    </div>
  );
}
