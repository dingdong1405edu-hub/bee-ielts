"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Sparkles, X, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * BeeGuide — an animated 🐝 mascot that tours the learner through band-climb
 * reading tips before they start a practice test. Each step optionally
 * focuses on a DOM element marked with `data-tour="<key>"`: the rest of the
 * screen dims while that element stays bright, and the bee flies over to
 * point at it with a speech bubble. The last step calls `onFinish()` which
 * the parent uses to dismiss the overlay and let the test begin.
 */

export interface TourStep {
  /** data-tour key of the element to highlight, or "center" for a centred message. */
  target: string | "center";
  /** When set, BeeGuide looks up `[data-question-id="..."]` in the DOM and
   *  spotlights that specific question card — overrides `target`. */
  targetQuestionId?: string | null;
  title: string;
  /** Short paragraph (plain text — newlines render as <br/>). */
  body: string;
  /** Extra side-cards rendered under the body (e.g. example keywords). */
  highlights?: { label: string; items: string[] }[];
  /** Override for the primary action button label on this step. */
  ctaLabel?: string;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const SPOTLIGHT_PAD = 12;

export function BeeGuide({
  steps,
  onFinish,
}: {
  steps: TourStep[];
  onFinish: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  // Typewriter: body text reveals character-by-character so the learner has
  // a beat to absorb each line — feels like Bee is actually saying it.
  const [bodyShown, setBodyShown] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const step = steps[idx];
  const isCenter = step.target === "center";
  const isLast = idx === steps.length - 1;

  // Restart the typewriter every time the step changes.
  useEffect(() => {
    setBodyShown("");
    setIsTyping(true);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setBodyShown(step.body.slice(0, i));
      if (i >= step.body.length) {
        clearInterval(id);
        setIsTyping(false);
      }
    }, 22);
    return () => clearInterval(id);
  }, [idx, step.body]);

  // Lock body scroll while the tour is active.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Resolve target element rect on every step change + window resize.
  useLayoutEffect(() => {
    const measure = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setViewport({ w, h });
      if (isCenter) {
        setRect(null);
        return;
      }
      // Question-specific targets take priority — they let admins point at
      // an exact question card via its DB id.
      const el = step.targetQuestionId
        ? document.querySelector<HTMLElement>(`[data-question-id="${step.targetQuestionId}"]`)
        : document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (!el) {
        setRect(null);
        return;
      }
      // Scroll the target into view so the spotlight sits comfortably on screen.
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      // Defer measurement until smooth-scroll likely finishes.
      setTimeout(() => {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      }, 320);
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [idx, isCenter, step.target, step.targetQuestionId]);

  const next = () => {
    if (isLast) {
      onFinish();
      return;
    }
    setIdx((i) => Math.min(i + 1, steps.length - 1));
  };
  const prev = () => setIdx((i) => Math.max(i - 1, 0));

  // Tap anywhere on the overlay to advance. If the typewriter is still
  // running, the first tap completes the line; the next tap advances.
  const handleOverlayTap = () => {
    if (isTyping) {
      setBodyShown(step.body);
      setIsTyping(false);
      return;
    }
    next();
  };

  // Bee + bubble target position. We prefer placing the bubble to the SIDE
  // (left or right) of the spotlight so it never covers the highlighted
  // area itself — that was the complaint from the screenshot. Falls back
  // to below / above only when neither side has room (narrow screens).
  const BUBBLE_W = 380;
  const BUBBLE_H_GUESS = 360;
  const GAP = 24;
  const beePos = (() => {
    const { w, h } = viewport;
    if (!rect) return { x: w / 2 - BUBBLE_W / 2, y: h / 2 - BUBBLE_H_GUESS / 2 };
    const padded = {
      top: rect.top - SPOTLIGHT_PAD,
      left: rect.left - SPOTLIGHT_PAD,
      width: rect.width + SPOTLIGHT_PAD * 2,
      height: rect.height + SPOTLIGHT_PAD * 2,
    };
    const spaceLeft = padded.left;
    const spaceRight = w - (padded.left + padded.width);
    const spaceBelow = h - (padded.top + padded.height);
    const spaceAbove = padded.top;
    // Vertically center the bubble next to the spotlight, clamped to viewport.
    const sideY = Math.max(
      16,
      Math.min(h - BUBBLE_H_GUESS - 16, padded.top + padded.height / 2 - BUBBLE_H_GUESS / 2),
    );

    // 1) Right side — preferred so the bee reads left-to-right alongside the
    //    highlighted card and feels like an examiner pointing in.
    if (spaceRight >= BUBBLE_W + GAP) {
      return { x: padded.left + padded.width + GAP, y: sideY };
    }
    // 2) Left side
    if (spaceLeft >= BUBBLE_W + GAP) {
      return { x: padded.left - BUBBLE_W - GAP, y: sideY };
    }
    // 3) Below
    if (spaceBelow >= BUBBLE_H_GUESS + GAP) {
      return {
        x: Math.max(16, Math.min(w - BUBBLE_W - 16, padded.left + padded.width / 2 - BUBBLE_W / 2)),
        y: padded.top + padded.height + GAP,
      };
    }
    // 4) Above (last resort)
    return {
      x: Math.max(16, Math.min(w - BUBBLE_W - 16, padded.left + padded.width / 2 - BUBBLE_W / 2)),
      y: Math.max(16, padded.top - Math.min(BUBBLE_H_GUESS, spaceAbove - GAP) - GAP),
    };
  })();

  return (
    <div
      ref={containerRef}
      onClick={handleOverlayTap}
      className="fixed inset-0 z-[120] cursor-pointer"
      role="button"
      tabIndex={-1}
      aria-label="Tap để tiếp tục hướng dẫn"
    >
      {/* Spotlight backdrop — 4 dark rectangles around the target so the
          target area stays fully transparent. When no target, single full
          backdrop. */}
      {rect ? (
        <SpotlightBackdrop rect={rect} pad={SPOTLIGHT_PAD} viewport={viewport} />
      ) : (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      )}

      {/* Highlight ring around the target */}
      {rect && (
        <motion.div
          className="absolute rounded-2xl pointer-events-none ring-4 ring-yellow-300/80 shadow-[0_0_0_4px_rgba(250,204,21,0.25),0_0_60px_8px_rgba(250,204,21,0.45)]"
          initial={false}
          animate={{
            top: rect.top - SPOTLIGHT_PAD,
            left: rect.left - SPOTLIGHT_PAD,
            width: rect.width + SPOTLIGHT_PAD * 2,
            height: rect.height + SPOTLIGHT_PAD * 2,
          }}
          transition={{ type: "spring", stiffness: 220, damping: 28 }}
        />
      )}

      {/* Skip button — stopPropagation so the overlay-tap doesn't also fire. */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onFinish();
        }}
        className="absolute top-4 right-4 z-10 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-zinc-700 shadow-lg hover:bg-white cursor-pointer"
      >
        <X className="h-3.5 w-3.5" /> Bỏ qua hướng dẫn
      </button>

      {/* Hint pill: tap to advance */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-bold text-zinc-700 shadow">
        {isTyping ? "Tap để hiện hết câu" : "Tap để tiếp tục →"}
      </div>

      {/* Bee + speech bubble — animated as one cluster */}
      <motion.div
        className="absolute z-10"
        initial={false}
        animate={{ x: beePos.x, y: beePos.y }}
        transition={{ type: "spring", stiffness: 130, damping: 18, mass: 0.9 }}
        style={{ width: 380, maxWidth: "calc(100vw - 32px)" }}
      >
        <div className="flex items-end gap-2">
          <Bee />
          <SpeechBubble>
            <div
              className="overflow-y-auto pr-1"
              style={{ maxHeight: "min(60vh, 480px)" }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="text-[11px] font-bold uppercase tracking-wider text-primary inline-flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Bước {idx + 1} / {steps.length}
                  </div>
                  <h3 className="text-base md:text-lg font-extrabold tracking-tight mt-0.5">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-foreground/90 mt-1 whitespace-pre-line min-h-[3em]">
                    {bodyShown}
                    {isTyping && (
                      <span className="inline-block w-[2px] h-[1em] ml-0.5 bg-foreground/70 align-text-bottom animate-pulse" />
                    )}
                  </p>
                  {step.highlights?.map((h, i) => (
                    <div
                      key={i}
                      className="mt-3 rounded-xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-yellow-100 px-3.5 py-2.5 shadow-md shadow-amber-200/60"
                    >
                      <div className="text-xs font-extrabold uppercase tracking-wider text-amber-700 inline-flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-amber-600" /> {h.label}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {h.items.map((it, k) => (
                          <motion.span
                            key={it}
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.08 * k, type: "spring", stiffness: 320, damping: 18 }}
                            className="inline-flex items-center rounded-lg bg-gradient-to-br from-yellow-300 to-amber-400 px-2.5 py-1 text-sm font-extrabold text-amber-950 shadow-sm shadow-amber-400/40 ring-1 ring-amber-500/40"
                            style={{ animation: "bee-keyword-pulse 2.4s ease-in-out infinite" }}
                          >
                            {it}
                          </motion.span>
                        ))}
                      </div>
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                disabled={idx === 0}
                variant="ghost"
                size="sm"
                className="text-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Trước
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                size="sm"
                className="text-xs font-bold shadow-md shadow-primary/20"
              >
                {step.ctaLabel ?? (isLast ? "Bắt đầu làm bài" : "Tiếp")}
                {isLast ? (
                  <Play className="h-3.5 w-3.5" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </SpeechBubble>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Four dark rectangles around the spotlight — leaves the target area fully
 * transparent so the user can still read the highlighted content while
 * everything else dims.
 */
function SpotlightBackdrop({
  rect,
  pad,
  viewport,
}: {
  rect: Rect;
  pad: number;
  viewport: { w: number; h: number };
}) {
  const top = Math.max(0, rect.top - pad);
  const left = Math.max(0, rect.left - pad);
  const bottom = Math.min(viewport.h, rect.top + rect.height + pad);
  const right = Math.min(viewport.w, rect.left + rect.width + pad);
  const cls = "absolute bg-black/70 backdrop-blur-[2px]";
  return (
    <>
      {/* Top */}
      <div className={cls} style={{ top: 0, left: 0, width: viewport.w, height: top }} />
      {/* Bottom */}
      <div
        className={cls}
        style={{ top: bottom, left: 0, width: viewport.w, height: Math.max(0, viewport.h - bottom) }}
      />
      {/* Left */}
      <div className={cls} style={{ top, left: 0, width: left, height: bottom - top }} />
      {/* Right */}
      <div
        className={cls}
        style={{ top, left: right, width: Math.max(0, viewport.w - right), height: bottom - top }}
      />
    </>
  );
}

/**
 * Animated bee mascot. Uses /bee-mascot.png if the admin has dropped a
 * custom mascot image into `public/`; otherwise renders the 🐝 emoji
 * inside a yellow gradient circle. The wing flap + idle hover animations
 * are applied to whichever variant renders.
 */
function Bee() {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <motion.div
      animate={{ y: [0, -8, 0], rotate: [-3, 3, -3] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      className="relative shrink-0"
      style={{ width: 72, height: 72 }}
    >
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 0.35, repeat: Infinity, ease: "easeInOut" }}
        className="h-18 w-18 drop-shadow-lg"
        style={{ width: 72, height: 72 }}
      >
        {imgFailed ? (
          <div className="grid h-full w-full place-items-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-4xl shadow-lg shadow-amber-500/40">
            🐝
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/bee-mascot.png"
            alt="Bee"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-contain"
          />
        )}
      </motion.div>
      {/* Trail dots */}
      <motion.span
        className="absolute -bottom-1 left-1 h-1.5 w-1.5 rounded-full bg-amber-300/80"
        animate={{ opacity: [0.8, 0, 0.8] }}
        transition={{ duration: 1.4, repeat: Infinity }}
      />
      <motion.span
        className="absolute -bottom-1 left-4 h-1 w-1 rounded-full bg-amber-300/60"
        animate={{ opacity: [0.6, 0, 0.6] }}
        transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }}
      />
    </motion.div>
  );
}

/** White card with an arrow-tip pointing left (towards the bee). */
function SpeechBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex-1 rounded-2xl bg-white text-zinc-900 p-4 shadow-xl shadow-black/30 border border-zinc-200">
      {/* Tail */}
      <div className="absolute -left-2 bottom-6 h-4 w-4 rotate-45 bg-white border-l border-b border-zinc-200" />
      {children}
    </div>
  );
}
