// One-off reskin: map Honey-era Tailwind palette classes to the new Sage+Gold
// scales. Only matches inside Tailwind class context: a color word that is
// preceded by "-" (a utility prefix) and followed by "-<digit>" (a shade).
// Run: node scripts/reskin-colors.mjs        (apply)
//      node scripts/reskin-colors.mjs --dry   (report only)
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "src");
const DRY = process.argv.includes("--dry");

// warm honey family -> gold ; green family -> sage
const MAP = { amber: "gold", orange: "gold", yellow: "gold", emerald: "sage", lime: "sage" };
const WORDS = Object.keys(MAP).join("|");
// e.g. text-amber-500, from-amber-50, dark:bg-emerald-950/30, ring-amber-500/40
const RE = new RegExp(`-(${WORDS})-(?=\\d)`, "g");

// stray raw hexes worth normalising (orange-400 -> gold)
const HEX = { "#fb923c": "#C5A05E", "#fbbf24": "#C5A05E", "#f59e0b": "#C5A05E" };

async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.(tsx?|css)$/.test(e.name)) out.push(p);
  }
  return out;
}

let files = 0, hits = 0;
const touched = [];
for (const file of await walk(ROOT)) {
  let src = await fs.readFile(file, "utf8");
  let n = 0;
  let next = src.replace(RE, (_m, w) => { n++; return `-${MAP[w]}-`; });
  for (const [from, to] of Object.entries(HEX)) {
    const parts = next.split(new RegExp(from, "gi"));
    if (parts.length > 1) { n += parts.length - 1; next = parts.join(to); }
  }
  if (n > 0) {
    files++; hits += n;
    touched.push(`${path.relative(process.cwd(), file)}  (${n})`);
    if (!DRY) await fs.writeFile(file, next, "utf8");
  }
}
console.log(touched.join("\n"));
console.log(`\n${DRY ? "[DRY] " : ""}${hits} replacements across ${files} files`);
