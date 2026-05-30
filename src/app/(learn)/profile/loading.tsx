/** Profile skeleton — header + stat tiles + attempt list. */
export default function ProfileLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-pulse">
      <div className="rounded-2xl bg-muted/40 h-40" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 h-24" />
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-5 w-40 rounded bg-muted/60" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 h-16" />
        ))}
      </div>
    </div>
  );
}
