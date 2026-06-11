"use client";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

/**
 * Per-skill page theming. Each skill area gets its own identity colour (the
 * same hues as the index.html cards): Reading=green, Listening=blue,
 * Speaking=orange, Writing=rose, Vocab=pink, Grammar=teal, Shadowing=violet.
 *
 * We re-bind the whole `--primary` / `--accent` / `--brand-*` token family on a
 * `display:contents` wrapper around the page content, so every primary button,
 * link, active state, eyebrow and gradient inside that page renders in the skill
 * colour — while the app chrome (sidebar/header) keeps the global sage green.
 * White text stays legible on all of these (they're the index card colours).
 */
type Vars = Record<string, string>;

function theme(h: number, s: number, l: number, deep: string, tint: string, fg = "0 0% 100%"): Vars {
  return {
    "--primary": `${h} ${s}% ${l}%`,
    "--primary-foreground": fg,
    "--ring": `${h} ${s}% ${l}%`,
    "--accent": `${h} ${Math.round(s * 0.7)}% 93%`,
    "--accent-foreground": `${h} ${s}% ${Math.max(24, l - 16)}%`,
    "--brand-1": `${h} ${Math.min(85, s + 8)}% ${Math.min(66, l + 14)}%`,
    "--brand-2": `${h} ${s}% ${l}%`,
    "--brand-3": `${h} ${s}% ${Math.max(24, l - 16)}%`,
    "--primary-deep": deep,
    "--primary-tint": tint,
  };
}

const SKILLS: { match: (p: string) => boolean; vars: Vars }[] = [
  { match: (p) => p.startsWith("/reading"), vars: theme(145, 54, 40, "#237A47", "#DDF1E6") },
  { match: (p) => p.startsWith("/listening"), vars: theme(232, 64, 53, "#2E3DA0", "#E2E5FA") },
  { match: (p) => p.startsWith("/podcasts"), vars: theme(232, 64, 53, "#2E3DA0", "#E2E5FA") },
  // Speaking is honey GOLD (dark text on gold) — Roulette keeps its green felt.
  { match: (p) => p.startsWith("/speaking") && !p.startsWith("/speaking/roulette"), vars: theme(40, 74, 52, "#C98A14", "#FCE9BE", "36 46% 11%") },
  { match: (p) => p.startsWith("/writing"), vars: theme(346, 60, 57, "#B83E58", "#FBE5EB") },
  { match: (p) => p.startsWith("/vocab"), vars: theme(330, 63, 53, "#B23A74", "#FBE3F0") },
  { match: (p) => p.startsWith("/words"), vars: theme(330, 63, 53, "#B23A74", "#FBE3F0") },
  { match: (p) => p.startsWith("/grammar"), vars: theme(177, 51, 35, "#1F6360", "#D9EEED") },
  { match: (p) => p.startsWith("/shadowing"), vars: theme(262, 46, 46, "#45307A", "#E9E2F5") },
];

export function SkillTheme({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const skill = SKILLS.find((s) => s.match(pathname));
  if (!skill) return <>{children}</>;
  // display:contents → no extra box / no layout impact, but custom properties
  // still cascade to descendants.
  return (
    <div className="contents" style={skill.vars as CSSProperties}>
      {children}
    </div>
  );
}
