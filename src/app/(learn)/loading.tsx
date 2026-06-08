import { BrandSpinner } from "@/components/brand";

/**
 * Generic skeleton shown the instant the user navigates to ANY (learn)
 * route while the server component fetches data. Next.js will swap it
 * out automatically once the page is ready. Without this every link
 * click felt frozen until the new page fully rendered.
 */
export default function LearnLoading() {
  return (
    <div className="space-y-5">
      <div className="py-6">
        <BrandSpinner label="Đang tải…" className="mx-auto" />
      </div>

      <div className="space-y-5 animate-pulse">
        {/* Hero strip */}
        <div className="rounded-2xl bg-muted/50 h-24" />

        {/* Header row */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-muted/60" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded bg-muted/60" />
            <div className="h-3 w-48 rounded bg-muted/50" />
          </div>
        </div>

        {/* Card grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border bg-card p-4 space-y-2"
            >
              <div className="h-4 w-3/4 rounded bg-muted/60" />
              <div className="h-3 w-1/2 rounded bg-muted/50" />
              <div className="h-3 w-2/3 rounded bg-muted/40" />
            </div>
          ))}
        </div>

        {/* Footer card */}
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <div className="h-4 w-48 rounded bg-muted/60" />
          <div className="h-3 w-full rounded bg-muted/50" />
          <div className="h-3 w-5/6 rounded bg-muted/50" />
        </div>
      </div>
    </div>
  );
}
