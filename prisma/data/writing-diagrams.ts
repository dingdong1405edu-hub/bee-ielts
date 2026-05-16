/**
 * SVG diagrams for IELTS Writing Task 1.
 * Each is a self-contained SVG string with a white background so it is legible
 * on both light and dark UI. Rendered via dangerouslySetInnerHTML.
 */

const PALETTE = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#0ea5e9"];

function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ---------------------------------------------------------------- line chart */
function lineChart(opts: {
  title: string;
  xLabels: string[];
  series: { name: string; values: number[] }[];
  yMax: number;
  yUnit: string;
}): string {
  const W = 640, H = 420, padL = 56, padR = 150, padT = 54, padB = 56;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = opts.xLabels.length;
  const x = (i: number) => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => padT + plotH - (v / opts.yMax) * plotH;

  const gridLines: string[] = [];
  for (let g = 0; g <= 5; g++) {
    const gy = padT + (g / 5) * plotH;
    const val = Math.round(opts.yMax * (1 - g / 5));
    gridLines.push(
      `<line x1="${padL}" y1="${gy}" x2="${padL + plotW}" y2="${gy}" stroke="#e5e7eb" stroke-width="1"/>` +
      `<text x="${padL - 8}" y="${gy + 4}" text-anchor="end" font-size="11" fill="#6b7280">${val}</text>`,
    );
  }
  const xLabels = opts.xLabels
    .map((l, i) => `<text x="${x(i)}" y="${padT + plotH + 20}" text-anchor="middle" font-size="11" fill="#374151">${escapeText(l)}</text>`)
    .join("");

  const paths = opts.series
    .map((s, si) => {
      const color = PALETTE[si % PALETTE.length];
      const d = s.values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
      const dots = s.values.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3.5" fill="${color}"/>`).join("");
      return `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.5"/>${dots}`;
    })
    .join("");

  const legend = opts.series
    .map((s, si) => {
      const color = PALETTE[si % PALETTE.length];
      const ly = padT + 6 + si * 22;
      return `<rect x="${padL + plotW + 16}" y="${ly}" width="14" height="14" rx="3" fill="${color}"/>` +
        `<text x="${padL + plotW + 36}" y="${ly + 11}" font-size="11" fill="#374151">${escapeText(s.name)}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Arial,Helvetica,sans-serif">
<rect width="${W}" height="${H}" fill="#ffffff"/>
<text x="${W / 2}" y="28" text-anchor="middle" font-size="15" font-weight="bold" fill="#111827">${escapeText(opts.title)}</text>
<text x="14" y="${padT - 14}" font-size="11" fill="#6b7280">${escapeText(opts.yUnit)}</text>
${gridLines.join("")}
<line x1="${padL}" y1="${padT + plotH}" x2="${padL + plotW}" y2="${padT + plotH}" stroke="#9ca3af" stroke-width="1.5"/>
${xLabels}
${paths}
${legend}
</svg>`;
}

/* --------------------------------------------------------- grouped bar chart */
function groupedBarChart(opts: {
  title: string;
  categories: string[];
  series: { name: string; values: number[] }[];
  yMax: number;
  yUnit: string;
}): string {
  const W = 640, H = 420, padL = 56, padR = 150, padT = 54, padB = 64;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const groups = opts.categories.length;
  const groupW = plotW / groups;
  const barCount = opts.series.length;
  const barW = (groupW * 0.62) / barCount;

  const grid: string[] = [];
  for (let g = 0; g <= 5; g++) {
    const gy = padT + (g / 5) * plotH;
    const val = Math.round(opts.yMax * (1 - g / 5));
    grid.push(
      `<line x1="${padL}" y1="${gy}" x2="${padL + plotW}" y2="${gy}" stroke="#e5e7eb" stroke-width="1"/>` +
      `<text x="${padL - 8}" y="${gy + 4}" text-anchor="end" font-size="11" fill="#6b7280">${val}</text>`,
    );
  }

  const bars: string[] = [];
  const catLabels: string[] = [];
  opts.categories.forEach((cat, ci) => {
    const gx = padL + ci * groupW;
    catLabels.push(`<text x="${gx + groupW / 2}" y="${padT + plotH + 20}" text-anchor="middle" font-size="11" fill="#374151">${escapeText(cat)}</text>`);
    opts.series.forEach((s, si) => {
      const v = s.values[ci];
      const bh = (v / opts.yMax) * plotH;
      const bx = gx + groupW * 0.19 + si * barW;
      const by = padT + plotH - bh;
      const color = PALETTE[si % PALETTE.length];
      bars.push(`<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" fill="${color}"/>`);
      bars.push(`<text x="${(bx + barW / 2).toFixed(1)}" y="${(by - 4).toFixed(1)}" text-anchor="middle" font-size="9" fill="#374151">${v}</text>`);
    });
  });

  const legend = opts.series
    .map((s, si) => {
      const color = PALETTE[si % PALETTE.length];
      const ly = padT + 6 + si * 22;
      return `<rect x="${padL + plotW + 16}" y="${ly}" width="14" height="14" rx="3" fill="${color}"/>` +
        `<text x="${padL + plotW + 36}" y="${ly + 11}" font-size="11" fill="#374151">${escapeText(s.name)}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Arial,Helvetica,sans-serif">
<rect width="${W}" height="${H}" fill="#ffffff"/>
<text x="${W / 2}" y="28" text-anchor="middle" font-size="15" font-weight="bold" fill="#111827">${escapeText(opts.title)}</text>
<text x="14" y="${padT - 14}" font-size="11" fill="#6b7280">${escapeText(opts.yUnit)}</text>
${grid.join("")}
<line x1="${padL}" y1="${padT + plotH}" x2="${padL + plotW}" y2="${padT + plotH}" stroke="#9ca3af" stroke-width="1.5"/>
${catLabels.join("")}
${bars.join("")}
${legend}
</svg>`;
}

/* ------------------------------------------------------------------ pie pair */
function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}
function slicePath(cx: number, cy: number, r: number, start: number, end: number): string {
  const [sx, sy] = polar(cx, cy, r, end);
  const [ex, ey] = polar(cx, cy, r, start);
  const large = end - start <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${sx.toFixed(1)} ${sy.toFixed(1)} A ${r} ${r} 0 ${large} 0 ${ex.toFixed(1)} ${ey.toFixed(1)} Z`;
}
function onePie(cx: number, cy: number, r: number, label: string, data: { name: string; value: number }[]): string {
  const total = data.reduce((s, d) => s + d.value, 0);
  let angle = 0;
  const parts: string[] = [];
  data.forEach((d, i) => {
    const sweep = (d.value / total) * 360;
    const color = PALETTE[i % PALETTE.length];
    parts.push(`<path d="${slicePath(cx, cy, r, angle, angle + sweep)}" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>`);
    const [lx, ly] = polar(cx, cy, r * 0.62, angle + sweep / 2);
    parts.push(`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="10" font-weight="bold" fill="#ffffff">${d.value}%</text>`);
    angle += sweep;
  });
  parts.push(`<text x="${cx}" y="${cy + r + 24}" text-anchor="middle" font-size="13" font-weight="bold" fill="#111827">${escapeText(label)}</text>`);
  return parts.join("");
}
function piePair(opts: {
  title: string;
  left: { label: string; data: { name: string; value: number }[] };
  right: { label: string; data: { name: string; value: number }[] };
}): string {
  const W = 640, H = 420;
  const legend = opts.left.data
    .map((d, i) => {
      const color = PALETTE[i % PALETTE.length];
      const lx = 70 + (i % 3) * 180;
      const ly = 350 + Math.floor(i / 3) * 22;
      return `<rect x="${lx}" y="${ly}" width="14" height="14" rx="3" fill="${color}"/>` +
        `<text x="${lx + 20}" y="${ly + 11}" font-size="11" fill="#374151">${escapeText(d.name)}</text>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Arial,Helvetica,sans-serif">
<rect width="${W}" height="${H}" fill="#ffffff"/>
<text x="${W / 2}" y="30" text-anchor="middle" font-size="15" font-weight="bold" fill="#111827">${escapeText(opts.title)}</text>
${onePie(170, 175, 105, opts.left.label, opts.left.data)}
${onePie(470, 175, 105, opts.right.label, opts.right.data)}
${legend}
</svg>`;
}

/* -------------------------------------------------------------- data tables */
function dataTable(opts: { title: string; headers: string[]; rows: string[][] }): string {
  const W = 640;
  const rowH = 38;
  const headH = 42;
  const H = 90 + headH + opts.rows.length * rowH;
  const cols = opts.headers.length;
  const tableW = W - 80;
  const colW = tableW / cols;
  const x0 = 40;
  const y0 = 60;

  const headCells = opts.headers
    .map((h, i) => `<text x="${x0 + i * colW + colW / 2}" y="${y0 + headH / 2 + 4}" text-anchor="middle" font-size="12" font-weight="bold" fill="#ffffff">${escapeText(h)}</text>`)
    .join("");
  const rowCells = opts.rows
    .map((row, ri) => {
      const ry = y0 + headH + ri * rowH;
      const bg = ri % 2 === 0 ? "#f9fafb" : "#ffffff";
      const cells = row
        .map((c, ci) => `<text x="${x0 + ci * colW + colW / 2}" y="${ry + rowH / 2 + 4}" text-anchor="middle" font-size="12" fill="#374151" ${ci === 0 ? 'font-weight="bold"' : ""}>${escapeText(c)}</text>`)
        .join("");
      return `<rect x="${x0}" y="${ry}" width="${tableW}" height="${rowH}" fill="${bg}"/>${cells}`;
    })
    .join("");
  const gridV: string[] = [];
  for (let c = 0; c <= cols; c++) {
    gridV.push(`<line x1="${x0 + c * colW}" y1="${y0}" x2="${x0 + c * colW}" y2="${y0 + headH + opts.rows.length * rowH}" stroke="#d1d5db" stroke-width="1"/>`);
  }
  const gridH: string[] = [];
  for (let r = 0; r <= opts.rows.length; r++) {
    const ry = y0 + headH + r * rowH;
    gridH.push(`<line x1="${x0}" y1="${ry}" x2="${x0 + tableW}" y2="${ry}" stroke="#d1d5db" stroke-width="1"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Arial,Helvetica,sans-serif">
<rect width="${W}" height="${H}" fill="#ffffff"/>
<text x="${W / 2}" y="34" text-anchor="middle" font-size="15" font-weight="bold" fill="#111827">${escapeText(opts.title)}</text>
<rect x="${x0}" y="${y0}" width="${tableW}" height="${headH}" fill="#6366f1"/>
${headCells}
${rowCells}
${gridV.join("")}
${gridH.join("")}
</svg>`;
}

/* ===================================================== exported diagrams === */

// 1. Owned vs rented accommodation, England & Wales, 1918–2011
export const DIAGRAM_HOUSING = lineChart({
  title: "Households in owned and rented accommodation, England & Wales (1918–2011)",
  yUnit: "% of households",
  xLabels: ["1918", "1939", "1953", "1971", "1991", "2011"],
  yMax: 100,
  series: [
    { name: "Owned", values: [23, 32, 42, 50, 67, 64] },
    { name: "Rented", values: [77, 68, 58, 50, 33, 36] },
  ],
});

// 2. Renewable energy share, five countries, 2010 vs 2020
export const DIAGRAM_RENEWABLE = groupedBarChart({
  title: "Share of electricity from renewable sources, 2010 vs 2020",
  yUnit: "% of total electricity",
  categories: ["Germany", "China", "USA", "Brazil", "India"],
  yMax: 60,
  series: [
    { name: "2010", values: [17, 8, 10, 45, 6] },
    { name: "2020", values: [45, 28, 20, 48, 22] },
  ],
});

// 3. Average monthly temperatures, three Asian cities
export const DIAGRAM_TEMPERATURE = lineChart({
  title: "Average monthly temperature: Tokyo, Singapore and Mumbai",
  yUnit: "°C",
  xLabels: ["Jan", "Mar", "May", "Jul", "Sep", "Nov"],
  yMax: 40,
  series: [
    { name: "Tokyo", values: [6, 10, 19, 27, 23, 12] },
    { name: "Singapore", values: [27, 28, 29, 28, 28, 27] },
    { name: "Mumbai", values: [25, 28, 33, 30, 29, 29] },
  ],
});

// 4. Paper recycling process — flow diagram
export const DIAGRAM_PAPER_PROCESS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420" font-family="Arial,Helvetica,sans-serif">
<rect width="640" height="420" fill="#ffffff"/>
<text x="320" y="30" text-anchor="middle" font-size="15" font-weight="bold" fill="#111827">The process of recycling paper</text>
<defs><marker id="ar" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#6b7280"/></marker></defs>
<g>
<rect x="40" y="70" width="150" height="64" rx="8" fill="#eef2ff" stroke="#6366f1" stroke-width="2"/>
<text x="115" y="98" text-anchor="middle" font-size="12" fill="#111827">Used paper</text>
<text x="115" y="116" text-anchor="middle" font-size="12" fill="#111827">collected</text>
<rect x="245" y="70" width="150" height="64" rx="8" fill="#eef2ff" stroke="#6366f1" stroke-width="2"/>
<text x="320" y="98" text-anchor="middle" font-size="12" fill="#111827">Sorted &amp;</text>
<text x="320" y="116" text-anchor="middle" font-size="12" fill="#111827">transported to mill</text>
<rect x="450" y="70" width="150" height="64" rx="8" fill="#eef2ff" stroke="#6366f1" stroke-width="2"/>
<text x="525" y="98" text-anchor="middle" font-size="12" fill="#111827">Shredded and</text>
<text x="525" y="116" text-anchor="middle" font-size="12" fill="#111827">mixed with water</text>
<line x1="190" y1="102" x2="240" y2="102" stroke="#6b7280" stroke-width="2" marker-end="url(#ar)"/>
<line x1="395" y1="102" x2="445" y2="102" stroke="#6b7280" stroke-width="2" marker-end="url(#ar)"/>
<line x1="525" y1="134" x2="525" y2="184" stroke="#6b7280" stroke-width="2" marker-end="url(#ar)"/>
<rect x="450" y="190" width="150" height="64" rx="8" fill="#fce7f3" stroke="#ec4899" stroke-width="2"/>
<text x="525" y="218" text-anchor="middle" font-size="12" fill="#111827">Pulp cleaned and</text>
<text x="525" y="236" text-anchor="middle" font-size="12" fill="#111827">ink removed</text>
<rect x="245" y="190" width="150" height="64" rx="8" fill="#fce7f3" stroke="#ec4899" stroke-width="2"/>
<text x="320" y="218" text-anchor="middle" font-size="12" fill="#111827">Pulp rolled and</text>
<text x="320" y="236" text-anchor="middle" font-size="12" fill="#111827">dried into sheets</text>
<rect x="40" y="190" width="150" height="64" rx="8" fill="#fce7f3" stroke="#ec4899" stroke-width="2"/>
<text x="115" y="218" text-anchor="middle" font-size="12" fill="#111827">New paper</text>
<text x="115" y="236" text-anchor="middle" font-size="12" fill="#111827">products made</text>
<line x1="450" y1="222" x2="400" y2="222" stroke="#6b7280" stroke-width="2" marker-end="url(#ar)"/>
<line x1="245" y1="222" x2="195" y2="222" stroke="#6b7280" stroke-width="2" marker-end="url(#ar)"/>
<line x1="115" y1="254" x2="115" y2="304" stroke="#6b7280" stroke-width="2" marker-end="url(#ar)"/>
<rect x="40" y="310" width="150" height="64" rx="8" fill="#d1fae5" stroke="#10b981" stroke-width="2"/>
<text x="115" y="338" text-anchor="middle" font-size="12" fill="#111827">Sold to consumers</text>
<text x="115" y="356" text-anchor="middle" font-size="12" fill="#111827">&amp; used again</text>
<path d="M 190 342 L 560 342 L 560 260" fill="none" stroke="#6b7280" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#ar)"/>
<text x="375" y="334" text-anchor="middle" font-size="10" fill="#6b7280" font-style="italic">cycle repeats</text>
</g>
</svg>`;

// 5. Town centre maps, 1990 vs 2020
export const DIAGRAM_TOWN_MAPS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420" font-family="Arial,Helvetica,sans-serif">
<rect width="640" height="420" fill="#ffffff"/>
<text x="320" y="28" text-anchor="middle" font-size="15" font-weight="bold" fill="#111827">Town centre: 1990 and 2020</text>
<g>
<rect x="30" y="50" width="270" height="320" fill="#f9fafb" stroke="#9ca3af" stroke-width="1.5"/>
<text x="165" y="72" text-anchor="middle" font-size="13" font-weight="bold" fill="#6366f1">1990</text>
<line x1="30" y1="210" x2="300" y2="210" stroke="#cbd5e1" stroke-width="10"/>
<text x="270" y="206" text-anchor="end" font-size="9" fill="#64748b">Main Road</text>
<rect x="55" y="95" width="90" height="70" fill="#dcfce7" stroke="#16a34a"/>
<text x="100" y="134" text-anchor="middle" font-size="10" fill="#166534">Park</text>
<rect x="175" y="95" width="100" height="70" fill="#fef9c3" stroke="#ca8a04"/>
<text x="225" y="134" text-anchor="middle" font-size="10" fill="#854d0e">Houses</text>
<rect x="55" y="240" width="100" height="80" fill="#fee2e2" stroke="#dc2626"/>
<text x="105" y="284" text-anchor="middle" font-size="10" fill="#991b1b">Factory</text>
<rect x="185" y="240" width="90" height="80" fill="#fef9c3" stroke="#ca8a04"/>
<text x="230" y="284" text-anchor="middle" font-size="10" fill="#854d0e">Houses</text>
</g>
<g>
<rect x="340" y="50" width="270" height="320" fill="#f9fafb" stroke="#9ca3af" stroke-width="1.5"/>
<text x="475" y="72" text-anchor="middle" font-size="13" font-weight="bold" fill="#ec4899">2020</text>
<line x1="340" y1="210" x2="610" y2="210" stroke="#cbd5e1" stroke-width="10"/>
<text x="580" y="206" text-anchor="end" font-size="9" fill="#64748b">Main Road</text>
<rect x="365" y="95" width="90" height="70" fill="#dcfce7" stroke="#16a34a"/>
<text x="410" y="134" text-anchor="middle" font-size="10" fill="#166534">Park</text>
<rect x="485" y="95" width="100" height="70" fill="#dbeafe" stroke="#2563eb"/>
<text x="535" y="129" text-anchor="middle" font-size="10" fill="#1e3a8a">Shopping</text>
<text x="535" y="143" text-anchor="middle" font-size="10" fill="#1e3a8a">Centre</text>
<rect x="365" y="240" width="100" height="80" fill="#ede9fe" stroke="#7c3aed"/>
<text x="415" y="276" text-anchor="middle" font-size="10" fill="#5b21b6">Apartment</text>
<text x="415" y="290" text-anchor="middle" font-size="10" fill="#5b21b6">blocks</text>
<rect x="495" y="240" width="90" height="80" fill="#cffafe" stroke="#0891b2"/>
<text x="540" y="276" text-anchor="middle" font-size="10" fill="#155e75">Car</text>
<text x="540" y="290" text-anchor="middle" font-size="10" fill="#155e75">park</text>
</g>
</svg>`;

// 6. Household expenditure, 2000 vs 2020
export const DIAGRAM_EXPENDITURE = piePair({
  title: "Household expenditure by category, 2000 vs 2020",
  left: {
    label: "2000",
    data: [
      { name: "Food", value: 30 },
      { name: "Housing", value: 25 },
      { name: "Transport", value: 15 },
      { name: "Leisure", value: 12 },
      { name: "Other", value: 18 },
    ],
  },
  right: {
    label: "2020",
    data: [
      { name: "Food", value: 22 },
      { name: "Housing", value: 32 },
      { name: "Transport", value: 13 },
      { name: "Leisure", value: 18 },
      { name: "Other", value: 15 },
    ],
  },
});

// 7. International tourist arrivals table
export const DIAGRAM_TOURISTS = dataTable({
  title: "International tourist arrivals (millions)",
  headers: ["Country", "2015", "2018", "2022"],
  rows: [
    ["France", "84.5", "89.4", "79.4"],
    ["Spain", "68.2", "82.8", "71.7"],
    ["Thailand", "29.9", "38.2", "11.2"],
    ["Japan", "19.7", "31.2", "3.8"],
  ],
});
