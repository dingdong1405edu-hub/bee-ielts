"use client";
/**
 * Client wrapper for the badge wall on /profile. Renders the static grid
 * (passed in by the server component) and, when the user clicks ANY
 * badge — unlocked or locked — fires the full popup animation as a
 * preview. This is the easiest way for a user to see what the medal
 * celebration looks like before they earn their first one, and serves
 * as a "test fanfare" affordance.
 *
 * Locked badges show a Lock overlay so a preview click reads as "this
 * is what I'm aiming for" rather than "I have this one."
 */
import * as Icons from "lucide-react";
import { Lock } from "lucide-react";
import type { Achievement } from "@/lib/achievements/catalog";
import { triggerAchievementUnlock } from "./achievement-unlock-popup";

export function BadgeWall({
  achievements,
  unlockedCodes,
}: {
  achievements: Achievement[];
  unlockedCodes: string[];
}) {
  const unlockedSet = new Set(unlockedCodes);
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
      {achievements.map((a) => {
        const unlocked = unlockedSet.has(a.code);
        const Icon =
          ((Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
            kebabToPascal(a.iconKey)
          ]) || Icons.Award;
        const colorClasses = unlocked ? medalColors(a.color) : medalColorsLocked();
        return (
          <button
            type="button"
            key={a.code}
            onClick={() => triggerAchievementUnlock(a)}
            className={`relative text-left rounded-2xl border-2 p-3 text-center transition-all hover:scale-[1.03] hover:shadow-lg cursor-pointer ${
              unlocked
                ? "border-honey/40 bg-paper shadow-sm hover:shadow-md"
                : "border-dashed border-muted bg-muted/20 opacity-70"
            }`}
            title={
              unlocked
                ? `${a.description} — bấm để xem lại`
                : `${a.description} — bấm để xem trước`
            }
          >
            <div
              className="relative mx-auto h-16 w-16 grid place-items-center rounded-full"
              style={{
                backgroundImage: `linear-gradient(135deg, ${colorClasses.light}, ${colorClasses.dark})`,
              }}
            >
              <Icon className="h-8 w-8 text-white drop-shadow" />
              {!unlocked && (
                <div className="absolute inset-0 grid place-items-center rounded-full bg-black/40 backdrop-blur-[1px]">
                  <Lock className="h-5 w-5 text-white/90" />
                </div>
              )}
            </div>
            <p className="mt-2 text-[11px] uppercase tracking-wider font-bold text-honey-deep">
              {a.tier === "gold" ? "Vàng" : a.tier === "silver" ? "Bạc" : "Đồng"}
            </p>
            <p className="font-display font-extrabold text-sm leading-tight mt-0.5">
              {a.title}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
              {a.name}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function kebabToPascal(s: string): string {
  return s
    .split("-")
    .map((p) => p[0]?.toUpperCase() + p.slice(1))
    .join("");
}

function medalColors(color: string): { light: string; dark: string } {
  const map: Record<string, { light: string; dark: string }> = {
    amber: { light: "#fde68a", dark: "#b45309" },
    rose: { light: "#fda4af", dark: "#9f1239" },
    violet: { light: "#c4b5fd", dark: "#5b21b6" },
    sky: { light: "#7dd3fc", dark: "#075985" },
    emerald: { light: "#6ee7b7", dark: "#065f46" },
  };
  return map[color] ?? map.amber;
}

function medalColorsLocked(): { light: string; dark: string } {
  return { light: "#cbd5e1", dark: "#475569" };
}
