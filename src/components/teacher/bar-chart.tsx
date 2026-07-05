/**
 * BarChart — a small, server-rendered SVG bar chart for the teacher analytics
 * panel. Single-series magnitude/over-time only (one hue), so no legend is
 * needed. Follows the dataviz mark specs: thin bars anchored to the baseline
 * with rounded tops, direct value labels, a recessive baseline, text in ink
 * tokens (not the series color), and a native hover tooltip per bar.
 *
 * Color comes from `currentColor` — set it via `colorClass` (e.g. "text-honey").
 */
export interface BarDatum {
  label: string;
  value: number;
  /** Pre-formatted value shown above the bar + in the tooltip. */
  display: string;
}

/** Path for a bar with only its TOP corners rounded, anchored to the baseline. */
function topRoundedBar(x: number, y: number, w: number, h: number, r: number): string {
  const rad = Math.min(r, w / 2, h);
  const bottom = y + h;
  return [
    `M${x},${bottom}`,
    `L${x},${y + rad}`,
    `Q${x},${y} ${x + rad},${y}`,
    `L${x + w - rad},${y}`,
    `Q${x + w},${y} ${x + w},${y + rad}`,
    `L${x + w},${bottom}`,
    "Z",
  ].join(" ");
}

export function BarChart({
  data,
  max,
  colorClass = "text-honey",
  unit = "",
}: {
  data: BarDatum[];
  max?: number;
  colorClass?: string;
  unit?: string;
}) {
  const n = Math.max(data.length, 1);
  const vbW = Math.max(320, n * 72);
  const vbH = 240;
  const padX = 10;
  const topPad = 26; // room for value labels
  const baseline = vbH - 30; // room for x labels
  const plotH = baseline - topPad;

  const peak = Math.max(max ?? 0, ...data.map((d) => d.value), 1);
  const slotW = (vbW - padX * 2) / n;
  const barW = Math.min(46, slotW * 0.6);

  const allZero = data.every((d) => d.value === 0);

  return (
    <div className={colorClass}>
      <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full" role="img" preserveAspectRatio="xMidYMid meet">
        {/* recessive baseline */}
        <line x1={padX} y1={baseline} x2={vbW - padX} y2={baseline} className="stroke-border" strokeWidth={1} />
        {data.map((d, i) => {
          const cx = padX + slotW * i + slotW / 2;
          const h = allZero ? 0 : Math.max(3, (d.value / peak) * plotH);
          const y = baseline - h;
          const x = cx - barW / 2;
          return (
            <g key={i}>
              {h > 0 && (
                <path d={topRoundedBar(x, y, barW, h, 6)} fill="currentColor">
                  <title>{`${d.label}: ${d.display}${unit}`}</title>
                </path>
              )}
              {/* value label */}
              <text x={cx} y={y - 7} textAnchor="middle" className="fill-foreground text-[11px] font-semibold">
                {d.display}
              </text>
              {/* x-axis label */}
              <text x={cx} y={baseline + 18} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
