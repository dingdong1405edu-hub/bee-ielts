"use client";

/**
 * Global "highlight word → save to vocab" provider.
 *
 * User flow: select 1-4 words anywhere on a learn page (transcript,
 * passage, etc) → release the mouse → small popup appears at the
 * selection asking "Lưu vào sổ từ" → user picks a deck → POST to
 * /api/words/card or quick-add. Works on every page under `(learn)/`
 * without per-module wiring.
 *
 * Triggers ONLY when:
 *   - Selection is non-empty AND length ≤ 60 chars AND ≤ 4 words.
 *   - At least one Latin letter exists in the selection (so single
 *     punctuation / pure numbers don't fire).
 *   - The selection's anchor is NOT inside an input / textarea /
 *     contenteditable (the user is typing, not learning).
 *   - The anchor is NOT inside any element with `data-no-vocab` or
 *     `data-chrome` (sidebar/header/admin/control areas opt out).
 *
 * The popup re-uses [[word-translate-popup]] verbatim — translation
 * fetched from `/api/shadowing/translate-word` (the same endpoint
 * Shadowing's click-on-word flow uses).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  WordTranslatePopup,
  type WordHint,
} from "@/components/learn/word-translate-popup";

interface PopupState {
  word: string;
  sentence: string;
  x: number;
  y: number;
  loading: boolean;
  hint: WordHint | null;
}

/** Walk up from `node` to find the closest element matching `predicate`.
 *  Returns null if nothing matches before hitting <body>. */
function findAncestor(
  node: Node | null,
  predicate: (el: HTMLElement) => boolean,
): HTMLElement | null {
  let cur: Node | null = node;
  while (cur && cur !== document.body) {
    if (cur.nodeType === Node.ELEMENT_NODE) {
      const el = cur as HTMLElement;
      if (predicate(el)) return el;
    }
    cur = cur.parentNode;
  }
  return null;
}

/** Return the parent sentence (paragraph/segment text) of the selection,
 *  so we can give Claude better context for translation. We climb until
 *  we find a block element whose textContent is >= 20 chars OR we reach
 *  a sensible boundary (li / p / div). Falls back to the selection
 *  itself if no good container is found. */
function getSentenceContext(node: Node | null, fallback: string): string {
  const block = findAncestor(node, (el) => {
    const display = window.getComputedStyle(el).display;
    if (!["block", "list-item", "flex", "grid"].includes(display)) return false;
    return (el.textContent?.trim().length ?? 0) >= 20;
  });
  const text = (block?.textContent ?? "").replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  // Cap sentence at 240 chars — Claude doesn't need a whole paragraph
  // and shorter context = faster + cheaper.
  return text.length > 240 ? text.slice(0, 240) + "…" : text;
}

/** Clean the raw selected text into a vocabulary-grade lookup token.
 *  - Trim whitespace + surrounding punctuation
 *  - Collapse internal whitespace
 *  - Reject if too long, too short, or no letters */
function normalizeSelection(raw: string): string | null {
  const trimmed = raw.trim().replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, "").trim();
  if (!trimmed) return null;
  if (trimmed.length < 2) return null;
  if (trimmed.length > 60) return null;
  if (!/[A-Za-z]/.test(trimmed)) return null;
  const words = trimmed.split(/\s+/);
  if (words.length > 4) return null;
  return trimmed;
}

export function SelectionVocab() {
  const [popup, setPopup] = useState<PopupState | null>(null);
  // Anchor coords from the most recent mouseup. Used to position the
  // popup precisely; updated independently of `popup` so the trigger
  // logic stays cheap.
  const lastCoordRef = useRef<{ x: number; y: number } | null>(null);

  const closePopup = useCallback(() => setPopup(null), []);

  const handleSelection = useCallback(async () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const raw = sel.toString();
    const cleaned = normalizeSelection(raw);
    if (!cleaned) return;

    const range = sel.getRangeAt(0);
    const anchor = sel.anchorNode;

    // Opt-out: any ancestor marked data-no-vocab or data-chrome (sidebar,
    // header, admin tools etc).
    const optOut = findAncestor(anchor, (el) => {
      if (el.hasAttribute("data-no-vocab")) return true;
      if (el.hasAttribute("data-chrome")) return true;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    });
    if (optOut) return;

    // Position: bottom-centre of the selection's bounding rect, falls
    // back to the captured mouseup coords if the range can't compute
    // (rare — happens on collapsed ranges).
    const rect = range.getBoundingClientRect();
    const x =
      rect && rect.width > 0
        ? rect.left + rect.width / 2
        : (lastCoordRef.current?.x ?? window.innerWidth / 2);
    const y =
      rect && rect.height > 0
        ? rect.bottom
        : (lastCoordRef.current?.y ?? window.innerHeight / 2);

    const sentence = getSentenceContext(anchor, raw);

    setPopup({ word: cleaned, sentence, x, y, loading: true, hint: null });

    try {
      const res = await fetch("/api/shadowing/translate-word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: cleaned, sentence }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Dịch lỗi");
      setPopup((p) =>
        p && p.word === cleaned ? { ...p, loading: false, hint: data } : p,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
      setPopup(null);
    }
  }, []);

  useEffect(() => {
    const onMouseUp = (e: MouseEvent) => {
      lastCoordRef.current = { x: e.clientX, y: e.clientY };
      // Defer one tick so the browser finishes building the selection.
      // Without this, `window.getSelection()` is sometimes still empty
      // on the synchronous mouseup callback in Safari + Firefox.
      window.setTimeout(handleSelection, 0);
    };
    const onTouchEnd = () => {
      window.setTimeout(handleSelection, 0);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePopup();
    };
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [handleSelection, closePopup]);

  if (!popup) return null;
  return (
    <WordTranslatePopup
      word={popup.word}
      sentence={popup.sentence}
      x={popup.x}
      y={popup.y}
      loading={popup.loading}
      hint={popup.hint}
      onClose={closePopup}
    />
  );
}
