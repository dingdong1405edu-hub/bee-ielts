"use client";
import { createContext, useContext, useRef, type ReactNode } from "react";
import { Eraser, Languages } from "lucide-react";
import { cn } from "@/lib/utils";

export type HighlightColor = "yellow" | "green" | "pink";
// "translate" mode: click a word → fetch its Vietnamese gloss from the
// (already-batch-loaded) translation map and show a popup. Coexists with
// the highlight pen toggle — only one mode active at a time.
export type HighlightTool = "none" | HighlightColor | "eraser" | "translate";

export interface Highlight {
  start: number;
  end: number;
  color: HighlightColor;
}

const COLOR_CLASSES: Record<HighlightColor, string> = {
  yellow: "bg-yellow-300/70 dark:bg-yellow-400/60 text-foreground",
  green: "bg-emerald-300/70 dark:bg-emerald-400/60 text-foreground",
  pink: "bg-pink-300/70 dark:bg-pink-400/60 text-foreground",
};

/** Compute absolute character offsets within the container's plain text. */
function getOffsets(range: Range, container: HTMLElement): { start: number; end: number } | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let start = -1;
  let end = -1;
  let node = walker.nextNode() as Text | null;
  while (node) {
    const len = node.data.length;
    if (node === range.startContainer) start = offset + range.startOffset;
    if (node === range.endContainer) end = offset + range.endOffset;
    if (start >= 0 && end >= 0) break;
    offset += len;
    node = walker.nextNode() as Text | null;
  }
  if (start < 0 || end < 0) return null;
  return start <= end ? { start, end } : { start: end, end: start };
}

/**
 * Word-at-point fallback for the case where the user TAPS (no drag-select)
 * with a highlight tool active. We resolve the caret position via
 * caretRangeFromPoint / caretPositionFromPoint (cross-browser shim),
 * expand to the word's whitespace boundaries inside the same text node,
 * and translate to absolute offsets within the container — same offset
 * model the drag-select path uses, so highlights compose cleanly.
 */
function getWordOffsetsAtPoint(
  x: number,
  y: number,
  container: HTMLElement,
): { start: number; end: number } | null {
  // Webkit/Blink: document.caretRangeFromPoint. Firefox: caretPositionFromPoint.
  // We probe both because there's no TS type for either on `document` directly.
  type WithCaret = typeof document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (
      x: number,
      y: number,
    ) => { offsetNode: Node; offset: number } | null;
  };
  const d = document as WithCaret;
  let textNode: Text | null = null;
  let localOffset = 0;
  if (d.caretRangeFromPoint) {
    const range = d.caretRangeFromPoint(x, y);
    if (!range) return null;
    if (range.startContainer.nodeType !== Node.TEXT_NODE) return null;
    textNode = range.startContainer as Text;
    localOffset = range.startOffset;
  } else if (d.caretPositionFromPoint) {
    const pos = d.caretPositionFromPoint(x, y);
    if (!pos || pos.offsetNode.nodeType !== Node.TEXT_NODE) return null;
    textNode = pos.offsetNode as Text;
    localOffset = pos.offset;
  } else {
    return null;
  }
  if (!textNode || !container.contains(textNode)) return null;
  const t = textNode.data;
  if (t.length === 0) return null;
  // Expand to word boundaries — whitespace stops the walk. Punctuation stays
  // attached so e.g. clicking "world." highlights "world." not "world".
  let s = Math.max(0, Math.min(localOffset, t.length));
  let e = s;
  while (s > 0 && /\S/.test(t[s - 1])) s--;
  while (e < t.length && /\S/.test(t[e])) e++;
  if (s === e) return null; // clicked on pure whitespace
  // Translate to absolute offsets within the container.
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let abs = 0;
  let node = walker.nextNode() as Text | null;
  while (node) {
    if (node === textNode) return { start: abs + s, end: abs + e };
    abs += node.data.length;
    node = walker.nextNode() as Text | null;
  }
  return null;
}

/** Merge overlapping highlights of the same color; keep separate-color ones. */
function mergeHighlights(highlights: Highlight[]): Highlight[] {
  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  const out: Highlight[] = [];
  for (const h of sorted) {
    const last = out[out.length - 1];
    if (last && last.color === h.color && h.start <= last.end) {
      last.end = Math.max(last.end, h.end);
    } else {
      out.push({ ...h });
    }
  }
  return out;
}

interface Segment {
  text: string;
  color: HighlightColor | null;
}

/** Split passage text into rendered segments based on highlight ranges. */
function buildSegments(passage: string, highlights: Highlight[]): Segment[] {
  if (highlights.length === 0) return [{ text: passage, color: null }];
  const boundaries = new Set<number>([0, passage.length]);
  for (const h of highlights) {
    boundaries.add(Math.max(0, Math.min(passage.length, h.start)));
    boundaries.add(Math.max(0, Math.min(passage.length, h.end)));
  }
  const points = Array.from(boundaries).sort((a, b) => a - b);
  const segments: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const s = points[i];
    const e = points[i + 1];
    if (s === e) continue;
    const cover = highlights.find((h) => h.start <= s && h.end >= e);
    segments.push({ text: passage.slice(s, e), color: cover?.color ?? null });
  }
  return segments;
}

export function HighlightablePassage({
  passage,
  highlights,
  tool,
  onChangeHighlights,
  onWordClick,
  className,
}: {
  passage: string;
  highlights: Highlight[];
  tool: HighlightTool;
  onChangeHighlights: (next: Highlight[]) => void;
  /** Fires when the user clicks a word with tool="translate". Receives the
   *  raw word text + sentence context + click position so the parent can
   *  open a translation popup. */
  onWordClick?: (info: { word: string; sentence: string; x: number; y: number }) => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const applyAtOffsets = (off: { start: number; end: number }) => {
    if (tool === "eraser") {
      const next: Highlight[] = [];
      for (const h of highlights) {
        if (h.end <= off.start || h.start >= off.end) {
          next.push(h);
        } else {
          if (h.start < off.start) next.push({ ...h, end: off.start });
          if (h.end > off.end) next.push({ ...h, start: off.end });
        }
      }
      onChangeHighlights(next);
    } else if (tool !== "none" && tool !== "translate") {
      onChangeHighlights(
        mergeHighlights([...highlights, { start: off.start, end: off.end, color: tool }]),
      );
    }
  };

  // Drag-select handler — keeps the original "select then release" behaviour
  // for sentences/phrases. If the user just CLICKED (selection is collapsed)
  // the click handler below covers the word-at-cursor case so the pen always
  // does something on contact.
  const handleMouseUp = () => {
    if (tool === "none") return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !ref.current) return;
    const range = sel.getRangeAt(0);
    if (!ref.current.contains(range.commonAncestorContainer)) return;
    const off = getOffsets(range, ref.current);
    if (!off || off.end === off.start) return;
    applyAtOffsets(off);
    sel.removeAllRanges();
  };

  // Click handler — tap with a highlight tool active = mark the word under
  // the cursor instantly. Solves the "bút highlight đang không dùng được"
  // confusion where users expected click-to-mark, not drag-select. The
  // translate tool reuses the same word-at-point logic but instead of
  // mutating highlights it calls onWordClick with the surrounding
  // sentence so the parent can show a popup.
  const handleClick = (e: React.MouseEvent) => {
    if (tool === "none") return;
    if (!ref.current) return;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;
    const off = getWordOffsetsAtPoint(e.clientX, e.clientY, ref.current);
    if (!off) return;
    if (tool === "translate") {
      if (!onWordClick) return;
      const word = passage.slice(off.start, off.end).trim();
      if (!word) return;
      // Find the sentence boundaries by walking back to the nearest
      // sentence-ender + walking forward to the next one. Falls back to
      // a 200-char window if no boundary found.
      const SENT_END = /[.!?]\s+/g;
      let sentStart = 0;
      let sentEnd = passage.length;
      // Walk backward
      for (let i = off.start - 1; i >= 0; i--) {
        const ch = passage[i];
        if ((ch === "." || ch === "!" || ch === "?") && /\s/.test(passage[i + 1] ?? " ")) {
          sentStart = i + 1;
          break;
        }
      }
      // Walk forward
      SENT_END.lastIndex = off.end;
      const m = SENT_END.exec(passage);
      if (m) sentEnd = m.index + 1;
      const sentence = passage.slice(sentStart, sentEnd).trim();
      onWordClick({ word, sentence, x: e.clientX, y: e.clientY });
      return;
    }
    applyAtOffsets(off);
  };

  const segments = buildSegments(passage, highlights);
  return (
    <div
      ref={ref}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      onTouchEnd={handleMouseUp}
      className={cn(
        "text-[15px] leading-relaxed whitespace-pre-wrap text-foreground",
        tool !== "none" && tool !== "eraser" && tool !== "translate" && "cursor-text selection:bg-yellow-200/60",
        tool === "eraser" && "cursor-cell",
        tool === "translate" && "cursor-help",
        className,
      )}
    >
      {segments.map((seg, i) =>
        seg.color ? (
          <mark key={i} className={cn("rounded px-0.5", COLOR_CLASSES[seg.color])}>
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Context-driven highlighting for the questions panel.
 *
 * The passage is one contiguous block, but the questions panel is a tree of
 * prompts, options and inputs. Each highlightable text snippet (a prompt, an
 * option) is keyed by a string and stores its own highlight ranges, so the
 * proven offset model still applies — one snippet at a time.
 * ------------------------------------------------------------------ */

interface HighlightCtx {
  tool: HighlightTool;
  get: (key: string) => Highlight[];
  set: (key: string, next: Highlight[]) => void;
}

const HighlightContext = createContext<HighlightCtx>({
  tool: "none",
  get: () => [],
  set: () => {},
});

/** True character of the active tool — callers can use it to tweak behaviour. */
export function useHighlightTool(): HighlightTool {
  return useContext(HighlightContext).tool;
}

/** Provides the active tool + a keyed highlight store to every HighlightableText inside. */
export function HighlightProvider({
  tool,
  highlights,
  onChange,
  children,
}: {
  tool: HighlightTool;
  highlights: Record<string, Highlight[]>;
  onChange: (next: Record<string, Highlight[]>) => void;
  children: ReactNode;
}) {
  const ctx: HighlightCtx = {
    tool,
    get: (key) => highlights[key] ?? [],
    set: (key, next) => onChange({ ...highlights, [key]: next }),
  };
  return <HighlightContext.Provider value={ctx}>{children}</HighlightContext.Provider>;
}

/**
 * A single highlightable text snippet (a question prompt, an option…). Reads
 * the active tool + its own highlight ranges from context. Outside a
 * HighlightProvider it simply renders the plain text, so the same components
 * work in screens that have no highlighter.
 */
export function HighlightableText({
  textKey,
  text,
  className,
}: {
  textKey: string;
  text: string;
  className?: string;
}) {
  const ctx = useContext(HighlightContext);
  const ref = useRef<HTMLSpanElement>(null);
  const highlights = ctx.get(textKey);

  const applyAtOffsets = (off: { start: number; end: number }) => {
    if (ctx.tool === "eraser") {
      const next: Highlight[] = [];
      for (const h of highlights) {
        if (h.end <= off.start || h.start >= off.end) {
          next.push(h);
        } else {
          if (h.start < off.start) next.push({ ...h, end: off.start });
          if (h.end > off.end) next.push({ ...h, start: off.end });
        }
      }
      ctx.set(textKey, next);
    } else if (ctx.tool !== "none" && ctx.tool !== "translate") {
      ctx.set(
        textKey,
        mergeHighlights([
          ...highlights,
          { start: off.start, end: off.end, color: ctx.tool },
        ]),
      );
    }
  };

  const handleMouseUp = () => {
    if (ctx.tool === "none") return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !ref.current) return;
    const range = sel.getRangeAt(0);
    if (!ref.current.contains(range.commonAncestorContainer)) return;
    const off = getOffsets(range, ref.current);
    if (!off || off.end === off.start) return;
    applyAtOffsets(off);
    sel.removeAllRanges();
  };

  // Tap-to-mark for question prompts/options — same UX as the passage column.
  const handleClick = (e: React.MouseEvent) => {
    if (ctx.tool === "none") return;
    if (!ref.current) return;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;
    const off = getWordOffsetsAtPoint(e.clientX, e.clientY, ref.current);
    if (!off) return;
    applyAtOffsets(off);
  };

  // Fast path: nothing to highlight and no tool — render plain text.
  if (ctx.tool === "none" && highlights.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const segments = buildSegments(text, highlights);
  return (
    <span
      ref={ref}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      onTouchEnd={handleMouseUp}
      className={cn(
        ctx.tool !== "none" && ctx.tool !== "eraser" && "cursor-text",
        ctx.tool === "eraser" && "cursor-cell",
        className,
      )}
    >
      {segments.map((seg, i) =>
        seg.color ? (
          <mark key={i} className={cn("rounded px-0.5", COLOR_CLASSES[seg.color])}>
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </span>
  );
}

export function HighlightToolbar({
  tool,
  setTool,
}: {
  tool: HighlightTool;
  setTool: (t: HighlightTool) => void;
}) {
  const colors: { key: HighlightColor; cls: string; label: string }[] = [
    { key: "yellow", cls: "bg-yellow-300", label: "Vàng" },
    { key: "green", cls: "bg-emerald-300", label: "Xanh" },
    { key: "pink", cls: "bg-pink-300", label: "Hồng" },
  ];
  return (
    <div className="flex items-center gap-1 rounded-full border bg-card px-1.5 py-1 shadow-sm">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 hidden md:inline">
        {tool === "none"
          ? "Bút"
          : tool === "eraser"
            ? "Tẩy"
            : `Bôi ${tool === "yellow" ? "vàng" : tool === "green" ? "xanh" : "hồng"}`}
      </span>
      {colors.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => setTool(tool === c.key ? "none" : c.key)}
          aria-label={`Highlight ${c.label}`}
          title={`${tool === c.key ? "Tắt" : "Bật"} bút ${c.label.toLowerCase()} — click 1 từ hoặc kéo chọn để tô`}
          className={cn(
            "h-7 w-7 rounded-full border-2 transition-all",
            c.cls,
            tool === c.key
              ? "border-foreground scale-110 ring-2 ring-foreground/30"
              : "border-transparent hover:scale-105",
          )}
        />
      ))}
      <button
        type="button"
        onClick={() => setTool(tool === "eraser" ? "none" : "eraser")}
        aria-label="Tẩy highlight"
        title={tool === "eraser" ? "Tắt tẩy" : "Bật tẩy — click vào chỗ đã bôi để xóa"}
        className={cn(
          "h-7 w-7 rounded-full border-2 grid place-items-center transition-all",
          tool === "eraser"
            ? "border-foreground bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 scale-110 ring-2 ring-foreground/30"
            : "border-border hover:bg-muted text-muted-foreground",
        )}
      >
        <Eraser className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setTool(tool === "translate" ? "none" : "translate")}
        aria-label="Tự dịch"
        title={
          tool === "translate"
            ? "Tắt chế độ dịch"
            : "Bật chế độ dịch — click 1 từ trong bài để xem nghĩa tiếng Việt"
        }
        className={cn(
          "h-7 w-7 rounded-full border-2 grid place-items-center transition-all",
          tool === "translate"
            ? "border-foreground bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 scale-110 ring-2 ring-foreground/30"
            : "border-border hover:bg-muted text-muted-foreground",
        )}
      >
        <Languages className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
