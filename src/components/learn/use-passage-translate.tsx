"use client";

/**
 * usePassageTranslate — shared "click a word → see its Vietnamese meaning"
 * behaviour for a reading passage. The whole passage is batch-translated ONCE
 * the first time the translate tool is turned on for a given passage id (one
 * Claude call), after which every click is an O(1) lookup + a lazy per-word
 * English-definition fetch. Returns the `onWordClick` handler to hand to
 * HighlightablePassage and the popup node to render.
 *
 * Extracted from ReadingPlayer so the mock exam (ReadingShell) and teacher
 * homework can reuse the exact same translate feature.
 */
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { WordTranslatePopup, type WordHint } from "@/components/learn/word-translate-popup";
import type { HighlightTool } from "@/components/learn/highlightable-passage";

export function usePassageTranslate({
  tool,
  passageId,
  passage,
}: {
  tool: HighlightTool;
  passageId: string;
  passage: string;
}) {
  const [translateMap, setTranslateMap] = useState<Record<string, { pos: string; vi: string }>>({});
  const [batchLoading, setBatchLoading] = useState(false);
  // Which passage ids we've already batch-translated (a mock has one per part).
  const triedRef = useRef<Set<string>>(new Set());
  const [popup, setPopup] = useState<
    | { word: string; sentence: string; x: number; y: number; loading: boolean; hint: WordHint | null }
    | null
  >(null);

  useEffect(() => {
    if (tool !== "translate" || !passage) return;
    if (triedRef.current.has(passageId)) return;
    triedRef.current.add(passageId);
    setBatchLoading(true);
    void fetch("/api/reading/translate-passage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passage, passageId }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.words) setTranslateMap((m) => ({ ...m, ...d.words }));
        else toast.error(d.error || "Tải bản dịch thất bại");
      })
      .catch(() => toast.error("Lỗi mạng khi tải bản dịch"))
      .finally(() => setBatchLoading(false));
  }, [tool, passageId, passage]);

  const onWordClick = ({ word, sentence, x, y }: { word: string; sentence: string; x: number; y: number }) => {
    const w = word.replace(/[^A-Za-z'-]/g, "").toLowerCase();
    if (!w) return;
    const cached = translateMap[w];
    // Open instantly with the batch entry, then fetch defEn in the background.
    setPopup({ word: w, sentence, x, y, loading: !cached, hint: cached ? { pos: cached.pos, vi: cached.vi } : null });
    void fetch("/api/shadowing/translate-word", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: w, sentence }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) {
          setPopup((p) =>
            p && p.word === w
              ? {
                  ...p,
                  loading: false,
                  hint: { word: d.word, pos: d.pos || cached?.pos || "", vi: d.vi || cached?.vi || "", defEn: d.defEn },
                }
              : p,
          );
        } else if (cached) {
          setPopup((p) => (p && p.word === w ? { ...p, loading: false } : p));
        } else {
          setPopup(null);
          toast.error(d.error);
        }
      })
      .catch(() => {
        if (cached) setPopup((p) => (p ? { ...p, loading: false } : p));
        else setPopup(null);
      });
  };

  const popupNode = popup ? (
    <WordTranslatePopup
      word={popup.word}
      sentence={popup.sentence}
      x={popup.x}
      y={popup.y}
      loading={popup.loading}
      hint={popup.hint}
      onClose={() => setPopup(null)}
    />
  ) : null;

  return { onWordClick, popupNode, batchLoading };
}
