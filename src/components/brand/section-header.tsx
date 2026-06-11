import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Consistent editorial section header: a honey-pill eyebrow (index.html ".eb"
 * — honey-deep text on a honey-tint pill, via the global `.eyebrow` class) + a
 * Poppins display title + optional lead paragraph. Gives every page/section the
 * same rhythm and hierarchy.
 */
export function SectionHeader({
  eyebrow,
  title,
  lead,
  align = "left",
  className,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight md:text-4xl">{title}</h2>
      {lead && <p className="mt-3 text-base leading-relaxed text-muted-foreground md:text-lg">{lead}</p>}
      {children}
    </div>
  );
}
