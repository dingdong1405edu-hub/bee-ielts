"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Sparkles, X, Play, Plus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BeeMascot } from "@/components/brand";

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

/**
 * Build a regex pattern string that matches each anchor word the admin
 * authored, with one critical accommodation: for "number-like" keywords
 * (e.g. `60000`) the pattern matches the same digits with ANY thousand
 * separator (`60,000`, `60.000`, `60 000`). IELTS passages routinely use
 * comma/period thousand-separators that admins rarely type when listing
 * từ neo — without this, "60000" would silently fail to highlight even
 * though "60,000" sits in the passage.
 *
 * Returns null when no usable keywords remain. The pattern is wrapped by
 * the caller as `(${pattern})` and used with the `gi` flag.
 */
function buildAnchorPattern(rawWords: string[]): string | null {
  const words = rawWords.map((w) => w.trim()).filter((w) => w.length > 0);
  if (!words.length) return null;
  const patterns = words
    .map((w) => {
      // Number-like: digits possibly with separators (`,` `.` or space).
      // Strip separators and rebuild a pattern that allows any of them
      // (or none) between every digit. Min 2 digits so single digits
      // don't match wildly inside other numbers.
      const stripped = w.replace(/[,.\s]/g, "");
      if (/^\d+$/.test(stripped) && stripped.length >= 2) {
        return stripped.split("").join("[,.\\s]?");
      }
      return w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .sort((a, b) => b.length - a.length); // longer first so multi-word phrases beat substrings
  return patterns.join("|");
}

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

  const step = steps[idx];
  const isCenter = step.target === "center";
  const isLast = idx === steps.length - 1;

  // Lock body scroll while the tour is active.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Highlight matching anchor words inside the spotlight target (or whole
  // document when no target) by wrapping each match in <mark class="bee-anchor">.
  // Cleanup on step change so the previous step's marks don't leak.
  useEffect(() => {
    const words = (step.highlights ?? []).flatMap((h) => h.items).filter((w) => w.trim().length > 0);
    if (words.length === 0) return;

    // Falls back to document.body so anchor words still surface even if the
    // admin picked a target that doesn't exist on the current page (e.g.
    // "passage" while previewing a Writing test). Without this fallback the
    // 🐝 từ-neo chip was being shown but the actual word in the passage
    // wasn't being highlighted — the bug screenshot the user pointed out.
    const root = step.targetQuestionId
      ? document.querySelector<HTMLElement>(`[data-question-id="${step.targetQuestionId}"]`)
      : step.target && step.target !== "center"
        ? (document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) ?? document.body)
        : document.body;
    if (!root) return;

    const pattern = buildAnchorPattern(words);
    if (!pattern) return;

    // Walk text nodes inside `root`, skipping any already-marked nodes and
    // anything inside the BeeGuide overlay itself.
    const overlay = containerRef.current;
    const created: HTMLElement[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (overlay && overlay.contains(parent)) return NodeFilter.FILTER_REJECT;
        if (parent.closest("mark.bee-anchor")) return NodeFilter.FILTER_REJECT;
        // Skip <script>/<style>/inputs and any control element.
        const tag = parent.tagName;
        if (["SCRIPT", "STYLE", "INPUT", "TEXTAREA"].includes(tag)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    // Collect candidate nodes first — mutating during traversal breaks the walker.
    const targets: Text[] = [];
    let n: Node | null = walker.nextNode();
    while (n) {
      targets.push(n as Text);
      n = walker.nextNode();
    }
    for (const textNode of targets) {
      const text = textNode.nodeValue ?? "";
      const localRe = new RegExp(`(${pattern})`, "gi");
      // Fast reject — most text nodes don't contain anchor words.
      if (!localRe.test(text)) continue;
      localRe.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = localRe.exec(text))) {
        const before = text.slice(last, m.index);
        if (before) frag.appendChild(document.createTextNode(before));
        const mark = document.createElement("mark");
        mark.className =
          "bee-anchor rounded px-1 py-0.5 bg-gold-200/90 text-gold-900 font-extrabold ring-1 ring-gold-400/60 shadow-sm";
        mark.textContent = m[0];
        frag.appendChild(mark);
        created.push(mark);
        last = m.index + m[0].length;
        // Avoid infinite loop on zero-width matches (shouldn't happen for
        // our patterns, but a defensive guard).
        if (m[0].length === 0) localRe.lastIndex++;
      }
      const after = text.slice(last);
      if (after) frag.appendChild(document.createTextNode(after));
      textNode.parentNode?.replaceChild(frag, textNode);
    }

    return () => {
      // Unwrap each mark we created — replace with a plain text node.
      for (const mark of created) {
        if (!mark.parentNode) continue;
        const text = document.createTextNode(mark.textContent ?? "");
        mark.parentNode.replaceChild(text, mark);
      }
    };
  }, [idx, step.target, step.targetQuestionId, step.highlights]);

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

  // Tap anywhere on the overlay to advance the tour. Buttons inside the
  // bubble stopPropagation so they don't double-fire.
  const handleOverlayTap = () => {
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
          className="absolute rounded-2xl pointer-events-none ring-4 ring-gold-300/80 shadow-[0_0_0_4px_rgba(250,204,21,0.25),0_0_60px_8px_rgba(250,204,21,0.45)]"
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
        className="absolute top-4 right-4 z-10 inline-flex items-center gap-1 rounded-full bg-card/90 px-3 py-1.5 text-xs font-bold text-foreground shadow-lg hover:bg-card cursor-pointer"
      >
        <X className="h-3.5 w-3.5" /> Bỏ qua hướng dẫn
      </button>

      {/* Hint pill: tap to advance */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none rounded-full bg-card/90 px-3 py-1.5 text-[11px] font-bold text-foreground shadow">
        Tap để tiếp tục →
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
                  <h3 className="text-lg md:text-xl font-extrabold tracking-tight mt-0.5 text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-[15px] md:text-base leading-relaxed text-foreground mt-1.5 whitespace-pre-line min-h-[3em]">
                    <TypewriterText
                      text={step.body}
                      boldWords={(step.highlights ?? []).flatMap((h) => h.items)}
                    />
                  </p>
                  {step.highlights?.map((h, i) => (
                    <div
                      key={i}
                      className="mt-3 rounded-xl border-2 border-gold-400 bg-gradient-to-br from-gold-50 to-gold-100 px-3.5 py-2.5 shadow-md shadow-gold-200/60"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-xs font-extrabold uppercase tracking-wider text-gold-700 inline-flex items-center gap-1">
                          <Sparkles className="h-3.5 w-3.5 text-gold-600" /> {h.label}
                        </div>
                        <div className="text-[10px] font-bold text-gold-700/70 inline-flex items-center gap-1">
                          <Plus className="h-3 w-3" /> Bấm để thêm vào từ vựng
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {h.items.map((it, k) => (
                          <AnchorChip
                            key={it}
                            term={it}
                            delayIndex={k}
                          />
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
 * Animated bee mascot. Renders the shared <BeeMascot> (which serves
 * /bee-mascot.jpg with an automatic cute SVG fallback when the file is
 * missing). The wing flap + idle hover animations wrap whatever it renders.
 */
function Bee() {
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
        <BeeMascot priority frame="circle" className="h-full w-full" />
      </motion.div>
      {/* Trail dots */}
      <motion.span
        className="absolute -bottom-1 left-1 h-1.5 w-1.5 rounded-full bg-gold-300/80"
        animate={{ opacity: [0.8, 0, 0.8] }}
        transition={{ duration: 1.4, repeat: Infinity }}
      />
      <motion.span
        className="absolute -bottom-1 left-4 h-1 w-1 rounded-full bg-gold-300/60"
        animate={{ opacity: [0.6, 0, 0.6] }}
        transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }}
      />
    </motion.div>
  );
}

/** White card with an arrow-tip pointing left (towards the bee). */
function SpeechBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex-1 rounded-2xl bg-card text-card-foreground p-4 shadow-xl shadow-black/30 border border-border">
      {/* Tail */}
      <div className="absolute -left-2 bottom-6 h-4 w-4 rotate-45 bg-card border-l border-b border-border" />
      {children}
    </div>
  );
}

/**
 * Character-by-character text reveal. Lives as its own component so its
 * state is tied to the parent <motion.div> mount lifecycle — when the
 * tour advances and AnimatePresence's mode="wait" exits the old bubble,
 * the old TypewriterText stays mounted (with its already-shown text)
 * until the exit animation finishes. The new TypewriterText mounts
 * fresh inside the new bubble and starts typing from "". This prevents
 * the bug where a parent-level state reset blanked out the exiting
 * bubble during its fade-out.
 */
function TypewriterText({
  text,
  speed = 22,
  boldWords = [],
}: {
  text: string;
  speed?: number;
  /** Words/phrases to render with bold + amber emphasis inside the bubble.
   *  Matches are whole-word, case-insensitive. */
  boldWords?: string[];
}) {
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setShown("");
    setDone(false);
    if (!text) {
      setDone(true);
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return (
    <>
      <BoldedText text={shown} words={boldWords} />
      {!done && (
        <span className="inline-block w-[2px] h-[1em] ml-0.5 bg-foreground align-text-bottom animate-pulse" />
      )}
    </>
  );
}

/** Replace case-insensitive matches of any `words` entry inside `text` with
 *  a bold + amber span. Reuses the same number-flexible pattern builder as
 *  the passage walker, so a "60000" keyword highlights "60,000" inside the
 *  bubble text too — keeping bubble + passage emphasis perfectly aligned. */
function BoldedText({ text, words }: { text: string; words: string[] }) {
  if (!words.length || !text) return <>{text}</>;
  const pattern = buildAnchorPattern(words);
  if (!pattern) return <>{text}</>;
  // String.split with a capturing group keeps the matches as alternating
  // entries in the resulting array.
  const re = new RegExp(`(${pattern})`, "gi");
  const parts = text.split(re);
  // Build a non-global test regex so per-part testing stays stateless.
  const testRe = new RegExp(`^(?:${pattern})$`, "i");
  return (
    <>
      {parts.map((p, i) =>
        p && testRe.test(p) ? (
          <strong
            key={i}
            className="font-extrabold text-gold-700 bg-gold-100 rounded px-1 py-0.5"
          >
            {p}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/**
 * Clickable từ-neo chip — taps once to push the word into the learner's
 * personal vocabulary deck via /api/words/quick-add. Self-contained state
 * machine: idle → loading → added (terminal). The terminal state stays so
 * the learner sees a green check on every chip they already saved without
 * us having to roundtrip state up to the BeeGuide parent.
 *
 * stopPropagation is critical because the BeeGuide overlay swallows clicks
 * to advance the tour — without it, tapping a chip would also flip to the
 * next step.
 */
function AnchorChip({ term, delayIndex }: { term: string; delayIndex: number }) {
  const [state, setState] = useState<"idle" | "loading" | "added">("idle");

  const add = async () => {
    if (state !== "idle") return;
    setState("loading");
    try {
      const res = await fetch("/api/words/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lưu thất bại");
      setState("added");
      const linkLabel = data.existed ? "Mở bộ thẻ" : "Mở bộ thẻ";
      toast.success(
        data.existed
          ? `"${term}" đã có sẵn trong "${data.deckTitle}".`
          : `Đã thêm "${term}" vào "${data.deckTitle}".`,
        {
          action: data.deckId
            ? {
                label: linkLabel,
                onClick: () => {
                  window.location.href = `/words/${data.deckId}`;
                },
              }
            : undefined,
        },
      );
    } catch (e) {
      setState("idle");
      toast.error(e instanceof Error ? e.message : "Thêm từ thất bại");
    }
  };

  return (
    <motion.button
      type="button"
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.08 * delayIndex, type: "spring", stiffness: 320, damping: 18 }}
      onClick={(e) => {
        e.stopPropagation();
        void add();
      }}
      disabled={state === "loading"}
      title={state === "added" ? "Đã thêm vào từ vựng" : `Thêm "${term}" vào học từ`}
      className={`group inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-extrabold shadow-sm ring-1 transition-all ${
        state === "added"
          ? "bg-gradient-to-br from-sage-300 to-sage-400 text-sage-950 shadow-sage-400/40 ring-sage-500/40"
          : "bg-gradient-to-br from-gold-300 to-gold-400 text-gold-950 shadow-gold-400/40 ring-gold-500/40 hover:scale-105 active:scale-95"
      }`}
      style={
        state === "added"
          ? undefined
          : { animation: "bee-keyword-pulse 2.4s ease-in-out infinite" }
      }
    >
      <span>{term}</span>
      <span
        className={`inline-grid h-4 w-4 place-items-center rounded-md ${
          state === "added"
            ? "bg-sage-700/20 text-sage-900"
            : state === "loading"
              ? "bg-gold-700/20 text-gold-900"
              : "bg-gold-700/20 text-gold-900 group-hover:bg-gold-700/40"
        }`}
      >
        {state === "loading" ? (
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
        ) : state === "added" ? (
          <Check className="h-2.5 w-2.5" />
        ) : (
          <Plus className="h-2.5 w-2.5" />
        )}
      </span>
    </motion.button>
  );
}
