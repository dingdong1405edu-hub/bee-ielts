import { ListChecks } from "lucide-react";

/**
 * Shape-matched skeleton for [TestPicker]. Rendered as a Suspense fallback
 * inside each section landing page so the hero/SkillIntro shows instantly
 * while the real grid streams in over the network.
 */
export function TestPickerSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="max-w-6xl mx-auto w-full animate-pulse">
      <div className="flex items-center gap-2 mb-1">
        <ListChecks className="h-5 w-5 text-muted-foreground/40" />
        <div className="h-4 w-32 rounded bg-muted/60" />
      </div>
      <div className="h-3 w-44 rounded bg-muted/50 mb-4" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-2xl border bg-card overflow-hidden">
            <div className="aspect-[16/10] bg-muted/40" />
            <div className="p-3 space-y-2">
              <div className="h-4 w-5/6 rounded bg-muted/60" />
              <div className="h-3 w-2/3 rounded bg-muted/50" />
              <div className="h-3 w-1/2 rounded bg-muted/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
