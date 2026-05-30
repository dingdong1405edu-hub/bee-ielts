/** Skeleton for mock-test intro + review pages. */
export default function MockLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-pulse">
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent border-2 border-primary/20 h-28" />
      <div className="grid sm:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border bg-card p-5 h-32 space-y-2"
          >
            <div className="h-10 w-10 rounded-xl bg-muted/60" />
            <div className="h-4 w-24 rounded bg-muted/60" />
            <div className="h-3 w-32 rounded bg-muted/50" />
          </div>
        ))}
      </div>
    </div>
  );
}
