/** Dashboard skeleton — XP/streak strip + module grid. */
export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-16 w-16 rounded-2xl bg-muted/60" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-48 rounded bg-muted/60" />
          <div className="h-3 w-64 rounded bg-muted/50" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 h-24" />
        ))}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border bg-card p-5 h-40" />
        ))}
      </div>
    </div>
  );
}
