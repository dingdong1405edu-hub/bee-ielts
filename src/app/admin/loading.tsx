import { BrandSpinner } from "@/components/brand";

/** Admin pages skeleton. */
export default function AdminLoading() {
  return (
    <div className="space-y-5">
      <div className="py-6">
        <BrandSpinner label="Đang tải…" className="mx-auto" />
      </div>

      <div className="space-y-5 animate-pulse">
        <div className="h-8 w-64 rounded bg-muted/60" />
        <div className="h-4 w-80 rounded bg-muted/50" />
        <div className="space-y-2 pt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 h-16" />
          ))}
        </div>
      </div>
    </div>
  );
}
