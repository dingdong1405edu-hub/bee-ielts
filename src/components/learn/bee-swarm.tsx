"use client";
import { useEffect, useRef } from "react";

/**
 * A small flock of bees that drifts diagonally across the screen — the same
 * critters as the index.html hero, but rare (every ~2–5 minutes) so it reads as
 * a delightful flourish, not a distraction. Fixed, pointer-events-none, behind
 * the chrome. Disabled for prefers-reduced-motion (handled in CSS too).
 */
function beeMarkup(id: string) {
  return (
    `<svg viewBox="0 0 36 26">` +
    `<ellipse class="wg a" cx="15" cy="9" rx="7" ry="4.2"/>` +
    `<ellipse class="wg b" cx="20" cy="8.5" rx="6" ry="3.6"/>` +
    `<ellipse cx="17" cy="15" rx="11" ry="7" fill="#1d1407"/>` +
    `<g clip-path="url(#${id})">` +
    `<rect x="9" y="8" width="4" height="14" fill="#f7b500"/>` +
    `<rect x="16" y="8" width="4" height="14" fill="#f7b500"/>` +
    `<rect x="23" y="8" width="3.6" height="14" fill="#f7b500"/>` +
    `</g>` +
    `<circle cx="29" cy="14" r="4.4" fill="#1d1407"/>` +
    `<path d="M30 11 q3 -3 4 -5 M32 11 q3 -2 5 -3" stroke="#1d1407" stroke-width="1" fill="none" stroke-linecap="round"/>` +
    `<defs><clipPath id="${id}"><ellipse cx="17" cy="15" rx="11" ry="7"/></clipPath></defs>` +
    `</svg>`
  );
}

export function BeeSwarm() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layer = ref.current;
    if (!layer) return;

    let alive = true;
    let beeId = 0;
    let timer = 0;

    const spawnSwarm = () => {
      if (!alive) return;
      const W = window.innerWidth;
      const H = window.innerHeight;
      // fly from bottom-left to top-right (like the index hero)
      const x0 = -40, y0 = H + 40, x1 = W + 40, y1 = -40;
      const dx = x1 - x0, dy = y1 - y0;
      const len = Math.hypot(dx, dy);
      const px = -dy / len, py = dx / len; // perpendicular (for the weave)
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      const count = 5 + Math.floor(Math.random() * 3); // 5–7 bees
      const baseDur = 8200 + Math.random() * 2600;

      for (let i = 0; i < count; i++) {
        const bee = document.createElement("div");
        bee.className = "fly-bee";
        bee.innerHTML = beeMarkup("bsw" + beeId++);
        bee.style.opacity = "0";
        layer.appendChild(bee);

        const spread = (i - (count - 1) / 2) * 22 + (Math.random() - 0.5) * 26;
        const amp = 16 + Math.random() * 22;
        const freq = 1.3 + Math.random() * 1.3;
        const phase = Math.random() * Math.PI * 2;
        const dur = baseDur * (0.85 + Math.random() * 0.3);
        const delay = i * (150 + Math.random() * 150);
        const sc = 0.7 + Math.random() * 0.4;
        const start = performance.now() + delay;

        const fly = (now: number) => {
          if (!alive) {
            bee.remove();
            return;
          }
          const t = (now - start) / dur;
          if (t < 0) {
            requestAnimationFrame(fly);
            return;
          }
          if (t > 1) {
            bee.remove();
            return;
          }
          if (bee.style.opacity !== "1") bee.style.opacity = "1";
          const bx = x0 + t * dx;
          const by = y0 + t * dy;
          const wob = Math.sin(t * Math.PI * 2 * freq + phase) * amp;
          const X = bx + px * (spread + wob);
          const Y = by + py * (spread + wob);
          const tilt = Math.cos(t * Math.PI * 2 * freq + phase) * 8;
          bee.style.transform = `translate(${X.toFixed(1)}px,${Y.toFixed(1)}px) rotate(${(angle + tilt).toFixed(1)}deg) scale(${sc.toFixed(2)})`;
          requestAnimationFrame(fly);
        };
        requestAnimationFrame(fly);
      }

      // schedule the next flock RARELY: ~2–5 minutes
      timer = window.setTimeout(spawnSwarm, 120000 + Math.random() * 180000);
    };

    // first flock a little after landing
    timer = window.setTimeout(spawnSwarm, 22000 + Math.random() * 25000);

    return () => {
      alive = false;
      window.clearTimeout(timer);
      if (layer) layer.innerHTML = "";
    };
  }, []);

  return <div ref={ref} className="bee-swarm" aria-hidden="true" />;
}
