import type { CSSProperties } from "react";

/**
 * Dreamy night-mode ambience — ONLY visible in dark mode (gated purely in CSS
 * via `.dark` so nothing renders/animates in the light theme). Two layers:
 *
 *   1. `.night-bg` (behind the transparent body): soft honey/leaf glows for a
 *      "mờ ảo" haze + a scattered, twinkling starfield in the dark sky.
 *   2. `.night-fireflies` (overlay above the page, pointer-events-none): 4
 *      glowing fireflies that drift diagonally across the screen — replacing
 *      the daytime bee swarm.
 *
 * All pure CSS (no JS/rAF) so it costs nothing in light mode (display:none)
 * and respects prefers-reduced-motion. Star positions are derived
 * deterministically from the index (no Math.random) to avoid hydration drift.
 */
const STARS = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 53 + 11) % 100,
  top: (i * 71 + 7) % 96,
  size: 1 + (i % 3),
  delay: ((i * 7) % 40) / 10,
  dur: 2.4 + ((i * 5) % 30) / 10,
}));

export function NightAmbience() {
  return (
    <>
      {/* Behind the page: dreamy glows + starfield */}
      <div className="night-bg" aria-hidden="true">
        <div className="night-glow g1" />
        <div className="night-glow g2" />
        <div className="night-glow g3" />
        {STARS.map((s, i) => (
          <span
            key={i}
            className="night-star"
            style={
              {
                left: `${s.left}%`,
                top: `${s.top}%`,
                width: `${s.size}px`,
                height: `${s.size}px`,
                animationDelay: `${s.delay}s`,
                animationDuration: `${s.dur}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* Over the page: fireflies drifting across (like the bee swarm) */}
      <div className="night-fireflies" aria-hidden="true">
        <span className="firefly f1" />
        <span className="firefly f2" />
        <span className="firefly f3" />
        <span className="firefly f4" />
      </div>
    </>
  );
}
