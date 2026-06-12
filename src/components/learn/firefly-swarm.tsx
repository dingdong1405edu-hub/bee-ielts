"use client";
import { useEffect, useRef } from "react";
import { useTheme } from "@/components/theme-provider";

/**
 * Fireflies that behave like the daytime bee swarm: a flock of 4 drifts in,
 * wanders ("lượn lờ") around the screen for ~20s, then floats off and vanishes.
 * A fresh flock appears ~4 minutes later. DARK MODE ONLY — the effect only runs
 * while `resolvedTheme === "dark"` and is fully torn down when the theme flips
 * back to light. Honours prefers-reduced-motion (no swarm at all).
 *
 * JS-driven (requestAnimationFrame) rather than CSS so each firefly can wander
 * along its own random meandering path instead of a fixed loop.
 */
const WAVE_GAP_MS = 240_000; // 4 minutes between flocks
const FLOCK_SIZE = 4;

export function FireflySwarm() {
  const { resolvedTheme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resolvedTheme !== "dark") return; // only at night
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layer = ref.current;
    if (!layer) return;

    let alive = true;
    const timers: number[] = [];

    const smooth = (t: number) => t * t * (3 - 2 * t);

    const spawnFirefly = () => {
      if (!alive) return;
      const W = window.innerWidth;
      const H = window.innerHeight;

      const el = document.createElement("div");
      el.className = "firefly";
      el.style.opacity = "0";
      layer.appendChild(el);

      // Random off-screen entry / exit points + a home region to loiter around.
      const edge = () => {
        const side = Math.floor(Math.random() * 4);
        if (side === 0) return { x: Math.random() * W, y: -40 };
        if (side === 1) return { x: W + 40, y: Math.random() * H };
        if (side === 2) return { x: Math.random() * W, y: H + 40 };
        return { x: -40, y: Math.random() * H };
      };
      const hx = W * (0.18 + Math.random() * 0.64);
      const hy = H * (0.16 + Math.random() * 0.54);
      const wander = () => ({
        x: hx + (Math.random() - 0.5) * W * 0.24,
        y: hy + (Math.random() - 0.5) * H * 0.24,
      });

      // enter → 4 loiter points → exit. Slow, dreamy drift (~30s total).
      const pts = [edge(), wander(), wander(), wander(), wander(), edge()];
      const segs = [4600, 6000, 6600, 5800, 7200].map((d) => d * (0.85 + Math.random() * 0.3));
      const total = segs.reduce((a, b) => a + b, 0);
      const cum = [0];
      segs.forEach((d, i) => cum.push(cum[i] + d));

      const freq = 0.85 + Math.random() * 0.7;
      const amp = 9 + Math.random() * 11;
      const phase = Math.random() * Math.PI * 2;
      const sc = 0.8 + Math.random() * 0.55;
      const start = performance.now();

      const step = (now: number) => {
        if (!alive || el.parentNode !== layer) return;
        const e = now - start;
        if (e >= total) {
          el.remove();
          return;
        }
        let si = 0;
        while (si < segs.length - 1 && e >= cum[si + 1]) si++;
        const lt = smooth((e - cum[si]) / segs[si]);
        const a = pts[si];
        const b = pts[si + 1];
        const x = a.x + (b.x - a.x) * lt + Math.sin((e / 1000) * freq + phase) * amp;
        const y = a.y + (b.y - a.y) * lt + Math.cos((e / 1000) * freq * 0.8 + phase) * amp * 0.7;
        // fade in (1.2s) · flicker · fade out (last 1.8s)
        const fin = Math.min(1, e / 1200);
        const fout = Math.min(1, (total - e) / 1800);
        const flick = 0.62 + 0.38 * Math.sin((e / 1000) * 4 + phase);
        el.style.opacity = String(Math.max(0, fin * fout * flick));
        el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${sc.toFixed(2)})`;
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const spawnWave = () => {
      if (!alive) return;
      for (let i = 0; i < FLOCK_SIZE; i++) {
        timers.push(window.setTimeout(spawnFirefly, i * (350 + Math.random() * 450)));
      }
      timers.push(window.setTimeout(spawnWave, WAVE_GAP_MS));
    };

    // First flock a few seconds after night falls.
    timers.push(window.setTimeout(spawnWave, 3500 + Math.random() * 2500));

    return () => {
      alive = false;
      timers.forEach((t) => clearTimeout(t));
      layer.innerHTML = "";
    };
  }, [resolvedTheme]);

  return <div ref={ref} className="night-fireflies" aria-hidden="true" />;
}
