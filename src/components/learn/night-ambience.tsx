import type { CSSProperties } from "react";
import { FireflySwarm } from "./firefly-swarm";

/**
 * Dreamy night-mode ambience — ONLY in dark mode. Two layers:
 *
 *   1. `.night-bg` (behind the transparent body): soft honey/leaf glows for a
 *      "mờ ảo" haze + a dense, twinkling white starfield in the dark sky.
 *      Pure CSS, gated to `.dark` (display:none in light → zero cost).
 *   2. <FireflySwarm/>: a flock of fireflies drifts in, wanders, then leaves;
 *      a fresh flock returns ~4 min later (JS-driven, dark-only).
 *
 * Star positions are derived deterministically from the index (no Math.random)
 * to avoid hydration drift.
 */
const STARS = Array.from({ length: 60 }, (_, i) => ({
  left: (i * 53 + 11) % 100,
  top: (i * 71 + 7) % 97,
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

      {/* Over the page: fireflies arrive in flocks, wander, then leave */}
      <FireflySwarm />
    </>
  );
}
