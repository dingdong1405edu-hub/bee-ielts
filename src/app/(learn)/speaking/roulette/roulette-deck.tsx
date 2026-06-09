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
import { toast } from "sonner";
import {
  ArrowLeft,
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

/** Tailwind-friendly hue→class map. Keys must match the seed file's
 *  HUES tuple so adding a new colour stays a one-line change. */
const HUE_STYLES: Record<
  string,
  { bg: string; bgSoft: string; ring: string; text: string; chipBg: string }
> = {
  rose: {
    bg: "bg-rose-500",
    bgSoft: "bg-rose-100 dark:bg-rose-950/40",
    ring: "ring-rose-300",
    text: "text-rose-50",
    chipBg: "bg-rose-700/40",
  },
  amber: {
    bg: "bg-amber-500",
    bgSoft: "bg-amber-100 dark:bg-amber-950/40",
    ring: "ring-amber-300",
    text: "text-amber-50",
    chipBg: "bg-amber-700/40",
  },
  emerald: {
    bg: "bg-emerald-600",
    bgSoft: "bg-emerald-100 dark:bg-emerald-950/40",
    ring: "ring-emerald-300",
    text: "text-emerald-50",
    chipBg: "bg-emerald-800/40",
  },
  sky: {
    bg: "bg-sky-600",
    bgSoft: "bg-sky-100 dark:bg-sky-950/40",
    ring: "ring-sky-300",
    text: "text-sky-50",
    chipBg: "bg-sky-800/40",
  },
  violet: {
    bg: "bg-violet-600",
    bgSoft: "bg-violet-100 dark:bg-violet-950/40",
    ring: "ring-violet-300",
    text: "text-violet-50",
    chipBg: "bg-violet-800/40",
  },
  teal: {
    bg: "bg-teal-600",
    bgSoft: "bg-teal-100 dark:bg-teal-950/40",
    ring: "ring-teal-300",
    text: "text-teal-50",
    chipBg: "bg-teal-800/40",
  },
};

function hueOf(name: string) {
  return HUE_STYLES[name] ?? HUE_STYLES.amber;
}

export function RouletteDeck({ cards }: { cards: RouletteCard[] }) {
  const [part, setPart] = useState<PartTab>(1);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);

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
    <div className="relative min-h-[80vh] -mx-4 sm:-mx-6 md:-mx-8 -mt-4 md:-mt-6 px-4 sm:px-6 md:px-8 py-6 rounded-3xl overflow-hidden bg-[#5e7a3f] dark:bg-[#3b5128] text-white">
      {/* Felt-table grid texture — pure CSS so we don't ship an asset. */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
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
            className="inline-flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur px-3 py-1.5 text-sm font-bold opacity-80"
            title="Multiplayer sắp ra mắt — chơi cùng bạn bè"
            onClick={() => toast("Multiplayer sắp ra mắt — chơi cùng bạn bè!")}
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

        <div className="flex flex-col items-center gap-2 mt-2">
          <button
            type="button"
            onClick={spin}
            disabled={spinning || filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-cream text-[#3b5128] px-8 py-3 font-extrabold text-lg shadow-xl shadow-black/20 hover:scale-105 transition-transform disabled:opacity-50 font-display"
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
          <p className="text-xs text-white/70">
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
      <div className="h-[260px] grid place-items-center text-white/80">
        Chưa có thẻ nào ở Part này.
      </div>
    );
  }
  const n = cards.length;
  // Spread cards along an arc from -ARC/2 deg to +ARC/2 deg.
  const ARC = Math.min(110, n * 8);

  return (
    <div className="relative h-[260px] md:h-[300px] flex items-end justify-center select-none">
      {cards.map((c, i) => {
        const t = n === 1 ? 0 : i / (n - 1);
        const angle = -ARC / 2 + ARC * t;
        const hue = hueOf(c.hue);
        const highlighted = highlightedId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onPick(c.id)}
            className={cn(
              "absolute bottom-0 origin-bottom transition-transform duration-300",
              highlighted ? "z-50 -translate-y-3 scale-105" : "z-0 hover:-translate-y-2",
            )}
            style={{
              transform: `rotate(${angle}deg) translateX(0) translateY(0)`,
              transformOrigin: "bottom center",
            }}
            aria-label={`Topic: ${c.topic}`}
          >
            <div
              className={cn(
                "h-44 w-28 md:h-56 md:w-36 rounded-xl shadow-xl shadow-black/40 ring-2 ring-white/30 flex flex-col items-center p-2 text-center relative overflow-hidden",
                hue.bg,
                hue.text,
                highlighted && "ring-4 ring-white",
              )}
            >
              {/* Big "?" centered (mystery look) */}
              <div className="absolute inset-0 grid place-items-center text-white/40 text-5xl md:text-6xl font-extrabold">
                ?
              </div>
              {/* Topic label at the top edge */}
              <span className="relative text-[10px] md:text-xs font-extrabold uppercase tracking-[0.18em] line-clamp-1 max-w-full">
                {c.topic}
              </span>
              {/* Card-back lines decoration */}
              <span
                aria-hidden
                className="absolute bottom-2 left-2 right-2 h-12 rounded-md border-2 border-white/20"
              />
              <span
                aria-hidden
                className="absolute bottom-3 left-3 right-3 h-10 rounded-md border-2 border-white/15"
              />
            </div>
          </button>
        );
      })}
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
