"use client";
/**
 * Shared word-translation popup used by both the Reading practice player
 * and the Shadowing player. Renders a small floating card at the clicked
 * word's position with: word + part-of-speech + Vietnamese gloss + English
 * one-line definition + a "Lưu vào sổ từ" button that adds the word to
 * the user's chosen vocab deck.
 *
 * Decks list is loaded lazily on first save-button hover/click — most
 * users will dismiss popups without saving, so we don't pay for a
 * /api/words/deck fetch up front.
 */
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, X, BookmarkPlus, ChevronDown } from "lucide-react";

export interface WordHint {
  word?: string;
  pos: string;
  vi: string;
  defEn?: string;
}

interface DeckRow {
  id: string;
  title: string;
}

export interface WordTranslatePopupProps {
  word: string;
  sentence: string;
  /** Pixel coordinates of the click (clientX/clientY). The popup positions
   *  itself just below the word, clamped to the viewport. */
  x: number;
  y: number;
  loading: boolean;
  hint: WordHint | null;
  /** Triggers the save flow. The popup picks the deck via dropdown then
   *  calls POST /api/words/card. */
  onClose: () => void;
}

export function WordTranslatePopup({
  word,
  sentence,
  x,
  y,
  loading,
  hint,
  onClose,
}: WordTranslatePopupProps) {
  const [decks, setDecks] = useState<DeckRow[] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fetchDeckOnce = useRef(false);

  const loadDecks = async () => {
    if (fetchDeckOnce.current) return;
    fetchDeckOnce.current = true;
    try {
      const res = await fetch("/api/words/deck");
      const data = (await res.json()) as { decks?: { id: string; title: string }[] };
      setDecks(data.decks ?? []);
    } catch {
      setDecks([]);
    }
  };

  useEffect(() => {
    // Reset save state when the user moves to a new word (popup unmounts
    // and remounts on word change so this only fires on first mount).
    setSaved(false);
  }, [word]);

  const saveToDeck = async (deckId: string | null) => {
    setSaving(true);
    try {
      // If no deck chosen, fall back to quick-add which auto-creates the
      // default "Tự thu thập" deck.
      const endpoint = deckId ? "/api/words/card" : "/api/words/quick-add";
      const body = deckId
        ? {
            deckId,
            term: word,
            definition: hint?.defEn || hint?.vi || "",
            example: sentence,
          }
        : { term: word, source: sentence };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Lưu thất bại");
      }
      setSaved(true);
      toast.success(`Đã lưu "${word}" vào sổ từ`);
      setPickerOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed z-50 max-w-[280px] rounded-2xl border-2 border-amber-300 bg-card shadow-2xl p-3"
      style={{
        left: Math.max(8, Math.min(window.innerWidth - 300, x - 140)),
        top: Math.min(window.innerHeight - 220, y + 8),
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-extrabold text-base">{word}</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang dịch...
        </div>
      ) : hint ? (
        <div className="space-y-1.5">
          {hint.pos && (
            <span className="inline-block text-[10px] uppercase tracking-wider font-extrabold rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5">
              {hint.pos}
            </span>
          )}
          <p className="text-sm font-bold text-foreground">{hint.vi}</p>
          {hint.defEn && (
            <p className="text-xs text-muted-foreground italic leading-snug">{hint.defEn}</p>
          )}

          {/* Save flow */}
          <div className="pt-2 border-t mt-2">
            {!pickerOpen && !saved && (
              <button
                onClick={() => {
                  setPickerOpen(true);
                  void loadDecks();
                }}
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-100 hover:bg-violet-200 dark:bg-violet-900/30 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-300 px-2.5 py-1.5 text-xs font-extrabold transition-colors"
              >
                <BookmarkPlus className="h-3.5 w-3.5" />
                Lưu vào sổ từ
              </button>
            )}
            {saved && (
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 text-center py-1">
                ✓ Đã lưu vào sổ từ
              </div>
            )}
            {pickerOpen && !saved && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Chọn bộ:
                </p>
                {decks === null ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Tải bộ...
                  </div>
                ) : decks.length === 0 ? (
                  <button
                    onClick={() => saveToDeck(null)}
                    disabled={saving}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-2.5 py-1.5 text-xs font-extrabold"
                  >
                    {saving ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <BookmarkPlus className="h-3 w-3" />
                    )}
                    Tự tạo bộ &ldquo;Tự thu thập&rdquo;
                  </button>
                ) : (
                  <div className="max-h-[140px] overflow-y-auto space-y-1 pr-1">
                    {decks.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => saveToDeck(d.id)}
                        disabled={saving}
                        className="w-full text-left inline-flex items-center justify-between gap-1 rounded-md border-2 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100 dark:hover:bg-violet-900/40 px-2 py-1 text-xs font-bold transition-colors"
                      >
                        <span className="truncate">{d.title}</span>
                        <ChevronDown className="h-3 w-3 -rotate-90 shrink-0" />
                      </button>
                    ))}
                    <button
                      onClick={() => saveToDeck(null)}
                      disabled={saving}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 mt-1"
                    >
                      + Vào bộ mặc định &ldquo;Tự thu thập&rdquo;
                    </button>
                  </div>
                )}
                {saving && (
                  <div className="text-[10px] text-center text-muted-foreground">
                    Đang lưu...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
