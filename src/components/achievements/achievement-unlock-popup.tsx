"use client";

/**
 * Global achievement unlock UI. Mount once near the root of the (learn)
 * layout; call `triggerAchievementUnlock(achievement)` from anywhere to
 * fire the celebration.
 *
 * What it does on trigger:
 *   1. Web Audio synth plays the cavalry fanfare ("tù tù tút tù tu") —
 *      no audio file needed, ships with zero asset weight.
 *   2. Full-screen overlay with the badge medal scaling in + spinning,
 *      confetti raining behind, the danh hiệu title + name + description.
 *   3. After 4.5s OR a click, fades out. If multiple unlocks queue,
 *      they play one after another (chain) so all medals get airtime.
 *
 * Trigger pattern: API responses include `unlocked: Achievement[]` —
 * any caller code does:
 *   import { triggerAchievementUnlock } from "./achievement-unlock-popup";
 *   res.unlocked.forEach(triggerAchievementUnlock);
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Achievement } from "@/lib/achievements/catalog";
import * as Icons from "lucide-react";

/** Shared queue + bus. Lives at module scope so any client component can
 *  push without going through a context provider. */
const queue: Achievement[] = [];
const subscribers = new Set<() => void>();

export function triggerAchievementUnlock(a: Achievement): void {
  queue.push(a);
  subscribers.forEach((fn) => fn());
}

/** Cavalry fanfare via Web Audio API — 6 notes, brass-ish square wave
 *  with a quick attack envelope. Total length ~1.2s. The user's literal
 *  request was "tù tù tút tù tu" so we shape it as G-G-D-G-D (rising
 *  triumphant motif).
 *
 *  Each note: short attack (5ms) → sustain (~150ms) → release (~50ms).
 *  Square wave with a touch of triangle adds the brassy edge without
 *  needing a sample. */
function playFanfare(): void {
  if (typeof window === "undefined") return;
  // Lazy-resolve AudioContext (Safari prefix).
  type AudioContextCtor = new () => AudioContext;
  const W = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  const Ctor = W.AudioContext || W.webkitAudioContext;
  if (!Ctor) return;
  const ctx = new Ctor();
  // Cavalry charge motif on G major: G G G D5 G D5 — staccato + final
  // sustained note. Notes are MIDI numbers.
  const notes: Array<[midi: number, durSec: number, accent?: number]> = [
    [67, 0.14],        // G4 "tù"
    [67, 0.14],        // G4 "tù"
    [74, 0.22, 1.2],   // D5 "tút" (slightly louder)
    [67, 0.14],        // G4 "tù"
    [74, 0.45, 1.3],   // D5 "tu—" (sustained finale)
  ];
  const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
  let t = ctx.currentTime + 0.02;
  const gap = 0.05; // brief silence between notes for staccato feel
  for (const [midi, dur, accent = 1] of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    // Square wave = brassy/trumpet-ish; mix with a sine for body.
    osc.type = "square";
    osc.frequency.value = midiToHz(midi);
    // ADSR envelope: peak ~0.12, quick attack, brief sustain, smooth release.
    const peak = 0.14 * accent;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.005);
    gain.gain.linearRampToValueAtTime(peak * 0.7, t + dur * 0.6);
    gain.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    t += dur + gap;
  }
  // Close the context after the fanfare finishes so we don't leak audio
  // graph nodes across many unlocks.
  window.setTimeout(() => ctx.close().catch(() => {}), 2000);
}

/** Confetti dots positioned with random CSS — pure CSS animation, no lib. */
function ConfettiBurst() {
  // 40 pieces, deterministic positions per render so React keys are stable.
  const pieces = Array.from({ length: 40 }, (_, i) => {
    const angle = (i / 40) * Math.PI * 2;
    const radius = 35 + (i * 13) % 40; // vh out from centre
    const dx = Math.cos(angle) * radius;
    const dy = Math.sin(angle) * radius - 10;
    const colors = ["#eda21d", "#3fa24c", "#e11d48", "#7c3aed", "#0284c7", "#facc15"];
    const color = colors[i % colors.length];
    const delay = (i * 17) % 350;
    return { dx, dy, color, delay, rotate: (i * 29) % 360 };
  });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute left-1/2 top-1/2 h-2 w-2 rounded-sm"
          style={{
            backgroundColor: p.color,
            animation: `achv-confetti 1.5s ease-out forwards`,
            animationDelay: `${p.delay}ms`,
            // Use CSS vars so the keyframe can read the destination.
            ["--dx" as string]: `${p.dx}vh`,
            ["--dy" as string]: `${p.dy}vh`,
            ["--rot" as string]: `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  );
}

interface PopupState {
  achievement: Achievement;
  closing: boolean;
}

export function AchievementUnlockProvider() {
  const [state, setState] = useState<PopupState | null>(null);
  const playingRef = useRef(false);
  // Pull from the global queue. When something arrives + we're not
  // already playing, start the next celebration.
  const pump = () => {
    if (playingRef.current) return;
    const next = queue.shift();
    if (!next) return;
    playingRef.current = true;
    playFanfare();
    setState({ achievement: next, closing: false });
    // Auto-close after 4.5s.
    window.setTimeout(() => setState((p) => (p ? { ...p, closing: true } : p)), 4000);
    window.setTimeout(() => {
      setState(null);
      playingRef.current = false;
      pump();
    }, 4500);
  };

  useEffect(() => {
    subscribers.add(pump);
    // Drain anything already queued at mount.
    pump();
    return () => {
      subscribers.delete(pump);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!state) return null;
  const a = state.achievement;
  const Icon =
    ((Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
      iconKeyToLucide(a.iconKey)
    ]) || Icons.Award;
  return (
    <>
      {/* Keyframes injected inline so the component is self-contained.
          Tailwind doesn't ship the random-trajectory confetti animation. */}
      <style>{`
        @keyframes achv-confetti {
          0% { transform: translate(-50%, -50%) rotate(0deg); opacity: 1; }
          100% {
            transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) rotate(var(--rot));
            opacity: 0;
          }
        }
        @keyframes achv-medal-in {
          0% { transform: scale(0) rotate(-180deg); opacity: 0; }
          60% { transform: scale(1.15) rotate(15deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes achv-title-in {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes achv-ring {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>
      <div
        className={cn(
          "fixed inset-0 z-[100] grid place-items-center bg-black/70 backdrop-blur-sm transition-opacity duration-500",
          state.closing ? "opacity-0" : "opacity-100",
        )}
        onClick={() => setState((p) => (p ? { ...p, closing: true } : p))}
      >
        <ConfettiBurst />
        <div className="relative grid place-items-center text-center px-6">
          {/* Medal */}
          <div
            className="relative grid h-32 w-32 sm:h-40 sm:w-40 place-items-center rounded-full shadow-2xl"
            style={{
              backgroundImage: `linear-gradient(135deg, var(--accent-light), var(--accent-dark))`,
              animation: "achv-medal-in 700ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
              ["--accent-light" as string]: colorStops(a.color).light,
              ["--accent-dark" as string]: colorStops(a.color).dark,
            }}
          >
            {/* Pulsing ring */}
            <span
              className="absolute inset-0 rounded-full border-4"
              style={{
                borderColor: colorStops(a.color).dark,
                animation: "achv-ring 1.4s ease-out infinite",
              }}
            />
            <Icon className="h-16 w-16 sm:h-20 sm:w-20 text-white drop-shadow-md" />
          </div>
          {/* Title block */}
          <div
            className="mt-6 space-y-1"
            style={{ animation: "achv-title-in 600ms ease-out 200ms both" }}
          >
            <p className="text-xs sm:text-sm uppercase tracking-widest font-bold text-honey">
              Mở khoá danh hiệu
            </p>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-white drop-shadow-md">
              {a.title}
            </h2>
            <p className="text-base sm:text-lg font-bold text-white/90">{a.name}</p>
            <p className="text-xs sm:text-sm text-white/70 max-w-md mx-auto pt-1">
              {a.description}
            </p>
          </div>
          <p className="mt-6 text-xs text-white/50">bấm để bỏ qua</p>
        </div>
      </div>
    </>
  );
}

/** Map our short icon keys to Lucide component names. We use kebab-case
 *  in the catalog (closer to lucide's website search) but Lucide exports
 *  use PascalCase. */
function iconKeyToLucide(key: string): string {
  return key
    .split("-")
    .map((s) => s[0]?.toUpperCase() + s.slice(1))
    .join("");
}

/** Two-stop gradient for the badge background. Maps catalog color names
 *  to concrete hex stops so designers can change the palette in one
 *  place. Light = inner highlight, Dark = outer shadow. */
function colorStops(color: string): { light: string; dark: string } {
  const map: Record<string, { light: string; dark: string }> = {
    amber: { light: "#fde68a", dark: "#b45309" },
    rose: { light: "#fda4af", dark: "#9f1239" },
    violet: { light: "#c4b5fd", dark: "#5b21b6" },
    sky: { light: "#7dd3fc", dark: "#075985" },
    emerald: { light: "#6ee7b7", dark: "#065f46" },
  };
  return map[color] ?? map.amber;
}
