import { cn } from "@/lib/utils";
import { BeeLogo } from "./bee-logo";

/**
 * Branded loading indicator — the bee logo gently pulsing inside a spinning
 * ring. Use instead of a bare spinner so loading states stay on-brand.
 */
export function BrandSpinner({
  className,
  label,
  size = 56,
}: {
  className?: string;
  label?: string;
  size?: number;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 text-muted-foreground", className)}>
      <span className="relative grid place-items-center" style={{ width: size, height: size }}>
        <span
          className="absolute inset-0 animate-spin rounded-full border-2 border-gold/20 border-t-gold"
          style={{ animationDuration: "0.9s" }}
        />
        <BeeLogo variant="bare" className="text-ink animate-float" style={{ width: size * 0.62 }} />
      </span>
      {label && <span className="text-sm font-medium">{label}</span>}
    </div>
  );
}
