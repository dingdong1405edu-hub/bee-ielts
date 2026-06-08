// Mechanical sweep: map the OLD muted Sage+Gold per-skill accent hexes to the
// new vibrant Duolingo skill hues (parity with tailwind `skill.*`). These hexes
// are hardcoded as faint per-page accents (honeycomb tints, eyebrow dots, small
// badges) that the token swap doesn't reach. Run once: `node scripts/reskin-duolingo.mjs`.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

// old -> new (skill identity colours)
const MAP = {
  "#4F7A66": "#58CC02", // reading  : sage     -> grass green
  "#5B7E9C": "#1CB0F6", // listening: slate    -> sky blue
  "#6E93B5": "#4FC3F7", // listening light
  "#4C6E92": "#1CB0F6", // listening deep
  "#7CA0BC": "#6FCDFA", // listening dark-mode text
  "#B6883F": "#FF9600", // writing  : bronze   -> orange
  "#C0714E": "#FF4B6E", // speaking : terracotta -> rose
  "#8A6E9C": "#A560E8", // shadowing: plum     -> violet
  "#3E8C84": "#14B8A6", // grammar  : teal     -> bright teal
  "#BD6B6B": "#FF5CA8", // vocab    : dusty rose -> pink
  "#4C5B8A": "#4B6BFB", // mock     : indigo   -> bright indigo
  "#7A8C46": "#F0A800", // climber  : olive    -> amber
  "#C5A05E": "#FFC107", // gold default fallback -> vibrant honey
};

const EXTS = new Set([".tsx", ".ts", ".css", ".svg", ".jsx"]);
const ROOT = join(process.cwd(), "src");

let files = 0,
  swaps = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (EXTS.has(extname(p))) processFile(p);
  }
}

function processFile(p) {
  let src = readFileSync(p, "utf8");
  let n = 0;
  for (const [oldHex, newHex] of Object.entries(MAP)) {
    const re = new RegExp(oldHex.replace("#", "#"), "gi");
    src = src.replace(re, (m) => {
      n++;
      return newHex;
    });
  }
  if (n > 0) {
    writeFileSync(p, src);
    files++;
    swaps += n;
    console.log(`  ${n.toString().padStart(3)} ${p}`);
  }
}

walk(ROOT);
console.log(`\nDone: ${swaps} swaps across ${files} files.`);
