/**
 * DonutChart — server-rendered SVG donut for part-of-whole (e.g. submissions by
 * skill). Categorical: each slice carries its own brand hue (fixed order), a
 * legend is always present, slices are labelled by value, and text uses ink
 * tokens (dataviz rules). A 2px surface gap between slices separates them.
 */
export interface DonutDatum {
  label: string;
  value: number;
  /** Tailwind text-color class → the slice stroke via currentColor. */
  colorClass: string;
}

export function DonutChart({ data, centerLabel }: { data: DonutDatum[]; centerLabel?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const R = 42;
  const C = 2 * Math.PI * R;
  const gap = total > 0 ? 2 : 0; // 2px surface gap between slices

  let offset = 0;
  const segs = data.map((d) => {
    const frac = total > 0 ? d.value / total : 0;
    const len = Math.max(0, frac * C - gap);
    const seg = { d, len, dashOffset: -offset, frac };
    offset += frac * C;
    return seg;
  });

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative shrink-0">
        <svg viewBox="0 0 100 100" className="h-40 w-40 -rotate-90">
          <circle cx="50" cy="50" r={R} fill="none" className="stroke-muted" strokeWidth={14} />
          {total > 0 &&
            segs.map((s, i) => (
              <circle
                key={i}
                cx="50"
                cy="50"
                r={R}
                fill="none"
                className={s.d.colorClass}
                stroke="currentColor"
                strokeWidth={14}
                strokeDasharray={`${s.len} ${C - s.len}`}
                strokeDashoffset={s.dashOffset}
                strokeLinecap="butt"
              >
                <title>{`${s.d.label}: ${s.d.value} (${Math.round(s.frac * 100)}%)`}</title>
              </circle>
            ))}
        </svg>
        <div className="absolute inset-0 flex rotate-0 flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-foreground">{total}</span>
          {centerLabel && <span className="text-[11px] text-muted-foreground">{centerLabel}</span>}
        </div>
      </div>

      {/* Legend */}
      <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-1">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2 text-sm">
            <span className={`h-3 w-3 shrink-0 rounded-sm ${d.colorClass}`} style={{ backgroundColor: "currentColor" }} />
            <span className="flex-1 text-muted-foreground">{d.label}</span>
            <span className="font-semibold text-foreground">
              {d.value}
              <span className="ml-1 text-xs text-muted-foreground">
                {total > 0 ? `${Math.round((d.value / total) * 100)}%` : ""}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
