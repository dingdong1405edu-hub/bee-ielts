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

/* ===================================== additional 15 Task 1 diagrams ====== */

// 8. Mobile phone ownership by age group
export const DIAGRAM_PHONE_OWNERSHIP = groupedBarChart({
  title: "Smartphone ownership by age group, 2010 vs 2022",
  yUnit: "% who own a smartphone",
  categories: ["16–24", "25–44", "45–64", "65+"],
  yMax: 100,
  series: [
    { name: "2010", values: [65, 55, 38, 12] },
    { name: "2022", values: [98, 95, 88, 55] },
  ],
});

// 9. Population growth, three countries
export const DIAGRAM_POPULATION = lineChart({
  title: "Population of three countries, 1980–2020",
  yUnit: "millions",
  xLabels: ["1980", "1990", "2000", "2010", "2020"],
  yMax: 250,
  series: [
    { name: "Nigeria", values: [73, 95, 122, 160, 206] },
    { name: "Brazil", values: [121, 150, 175, 196, 213] },
    { name: "Japan", values: [117, 123, 127, 128, 125] },
  ],
});

// 10. Household energy use, two homes
export const DIAGRAM_HOME_ENERGY = piePair({
  title: "How energy is used in two households",
  left: {
    label: "Household A",
    data: [
      { name: "Heating", value: 45 },
      { name: "Water heating", value: 20 },
      { name: "Appliances", value: 18 },
      { name: "Lighting", value: 10 },
      { name: "Cooking", value: 7 },
    ],
  },
  right: {
    label: "Household B",
    data: [
      { name: "Heating", value: 30 },
      { name: "Water heating", value: 18 },
      { name: "Appliances", value: 30 },
      { name: "Lighting", value: 12 },
      { name: "Cooking", value: 10 },
    ],
  },
});

// 11. University enrolment by faculty
export const DIAGRAM_ENROLMENT = dataTable({
  title: "Student enrolment by faculty",
  headers: ["Faculty", "2018", "2020", "2022"],
  rows: [
    ["Business", "1,200", "1,450", "1,680"],
    ["Engineering", "980", "1,100", "1,320"],
    ["Arts", "760", "720", "690"],
    ["Science", "850", "910", "1,020"],
  ],
});

// 12. Average weekly working hours by country and gender
export const DIAGRAM_WORKING_HOURS = groupedBarChart({
  title: "Average weekly working hours by country",
  yUnit: "hours per week",
  categories: ["Mexico", "Japan", "UK", "Germany", "Netherlands"],
  yMax: 50,
  series: [
    { name: "Men", values: [45, 42, 38, 35, 33] },
    { name: "Women", values: [40, 36, 34, 30, 26] },
  ],
});

// 13. Unemployment rate, two countries
export const DIAGRAM_UNEMPLOYMENT = lineChart({
  title: "Unemployment rate in two countries, 2005–2020",
  yUnit: "% of workforce",
  xLabels: ["2005", "2010", "2015", "2020"],
  yMax: 25,
  series: [
    { name: "Country A", values: [9, 20, 22, 15] },
    { name: "Country B", values: [11, 7, 5, 4] },
  ],
});

// 14. Chocolate production process
export const DIAGRAM_CHOCOLATE_PROCESS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420" font-family="Arial,Helvetica,sans-serif">
<rect width="640" height="420" fill="#ffffff"/>
<text x="320" y="30" text-anchor="middle" font-size="15" font-weight="bold" fill="#111827">How chocolate is produced</text>
<defs><marker id="arc" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#6b7280"/></marker></defs>
<g>
<rect x="30" y="70" width="135" height="62" rx="8" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
<text x="97" y="96" text-anchor="middle" font-size="11" fill="#111827">Cacao pods</text>
<text x="97" y="113" text-anchor="middle" font-size="11" fill="#111827">harvested</text>
<rect x="200" y="70" width="135" height="62" rx="8" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
<text x="267" y="96" text-anchor="middle" font-size="11" fill="#111827">Beans removed</text>
<text x="267" y="113" text-anchor="middle" font-size="11" fill="#111827">and fermented</text>
<rect x="370" y="70" width="135" height="62" rx="8" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
<text x="437" y="96" text-anchor="middle" font-size="11" fill="#111827">Beans dried</text>
<text x="437" y="113" text-anchor="middle" font-size="11" fill="#111827">in the sun</text>
<rect x="475" y="160" width="135" height="62" rx="8" fill="#fde68a" stroke="#d97706" stroke-width="2"/>
<text x="542" y="186" text-anchor="middle" font-size="11" fill="#111827">Beans roasted</text>
<text x="542" y="203" text-anchor="middle" font-size="11" fill="#111827">at high heat</text>
<line x1="165" y1="101" x2="195" y2="101" stroke="#6b7280" stroke-width="2" marker-end="url(#arc)"/>
<line x1="335" y1="101" x2="365" y2="101" stroke="#6b7280" stroke-width="2" marker-end="url(#arc)"/>
<path d="M 437 132 L 437 191 L 470 191" fill="none" stroke="#6b7280" stroke-width="2" marker-end="url(#arc)"/>
<rect x="305" y="160" width="135" height="62" rx="8" fill="#fde68a" stroke="#d97706" stroke-width="2"/>
<text x="372" y="186" text-anchor="middle" font-size="11" fill="#111827">Shells removed,</text>
<text x="372" y="203" text-anchor="middle" font-size="11" fill="#111827">leaving nibs</text>
<rect x="135" y="160" width="135" height="62" rx="8" fill="#fde68a" stroke="#d97706" stroke-width="2"/>
<text x="202" y="186" text-anchor="middle" font-size="11" fill="#111827">Nibs ground</text>
<text x="202" y="203" text-anchor="middle" font-size="11" fill="#111827">into a paste</text>
<line x1="475" y1="191" x2="445" y2="191" stroke="#6b7280" stroke-width="2" marker-end="url(#arc)"/>
<line x1="305" y1="191" x2="275" y2="191" stroke="#6b7280" stroke-width="2" marker-end="url(#arc)"/>
<path d="M 202 222 L 202 281 L 235 281" fill="none" stroke="#6b7280" stroke-width="2" marker-end="url(#arc)"/>
<rect x="240" y="250" width="160" height="62" rx="8" fill="#d1fae5" stroke="#059669" stroke-width="2"/>
<text x="320" y="276" text-anchor="middle" font-size="11" fill="#111827">Sugar and milk</text>
<text x="320" y="293" text-anchor="middle" font-size="11" fill="#111827">added and mixed</text>
<rect x="430" y="250" width="160" height="62" rx="8" fill="#d1fae5" stroke="#059669" stroke-width="2"/>
<text x="510" y="276" text-anchor="middle" font-size="11" fill="#111827">Chocolate moulded</text>
<text x="510" y="293" text-anchor="middle" font-size="11" fill="#111827">and cooled</text>
<line x1="400" y1="281" x2="425" y2="281" stroke="#6b7280" stroke-width="2" marker-end="url(#arc)"/>
<text x="320" y="356" text-anchor="middle" font-size="11" fill="#6b7280" font-style="italic">The finished bars are then wrapped and sent to shops.</text>
</g>
</svg>`;

// 15. Library books borrowed by genre
export const DIAGRAM_LIBRARY = groupedBarChart({
  title: "Books borrowed from a public library, by genre",
  yUnit: "books borrowed",
  categories: ["Fiction", "History", "Science", "Children", "Biography"],
  yMax: 5000,
  series: [
    { name: "2015", values: [4200, 1800, 1500, 3600, 900] },
    { name: "2020", values: [3800, 2100, 2400, 4100, 1200] },
  ],
});

// 16. Global water use, two regions
export const DIAGRAM_WATER_USE = piePair({
  title: "How fresh water is used in two regions",
  left: {
    label: "Region A",
    data: [
      { name: "Agriculture", value: 70 },
      { name: "Industry", value: 18 },
      { name: "Domestic", value: 12 },
    ],
  },
  right: {
    label: "Region B",
    data: [
      { name: "Agriculture", value: 40 },
      { name: "Industry", value: 42 },
      { name: "Domestic", value: 18 },
    ],
  },
});

// 17. Museum visitors, three museums
export const DIAGRAM_MUSEUM = lineChart({
  title: "Annual visitors to three museums, 2016–2022",
  yUnit: "millions of visitors",
  xLabels: ["2016", "2018", "2020", "2022"],
  yMax: 8,
  series: [
    { name: "Museum A", values: [5.2, 6.1, 1.8, 5.9] },
    { name: "Museum B", values: [3.1, 3.8, 1.2, 4.0] },
    { name: "Museum C", values: [2.0, 2.4, 0.9, 2.8] },
  ],
});

// 18. Crime statistics, four cities
export const DIAGRAM_CRIME = dataTable({
  title: "Reported crimes per 10,000 people, 2022",
  headers: ["City", "Theft", "Assault", "Burglary"],
  rows: [
    ["City P", "210", "48", "95"],
    ["City Q", "165", "72", "60"],
    ["City R", "320", "35", "140"],
    ["City S", "90", "21", "44"],
  ],
});

// 19. CO2 emissions per capita
export const DIAGRAM_CO2 = groupedBarChart({
  title: "Carbon dioxide emissions per person, 2000 vs 2020",
  yUnit: "tonnes of CO2 per person",
  categories: ["USA", "China", "Germany", "India", "Brazil"],
  yMax: 25,
  series: [
    { name: "2000", values: [20.5, 2.7, 10.1, 0.9, 1.9] },
    { name: "2020", values: [14.2, 7.4, 7.7, 1.8, 2.2] },
  ],
});

// 20. Coffee and tea consumption
export const DIAGRAM_COFFEE_TEA = lineChart({
  title: "Coffee and tea consumption per person, 1990–2020",
  yUnit: "kg per person per year",
  xLabels: ["1990", "2000", "2010", "2020"],
  yMax: 10,
  series: [
    { name: "Coffee", values: [4.2, 5.1, 6.3, 7.8] },
    { name: "Tea", values: [6.5, 6.2, 5.8, 5.4] },
  ],
});

// 21. Modes of transport, two cities
export const DIAGRAM_TRANSPORT = piePair({
  title: "How people travel to work in two cities",
  left: {
    label: "City X",
    data: [
      { name: "Car", value: 55 },
      { name: "Public transport", value: 25 },
      { name: "Cycling", value: 8 },
      { name: "Walking", value: 12 },
    ],
  },
  right: {
    label: "City Y",
    data: [
      { name: "Car", value: 30 },
      { name: "Public transport", value: 40 },
      { name: "Cycling", value: 18 },
      { name: "Walking", value: 12 },
    ],
  },
});

// 22. Life expectancy, three countries
export const DIAGRAM_LIFE_EXPECTANCY = lineChart({
  title: "Life expectancy at birth in three countries, 1970–2020",
  yUnit: "years",
  xLabels: ["1970", "1990", "2010", "2020"],
  yMax: 90,
  series: [
    { name: "Japan", values: [72, 79, 83, 85] },
    { name: "USA", values: [71, 75, 78, 77] },
    { name: "India", values: [49, 58, 67, 70] },
  ],
});

// 23. Online vs in-store shopping
export const DIAGRAM_SHOPPING = groupedBarChart({
  title: "Share of retail sales made online, by product type",
  yUnit: "% of sales made online",
  categories: ["Clothing", "Electronics", "Groceries", "Books", "Furniture"],
  yMax: 80,
  series: [
    { name: "2014", values: [18, 30, 4, 42, 9] },
    { name: "2024", values: [48, 65, 22, 71, 31] },
  ],
});

// 24. Electricity generation by source
export const DIAGRAM_ELECTRICITY_MIX = piePair({
  title: "Sources of electricity generation, 2005 vs 2023",
  left: {
    label: "2005",
    data: [
      { name: "Coal", value: 48 },
      { name: "Gas", value: 22 },
      { name: "Nuclear", value: 18 },
      { name: "Hydro", value: 9 },
      { name: "Wind & solar", value: 3 },
    ],
  },
  right: {
    label: "2023",
    data: [
      { name: "Coal", value: 20 },
      { name: "Gas", value: 28 },
      { name: "Nuclear", value: 15 },
      { name: "Hydro", value: 10 },
      { name: "Wind & solar", value: 27 },
    ],
  },
});
