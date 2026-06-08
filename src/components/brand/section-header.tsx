import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Leaf } from "./leaf";

/**
 * Consistent editorial section header: small uppercase eyebrow + a serif (Lora)
 * title + optional lead paragraph, with a small leaf accent. Used to give every
 * page/section the same rhythm and hierarchy.
 */
export function SectionHeader({
  eyebrow,
  title,
  lead,
  align = "left",
  accent = "var(--gold)",
  className,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  accent?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && (
        <span
          className={cn(
            "inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.18em]",
            align === "center" && "justify-center",
          )}
          style={{ color: accent }}
        >
          <Leaf className="h-3.5 w-3.5" style={{ color: accent }} />
          {eyebrow}
        </span>
      )}
      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-4xl">{title}</h2>
      {lead && <p className="mt-3 text-base leading-relaxed text-muted-foreground md:text-lg">{lead}</p>}
      {children}
    </div>
  );
}
