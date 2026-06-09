"use client";
/**
 * Speaking Roulette — fanned card deck UI. Three Part tabs (1/2/3). Each
 * card shows a topic question + 3 talk points + 4 vocab-in-context lines
 * with one bold word per line that's clickable for a quick translation
 * via the shared WordTranslatePopup.
 *
 * Flow:
 *   - Default view: fan of cards arranged in an arc, "Spin the deck"
 *     button picks a random card with a small animation.
 *   - When `picked` set: modal-style card overlay with full question +
 *     vocab + record button. Buttons: Spin again / Back to deck.
 *   - Record button uses MediaRecorder → POST to /api/speaking/transcribe
 *     and shows the transcript inline. AI band grading not wired yet —
 *     belongs to the multiplayer follow-up.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  KeyRound,
  Loader2,
  Mic,
  RefreshCw,
  Star,
  StopCircle,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WordTranslatePopup,
  type WordHint,
} from "@/components/learn/word-translate-popup";

export interface RouletteCard {
  id: string;
  part: 1 | 2 | 3;
  topic: string;
  question: string;
  talkPoints: string[];
  vocab: { sentence: string; keyWord: string }[];
  hue: string;
}

type PartTab = 1 | 2 | 3;

const PART_LABELS: Record<PartTab, { name: string; sub: string }> = {
  1: { name: "Part 1", sub: "Interview" },
  2: { name: "Part 2", sub: "Cue card" },
  3: { name: "Part 3", sub: "Discussion" },
};

/** Tailwind-friendly hue→class map. tintLight/Mid/Dark are raw hex stops
 *  the playing-card back uses to render a diagonal sheen. Tailwind class
 *  versions stay for the overlay (modal) where flat fills look fine. */
interface HueStyle {
  bg: string;
  bgSoft: string;
  ring: string;
  text: string;
  chipBg: string;
  tintLight: string;
  tintMid: string;
  tintDark: string;
}
const HUE_STYLES: Record<string, HueStyle> = {
  rose: {
    bg: "bg-rose-500",
    bgSoft: "bg-rose-100 dark:bg-rose-950/40",
    ring: "ring-rose-300",
    text: "text-rose-50",
    chipBg: "bg-rose-700/40",
    tintLight: "#fb7185",
    tintMid: "#e11d48",
    tintDark: "#9f1239",
  },
  amber: {
    bg: "bg-amber-500",
    bgSoft: "bg-amber-100 dark:bg-amber-950/40",
    ring: "ring-amber-300",
    text: "text-amber-50",
    chipBg: "bg-amber-700/40",
    tintLight: "#fbbf24",
    tintMid: "#d97706",
    tintDark: "#92400e",
  },
  emerald: {
    bg: "bg-emerald-600",
    bgSoft: "bg-emerald-100 dark:bg-emerald-950/40",
    ring: "ring-emerald-300",
    text: "text-emerald-50",
    chipBg: "bg-emerald-800/40",
    tintLight: "#34d399",
    tintMid: "#059669",
    tintDark: "#065f46",
  },
  sky: {
    bg: "bg-sky-600",
    bgSoft: "bg-sky-100 dark:bg-sky-950/40",
    ring: "ring-sky-300",
    text: "text-sky-50",
    chipBg: "bg-sky-800/40",
    tintLight: "#38bdf8",
    tintMid: "#0284c7",
    tintDark: "#0c4a6e",
  },
  violet: {
    bg: "bg-violet-600",
    bgSoft: "bg-violet-100 dark:bg-violet-950/40",
    ring: "ring-violet-300",
    text: "text-violet-50",
    chipBg: "bg-violet-800/40",
    tintLight: "#a78bfa",
    tintMid: "#7c3aed",
    tintDark: "#4c1d95",
  },
  teal: {
    bg: "bg-teal-600",
    bgSoft: "bg-teal-100 dark:bg-teal-950/40",
    ring: "ring-teal-300",
    text: "text-teal-50",
    chipBg: "bg-teal-800/40",
    tintLight: "#2dd4bf",
    tintMid: "#0d9488",
    tintDark: "#134e4a",
  },
};

function hueOf(name: string) {
  return HUE_STYLES[name] ?? HUE_STYLES.amber;
}

export function RouletteDeck({ cards }: { cards: RouletteCard[] }) {
  const router = useRouter();
  const [part, setPart] = useState<PartTab>(1);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [mpOpen, setMpOpen] = useState(false);
  const [mpBusy, setMpBusy] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const createRoom = async () => {
    setMpBusy(true);
    try {
      const res = await fetch("/api/speaking/roulette/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ part }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Tạo phòng lỗi");
      router.push(`/speaking/roulette/room/${data.code}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
      setMpBusy(false);
    }
  };

  const joinRoom = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      toast.error("Mã phòng 6 ký tự");
      return;
    }
    setMpBusy(true);
    try {
      const res = await fetch(
        `/api/speaking/roulette/rooms/${code}/join`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Join lỗi");
      router.push(`/speaking/roulette/room/${code}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
      setMpBusy(false);
    }
  };

  const filtered = useMemo(() => cards.filter((c) => c.part === part), [cards, part]);
  const picked = useMemo(
    () => filtered.find((c) => c.id === pickedId) ?? null,
    [filtered, pickedId],
  );

  const spin = () => {
    if (filtered.length === 0) return;
    setSpinning(true);
    // Cycle the highlight a few times for a "spinning" feel, then settle.
    let hops = 0;
    const HOPS = 12;
    const interval = window.setInterval(() => {
      hops++;
      const idx = Math.floor(Math.random() * filtered.length);
      setPickedId(filtered[idx].id);
      if (hops >= HOPS) {
        window.clearInterval(interval);
        setSpinning(false);
      }
    }, 90);
  };

  // Reset selection when part tab changes.
  useEffect(() => {
    setPickedId(null);
  }, [part]);

  return (
    <div
      className="relative min-h-[88vh] -mx-4 sm:-mx-6 md:-mx-8 -mt-4 md:-mt-6 px-4 sm:px-6 md:px-8 py-8 rounded-3xl overflow-hidden text-white"
      style={{
        // Felt table — emerald in the centre, deeper green in the corners
        // gives the board real depth, no flat washed-out look.
        background:
          "radial-gradient(ellipse at 50% 35%, #6f9450 0%, #4d6735 55%, #2f4220 100%)",
      }}
    >
      {/* Felt grid texture */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Vignette — corners darker, draws eye to the centre fan. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.35) 100%)",
        }}
      />
      {/* Floor halo behind the fan — a soft warm light glow so cards pop. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/4 w-[600px] h-[300px] rounded-full pointer-events-none blur-3xl"
        style={{ background: "rgba(252, 211, 77, 0.12)" }}
      />

      <div className="relative max-w-5xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <Link
            href="/speaking"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur px-3 py-1.5 text-sm font-bold"
          >
            <ArrowLeft className="h-4 w-4" /> Speaking
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-display">
              Speaking Roulette
            </h1>
            <p className="text-xs md:text-sm text-white/70 uppercase tracking-[0.18em] font-bold">
              IELTS · rút thẻ chủ đề
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full bg-cream text-[#3b5128] px-4 py-1.5 text-sm font-extrabold shadow-md hover:scale-105 transition-transform"
            onClick={() => setMpOpen(true)}
          >
            <Users className="h-4 w-4" /> Mời bạn bè
          </button>
        </div>

        {/* Part tabs */}
        <div className="flex justify-center gap-2 mb-6">
          {([1, 2, 3] as const).map((p) => {
            const active = part === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPart(p)}
                className={cn(
                  "rounded-2xl px-5 py-2.5 text-center min-w-[110px] transition-all font-display",
                  active
                    ? "bg-cream text-[#3b5128] shadow-lg"
                    : "bg-white/10 text-white/80 hover:bg-white/20",
                )}
              >
                <div className="text-base font-extrabold leading-none">
                  {PART_LABELS[p].name}
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold mt-1">
                  {PART_LABELS[p].sub}
                </div>
              </button>
            );
          })}
        </div>

        {/* Fan of cards */}
        <FanOfCards
          cards={filtered}
          onPick={(id) => {
            if (!spinning) setPickedId(id);
          }}
          highlightedId={spinning ? pickedId : null}
        />

        <div className="flex flex-col items-center gap-3 -mt-2">
          <button
            type="button"
            onClick={spin}
            disabled={spinning || filtered.length === 0}
            className={cn(
              "relative inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-cream to-amber-100 text-[#3b5128] px-10 py-4 font-extrabold text-lg shadow-xl shadow-black/30 hover:scale-105 transition-transform disabled:opacity-50 font-display",
              "before:absolute before:inset-0 before:rounded-full before:ring-2 before:ring-white/60 before:pointer-events-none",
            )}
          >
            {spinning ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Spinning…
              </>
            ) : (
              <>
                <RefreshCw className="h-5 w-5" /> Spin the deck
              </>
            )}
          </button>
          <p className="text-xs text-white/70 italic">
            Tap a card or the button to draw a random question
          </p>
        </div>
      </div>

      {/* Picked card overlay */}
      {picked && !spinning && (
        <CardOverlay
          card={picked}
          onSpinAgain={() => {
            setPickedId(null);
            spin();
          }}
          onClose={() => setPickedId(null)}
        />
      )}

      {/* Multiplayer modal — create room (host) OR join with code. */}
      {mpOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => !mpBusy && setMpOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-cream text-foreground p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <Users className="mx-auto h-10 w-10 text-emerald-600" />
              <h2 className="text-2xl font-extrabold font-display mt-2">
                Chơi cùng bạn bè
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Phòng turn-based, AI chấm điểm sau mỗi câu trả lời. Tối đa 6 người.
              </p>
            </div>

            <button
              type="button"
              onClick={createRoom}
              disabled={mpBusy}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-lime-500 text-white py-3 font-extrabold shadow-md hover:scale-[1.02] transition-transform disabled:opacity-50"
            >
              {mpBusy ? (
                <Loader2 className="h-5 w-5 animate-spin inline" />
              ) : (
                <>🎯 Tạo phòng mới · Part {part}</>
              )}
            </button>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex-1 h-px bg-border" />
              <span>hoặc</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <KeyRound className="h-3 w-3" /> Vào bằng mã phòng
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="ABC23X"
                  maxLength={6}
                  className="flex-1 rounded-xl bg-card border-2 border-border px-3 py-2.5 font-mono text-lg tracking-[0.3em] text-center font-extrabold focus:border-emerald-500 focus:outline-none"
                  disabled={mpBusy}
                />
                <button
                  type="button"
                  onClick={joinRoom}
                  disabled={mpBusy || joinCode.length !== 6}
                  className="rounded-xl bg-foreground text-background px-5 font-extrabold disabled:opacity-50"
                >
                  {mpBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vào"}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMpOpen(false)}
              disabled={mpBusy}
              className="w-full text-sm text-muted-foreground hover:text-foreground"
            >
              Để sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Fan of cards ---------------- */

function FanOfCards({
  cards,
  onPick,
  highlightedId,
}: {
  cards: RouletteCard[];
  onPick: (id: string) => void;
  highlightedId: string | null;
}) {
  if (cards.length === 0) {
    return (
      <div className="h-[360px] grid place-items-center text-white/80">
        Chưa có thẻ nào ở Part này.
      </div>
    );
  }
  const n = cards.length;
  // Pivot 540px under cards traces a wide arc; PER_CARD shrinks slightly
  // for larger decks so 12+ cards still fit cleanly.
  const PER_CARD = n > 16 ? 4.5 : 6.5;
  const ARC = Math.min(120, n * PER_CARD);
  const PIVOT = 540;

  return (
    // Container has extra bottom padding (`pb-24`) so the lowest visible
    // edge of any card sits above the Spin button — user asked the fan
    // not to crowd the CTA.
    <div className="relative h-[420px] md:h-[460px] flex items-end justify-center select-none px-4 pb-24">
      {cards.map((c, i) => {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const angle = -ARC / 2 + ARC * t;
        const hue = hueOf(c.hue);
        const highlighted = highlightedId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onPick(c.id)}
            className={cn(
              "absolute bottom-24 left-1/2 -ml-[72px] md:-ml-[84px] transition-transform duration-300 ease-out",
              highlighted
                ? "z-50 scale-[1.08]"
                : "z-0 hover:z-30 hover:-translate-y-3 hover:scale-105",
            )}
            style={{
              transform: `rotate(${angle}deg)`,
              transformOrigin: `50% calc(100% + ${PIVOT}px)`,
            }}
            aria-label={`Topic: ${c.topic}`}
          >
            <PlayingCardBack
              topic={c.topic}
              hue={hue}
              highlighted={highlighted}
            />
          </button>
        );
      })}
    </div>
  );
}

/** Playing-card back — gradient face + double border + corner pips + a
 *  bee-logo monogram in the centre. Designed to read as a "real" deck
 *  back rather than a flat colour rectangle. */
function PlayingCardBack({
  topic,
  hue,
  highlighted,
}: {
  topic: string;
  hue: ReturnType<typeof hueOf>;
  highlighted: boolean;
}) {
  return (
    <div
      className={cn(
        "h-56 w-[144px] md:h-72 md:w-44 rounded-[18px] relative overflow-hidden flex flex-col items-stretch shadow-xl shadow-black/40 ring-1 ring-black/30 transition-shadow",
        highlighted && "ring-4 ring-cream shadow-2xl shadow-cream/30",
      )}
      style={{
        // Subtle vertical sheen so cards look glossier than a flat fill.
        backgroundImage: `linear-gradient(155deg, var(--card-light) 0%, var(--card-mid) 55%, var(--card-dark) 100%)`,
        ...({
          "--card-light": hue.tintLight,
          "--card-mid": hue.tintMid,
          "--card-dark": hue.tintDark,
        } as React.CSSProperties),
      }}
    >
      {/* Outer double border — printed-edge feel like a real card. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-2 rounded-[12px] border-2 border-white/30"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-3.5 rounded-[8px] border border-white/15"
      />

      {/* Top-left pip: topic label vertical-ish chip */}
      <span className="absolute top-2.5 left-2.5 inline-flex items-center rounded-md bg-white/25 backdrop-blur-sm px-1.5 py-0.5 text-[8px] md:text-[9px] font-extrabold uppercase tracking-[0.18em] text-white max-w-[80%] line-clamp-1">
        {topic}
      </span>
      {/* Bottom-right pip mirrored 180° (like real cards) */}
      <span className="absolute bottom-2.5 right-2.5 rotate-180 inline-flex items-center rounded-md bg-white/25 backdrop-blur-sm px-1.5 py-0.5 text-[8px] md:text-[9px] font-extrabold uppercase tracking-[0.18em] text-white max-w-[80%] line-clamp-1">
        {topic}
      </span>

      {/* Diamond lattice pattern overlay — classic playing-card back. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-3.5 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(45deg, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(-45deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "10px 10px",
        }}
      />

      {/* Centre monogram — a circular medallion with a 🐝 emoji. Cleaner
          identity than a plain "?" question mark. */}
      <div className="absolute inset-0 grid place-items-center">
        <div className="relative grid place-items-center h-16 w-16 md:h-20 md:w-20 rounded-full bg-white/15 backdrop-blur-sm border-2 border-white/40 shadow-inner">
          <span className="text-2xl md:text-3xl">🐝</span>
          <span
            aria-hidden
            className="absolute -inset-1.5 rounded-full border border-white/20"
          />
        </div>
      </div>

      {/* Edge shine highlight along the top — gives glassy depth */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-2 top-2 h-1/2 rounded-t-[10px] bg-gradient-to-b from-white/15 to-transparent"
      />
    </div>
  );
}

/* ---------------- Picked card overlay ---------------- */

function CardOverlay({
  card,
  onSpinAgain,
  onClose,
}: {
  card: RouletteCard;
  onSpinAgain: () => void;
  onClose: () => void;
}) {
  const hue = hueOf(card.hue);
  const [popup, setPopup] = useState<{
    word: string;
    sentence: string;
    x: number;
    y: number;
    loading: boolean;
    hint: WordHint | null;
  } | null>(null);

  const openTranslate = async (
    word: string,
    sentence: string,
    e: React.MouseEvent,
  ) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.bottom + window.scrollY + 6;
    setPopup({ word, sentence, x, y, loading: true, hint: null });
    try {
      const res = await fetch("/api/shadowing/translate-word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word, sentence }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error ?? "Lỗi");
      setPopup((prev) =>
        prev ? { ...prev, loading: false, hint: data as WordHint } : prev,
      );
    } catch (e) {
      setPopup(null);
      toast.error(e instanceof Error ? e.message : "Không dịch được");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div
        className={cn(
          "w-full max-w-2xl rounded-2xl p-6 md:p-8 shadow-2xl relative",
          hue.bg,
          hue.text,
        )}
      >
        {/* Saved star (placeholder — wires up when we add bookmarks) */}
        <button
          type="button"
          onClick={() =>
            toast("Tính năng lưu thẻ sẽ ra cùng multiplayer — sẽ có sớm thôi!")
          }
          className="absolute top-4 right-4 rounded-full bg-white/15 hover:bg-white/25 p-2"
          aria-label="Lưu thẻ"
        >
          <Star className="h-4 w-4" />
        </button>

        <div className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/85">
          Part {card.part} · {card.topic}
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold mt-2 font-display tracking-tight leading-tight">
          {card.question}
        </h2>

        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/85 mb-2">
            Things you could talk about
          </div>
          <ol className="space-y-2">
            {card.talkPoints.map((p, i) => (
              <li key={i} className="flex gap-3 text-base md:text-lg">
                <span className="font-display italic text-white/80 w-4 shrink-0">
                  {i + 1}
                </span>
                <span className="font-bold">{p}</span>
              </li>
            ))}
          </ol>
        </div>

        <div
          className={cn(
            "mt-5 rounded-xl p-4 border border-white/20",
            hue.chipBg,
          )}
        >
          <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
            <div className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/85">
              Useful vocabulary in context
            </div>
            <span className="text-[10px] italic text-white/70">
              · bấm từ tô đậm để xem nghĩa
            </span>
          </div>
          <ul className="space-y-2">
            {card.vocab.map((v, i) => (
              <li key={i} className="text-sm md:text-base leading-snug">
                <span className="text-white/40 mr-2">•</span>
                <VocabSentence
                  sentence={v.sentence}
                  keyWord={v.keyWord}
                  onWordClick={(word, sentence, e) =>
                    openTranslate(word, sentence, e)
                  }
                />
              </li>
            ))}
          </ul>
        </div>

        <Recorder />

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onSpinAgain}
            className="rounded-xl bg-cream text-foreground py-3 font-extrabold font-display hover:scale-[1.02] transition-transform"
          >
            Spin again
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/15 hover:bg-white/25 text-white py-3 font-extrabold font-display"
          >
            Back to deck
          </button>
        </div>
      </div>

      {popup && (
        <WordTranslatePopup
          word={popup.word}
          sentence={popup.sentence}
          x={popup.x}
          y={popup.y}
          loading={popup.loading}
          hint={popup.hint}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
}

/* ---------------- Vocab sentence (clickable keyword) ---------------- */

function VocabSentence({
  sentence,
  keyWord,
  onWordClick,
}: {
  sentence: string;
  keyWord: string;
  onWordClick: (word: string, sentence: string, e: React.MouseEvent) => void;
}) {
  const idx = sentence.toLowerCase().indexOf(keyWord.toLowerCase());
  if (idx === -1) return <span>{sentence}</span>;
  const before = sentence.slice(0, idx);
  const match = sentence.slice(idx, idx + keyWord.length);
  const after = sentence.slice(idx + keyWord.length);
  return (
    <>
      {before}
      <button
        type="button"
        onClick={(e) => onWordClick(match, sentence, e)}
        className="inline-flex items-center rounded-md bg-white/25 hover:bg-white/40 transition-colors px-1.5 py-0.5 font-extrabold underline-offset-2"
      >
        {match}
      </button>
      {after}
    </>
  );
}

/* ---------------- Inline recorder ---------------- */

function Recorder() {
  const [state, setState] = useState<"idle" | "recording" | "scoring" | "done">("idle");
  const [transcript, setTranscript] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recRef.current = null;
  };

  useEffect(() => () => cleanup(), []);

  const start = async () => {
    setTranscript(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        cleanup();
        setState("scoring");
        try {
          const res = await fetch("/api/speaking/transcribe", {
            method: "POST",
            headers: { "Content-Type": blob.type },
            body: blob,
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Không xử lý được");
          setTranscript((data.transcript as string) || "");
          setState("done");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Lỗi");
          setState("idle");
        }
      };
      rec.start();
      recRef.current = rec;
      setState("recording");
    } catch {
      toast.error("Không truy cập được micro");
      cleanup();
      setState("idle");
    }
  };

  const stop = () => {
    if (recRef.current && recRef.current.state !== "inactive") {
      recRef.current.stop();
    }
  };

  return (
    <div className="mt-5">
      <div className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/85 mb-2">
        Practise speaking
      </div>
      {state === "idle" && (
        <button
          type="button"
          onClick={start}
          className="inline-flex items-center gap-2 rounded-full bg-cream text-foreground px-5 py-2.5 font-extrabold shadow"
        >
          <span className="inline-grid place-items-center h-2 w-2 rounded-full bg-rose-500" />
          Record your answer
        </button>
      )}
      {state === "recording" && (
        <button
          type="button"
          onClick={stop}
          className="inline-flex items-center gap-2 rounded-full bg-rose-500 text-white px-5 py-2.5 font-extrabold shadow animate-pulse"
        >
          <StopCircle className="h-4 w-4" /> Stop & transcribe
        </button>
      )}
      {state === "scoring" && (
        <div className="inline-flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang nhận dạng…
        </div>
      )}
      {state === "done" && transcript !== null && (
        <div className="mt-2 rounded-xl bg-white/15 border border-white/20 p-4">
          <div className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/85 mb-1">
            Transcript của bạn
          </div>
          <p className="text-sm leading-relaxed">
            {transcript || "(không nghe được gì)"}
          </p>
          <button
            type="button"
            onClick={start}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-bold"
          >
            <Mic className="h-3 w-3" /> Thu lại
          </button>
        </div>
      )}
    </div>
  );
}
