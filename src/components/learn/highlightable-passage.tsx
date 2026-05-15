"use client";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export type HighlightColor = "yellow" | "green" | "pink";
export type HighlightTool = "none" | HighlightColor | "eraser";

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
  className,
}: {
  passage: string;
  highlights: Highlight[];
  tool: HighlightTool;
  onChangeHighlights: (next: Highlight[]) => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseUp = () => {
    if (tool === "none") return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !ref.current) return;
    const range = sel.getRangeAt(0);
    if (!ref.current.contains(range.commonAncestorContainer)) return;
    const off = getOffsets(range, ref.current);
    if (!off || off.end === off.start) return;

    if (tool === "eraser") {
      // Remove any highlight that fully overlaps the selection; also split partials.
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
    } else {
      onChangeHighlights(mergeHighlights([...highlights, { start: off.start, end: off.end, color: tool }]));
    }
    sel.removeAllRanges();
  };

  const segments = buildSegments(passage, highlights);
  return (
    <div
      ref={ref}
      onMouseUp={handleMouseUp}
      onTouchEnd={handleMouseUp}
      className={cn(
        "text-[15px] leading-relaxed whitespace-pre-wrap text-foreground",
        tool !== "none" && tool !== "eraser" && "cursor-text selection:bg-yellow-200/60",
        tool === "eraser" && "cursor-cell",
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
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 hidden md:inline">Bút</span>
      {colors.map((c) => (
        <button
          key={c.key}
          onClick={() => setTool(tool === c.key ? "none" : c.key)}
          aria-label={`Highlight ${c.label}`}
          title={`Bôi ${c.label}`}
          className={cn(
            "h-7 w-7 rounded-full border-2 transition-all",
            c.cls,
            tool === c.key ? "border-foreground scale-110" : "border-transparent hover:scale-105",
          )}
        />
      ))}
      <button
        onClick={() => setTool(tool === "eraser" ? "none" : "eraser")}
        title="Xóa bôi"
        className={cn(
          "h-7 w-7 rounded-full border-2 grid place-items-center text-xs font-bold transition-all",
          tool === "eraser" ? "border-foreground bg-muted scale-110" : "border-border hover:bg-muted",
        )}
      >
        ⌫
      </button>
    </div>
  );
}
