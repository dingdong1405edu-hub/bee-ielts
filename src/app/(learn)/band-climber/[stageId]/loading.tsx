import { BrandSpinner } from "@/components/brand";

/**
 * Route-specific skeleton for the Duolingo-style stage path. Mimics the
 * green hero banner + zigzag of node placeholders so the user gets
 * structure immediately instead of a generic gray grid.
 */
export default function StagePathLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sage-50/60 via-card to-card -mx-4 md:-mx-8 -mt-4 md:-mt-8 pb-20">
      {/* Hero banner */}
      <div className="bg-gradient-to-r from-sage-500 to-teal-600 text-white shadow-md">
        <div className="max-w-md mx-auto px-4 py-3.5 flex items-center justify-between gap-3 animate-pulse">
          <div className="space-y-1">
            <div className="h-3 w-24 rounded bg-white/30" />
            <div className="h-5 w-48 rounded bg-white/40" />
          </div>
          <div className="h-9 w-32 rounded-2xl bg-white/30" />
        </div>
      </div>

      {/* Centered brand spinner */}
      <div className="max-w-md mx-auto px-4 pt-8">
        <BrandSpinner label="Đang tải…" className="mx-auto" />
      </div>

      {/* Zigzag path skeleton */}
      <div className="max-w-md mx-auto px-4 pt-8 animate-pulse">
        {/* Section divider */}
        <div className="flex items-center gap-3 py-3">
          <div className="flex-1 h-px bg-border/70" />
          <div className="h-6 w-24 rounded-full bg-sage-200" />
          <div className="flex-1 h-px bg-border/70" />
        </div>

        {/* Path nodes */}
        <div className="flex flex-col items-center gap-6 py-2">
          {[0, 72, 0, -72, 0].map((offset, i) => (
            <div
              key={i}
              className="flex flex-col items-center"
              style={{ marginLeft: offset }}
            >
              <div className="h-20 w-20 rounded-full bg-muted border-[5px] border-white shadow" />
              <div className="mt-2 h-3 w-20 rounded bg-muted/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
