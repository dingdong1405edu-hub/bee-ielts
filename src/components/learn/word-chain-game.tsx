"use client";

/**
 * Word Chain ("Nối từ") — Last-Letter mini-game, styled after the Roblox
 * "Last Letter" arena: bright sky scene, big outlined prompt, white letter
 * TILES for the required start, a circular countdown clock, and hearts (lives).
 *
 * Rules:
 *  - Each word must begin with the LAST letter(s) of the previous word.
 *  - 10s per turn. Run out → lose a heart; out of hearts → Game Over.
 *  - score < 5 → match last 1 letter; score ≥ 5 → last 2 letters (harder).
 *  - Words dictionary-checked async (/api/word-chain/validate). Invalid /
 *    wrong-start / repeat → reject, keep input, shake, DON'T reset the timer
 *    and DON'T cost a heart (only a timeout costs a heart).
 *  - Streak (combo) grows per accepted word, resets on a timeout, lost on
 *    Game Over; best streak saved to localStorage.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, Loader2, RotateCcw, Send, Flame, Trophy, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TURN_MS = 10_000;
const MAX_LIVES = 3;
const BEST_KEY = "bee_wordchain_best";

const SEED_WORDS = [
  "apple", "table", "river", "music", "water", "lemon", "garden", "pencil",
  "orange", "tiger", "planet", "ocean", "forest", "market", "animal", "rocket",
  "silver", "dragon", "butter", "candle", "flower", "jacket", "kitchen",
  "monkey", "number", "pepper", "rabbit", "summer", "ticket", "window",
  "yellow", "basket", "camera", "dinner", "engine", "future", "guitar",
  "hammer", "island", "jungle", "ladder", "mirror", "needle", "palace",
  "queen", "robot", "sunset", "temple", "violin", "wizard", "piano", "school",
];

function requiredPrefix(lastWord: string, score: number): string {
  const len = Math.min(score >= 5 ? 2 : 1, lastWord.length);
  return lastWord.slice(-len).toLowerCase();
}

type Status = "idle" | "playing" | "over";

export function WordChainGame({ playerName }: { playerName?: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [chain, setChain] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [shake, setShake] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TURN_MS);
  const [celebrate, setCelebrate] = useState<number | null>(null);
  const [peak, setPeak] = useState(0);

  const usedRef = useRef<Set<string>>(new Set());
  const remainingRef = useRef(TURN_MS);
  const checkingRef = useRef(false);
  const livesRef = useRef(MAX_LIVES);
  const peakRef = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(BEST_KEY) || 0);
      if (Number.isFinite(v)) setBest(v);
    } catch {
      /* ignore */
    }
  }, []);

  const lastWord = chain.length > 0 ? chain[chain.length - 1] : "";
  const required = lastWord ? requiredPrefix(lastWord, score) : "";
  const hard = score >= 5;

  const resetTimer = () => {
    remainingRef.current = TURN_MS;
    setTimeLeft(TURN_MS);
  };

  /** Start a fresh sub-chain from a random seed not yet used this game. */
  const seedNewChain = useCallback(() => {
    let seed = SEED_WORDS[Math.floor(Math.random() * SEED_WORDS.length)];
    for (let i = 0; i < 8 && usedRef.current.has(seed); i++) {
      seed = SEED_WORDS[Math.floor(Math.random() * SEED_WORDS.length)];
    }
    usedRef.current.add(seed);
    setChain([seed]);
    setInput("");
    setError(null);
    resetTimer();
    setTimeout(() => inputRef.current?.focus(), 30);
  }, []);

  const saveBest = useCallback((s: number) => {
    setBest((b) => {
      const nb = Math.max(b, s);
      try {
        localStorage.setItem(BEST_KEY, String(nb));
      } catch {
        /* ignore */
      }
      return nb;
    });
  }, []);

  const onTimeout = useCallback(() => {
    setStreak(0);
    const nextLives = livesRef.current - 1;
    livesRef.current = nextLives;
    setLives(nextLives);
    if (nextLives <= 0) {
      setStatus("over");
      saveBest(peakRef.current);
      return;
    }
    // Mất 1 tim → chơi tiếp với chữ mới.
    seedNewChain();
  }, [saveBest, seedNewChain]);

  // Countdown loop — pauses while a dictionary check is in flight.
  useEffect(() => {
    if (status !== "playing") return;
    let raf = 0;
    let last = performance.now();
    const loop = (ts: number) => {
      const dt = ts - last;
      last = ts;
      if (!checkingRef.current) {
        remainingRef.current = Math.max(0, remainingRef.current - dt);
        setTimeLeft(remainingRef.current);
        if (remainingRef.current <= 0) {
          onTimeout();
          last = performance.now();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [status, onTimeout]);

  const start = () => {
    usedRef.current = new Set();
    setScore(0);
    setStreak(0);
    setPeak(0);
    peakRef.current = 0;
    setLives(MAX_LIVES);
    livesRef.current = MAX_LIVES;
    setCelebrate(null);
    setStatus("playing");
    seedNewChain();
  };

  const flashError = (msg: string) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 450);
  };

  const submit = useCallback(async () => {
    if (status !== "playing" || checkingRef.current) return;
    const w = input.trim().toLowerCase();
    if (!w) return;

    if (!/^[a-z][a-z'-]*[a-z]$/.test(w)) {
      flashError("Chỉ dùng chữ cái tiếng Anh (ít nhất 2 ký tự).");
      return;
    }
    if (required && !w.startsWith(required)) {
      flashError(`Từ phải bắt đầu bằng "${required.toUpperCase()}".`);
      return;
    }
    if (usedRef.current.has(w)) {
      flashError("Từ này đã dùng rồi — thử từ khác nhé!");
      return;
    }

    setChecking(true);
    checkingRef.current = true;
    setError(null);
    try {
      const res = await fetch(`/api/word-chain/validate?word=${encodeURIComponent(w)}`);
      const data = (await res.json().catch(() => ({}))) as { valid?: boolean; error?: string };
      if (data.error === "network") {
        flashError("Không kiểm tra được từ, thử lại nhé.");
        return;
      }
      if (!data.valid) {
        flashError("Không phải từ tiếng Anh hợp lệ.");
        return;
      }
      // Accept!
      usedRef.current.add(w);
      setChain((c) => [...c, w]);
      setScore((s) => s + 1);
      setStreak((s) => {
        const ns = s + 1;
        if (ns > peakRef.current) {
          peakRef.current = ns;
          setPeak(ns);
          saveBest(ns);
        }
        if (ns > 0 && ns % 5 === 0) {
          setCelebrate(ns);
          setTimeout(() => setCelebrate(null), 1400);
        }
        return ns;
      });
      setInput("");
      setError(null);
      resetTimer();
      setTimeout(() => inputRef.current?.focus(), 20);
    } catch {
      flashError("Không kiểm tra được từ, thử lại nhé.");
    } finally {
      setChecking(false);
      checkingRef.current = false;
    }
  }, [input, required, status, saveBest]);

  const frac = Math.max(0, Math.min(1, timeLeft / TURN_MS));
  const low = timeLeft <= 3500;
  const seconds = (timeLeft / 1000).toFixed(1);
  const tiles = (required || "?").toUpperCase().split("");

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Scoreboard */}
      <div className="mb-3 flex items-center justify-center gap-2 sm:gap-3">
        <Badge icon={Link2} label="Nối được" value={score} tone="text-sky-600 dark:text-sky-400" />
        <Badge icon={Flame} label="Chuỗi" value={streak} tone="text-amber-600 dark:text-amber-400" />
        <Badge icon={Trophy} label="Kỷ lục" value={best} tone="text-violet-600 dark:text-violet-400" />
      </div>

      {/* === ARENA === */}
      <div className="relative overflow-hidden rounded-[28px] border-4 border-white/70 shadow-2xl">
        {/* Sky + scenery */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(#5cb8f2 0%, #8fd0f7 55%, #bfe7ff 100%)" }} />
        <span aria-hidden className="absolute top-6 left-8 h-10 w-24 rounded-full bg-white/70 blur-[2px]" />
        <span aria-hidden className="absolute top-12 right-10 h-8 w-28 rounded-full bg-white/60 blur-[2px]" />
        <span aria-hidden className="absolute top-4 right-1/3 h-7 w-20 rounded-full bg-white/50 blur-[2px]" />
        {/* Ground */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3" style={{ background: "linear-gradient(#7fc36b, #5ba84f)" }} />
        <div aria-hidden className="absolute inset-x-0 bottom-[33%] h-3 bg-[#3f7d3a]/40" />

        <div className="relative px-4 py-6 sm:px-8 sm:py-8 min-h-[340px] flex flex-col items-center">
          {status === "idle" ? (
            <StartView onStart={start} />
          ) : status === "over" ? (
            <GameOver score={score} peak={peak} best={best} onRestart={start} />
          ) : (
            <>
              {/* Prompt */}
              <h2
                className="text-center font-display text-xl sm:text-2xl font-extrabold text-white leading-tight"
                style={{ textShadow: "0 2px 0 rgba(0,0,0,.35), 0 0 10px rgba(0,0,0,.25)" }}
              >
                {playerName ? `${playerName}, ` : ""}nhập từ tiếng Anh bắt đầu bằng:
              </h2>

              {/* Letter tiles */}
              <div className="mt-4 flex items-center justify-center gap-2">
                {tiles.map((ch, i) => (
                  <span
                    key={`${required}-${i}`}
                    className="wc-pop grid h-12 w-12 sm:h-16 sm:w-16 place-items-center rounded-2xl bg-white text-[#1f2937] font-display text-2xl sm:text-4xl font-extrabold shadow-lg ring-2 ring-black/10"
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    {ch}
                  </span>
                ))}
              </div>
              {hard && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow">
                  Khó: 2 chữ cái
                </span>
              )}

              {/* Circular timer */}
              <div className="relative mt-5 h-24 w-24 sm:h-28 sm:w-28">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r="44" fill="rgba(255,255,255,.55)" stroke="rgba(0,0,0,.15)" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke={low ? "#ef4444" : "#f59e0b"}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 44}
                    strokeDashoffset={(1 - frac) * 2 * Math.PI * 44}
                    style={{ transition: "stroke-dashoffset 80ms linear" }}
                  />
                </svg>
                <div
                  className={cn(
                    "absolute inset-0 grid place-items-center font-display text-2xl sm:text-3xl font-extrabold tabular-nums",
                    low ? "text-rose-600" : "text-amber-700",
                  )}
                >
                  {seconds}
                  <span className="text-sm">s</span>
                </div>
              </div>

              {/* Hearts */}
              <div className="mt-4 flex items-center gap-1.5">
                {Array.from({ length: MAX_LIVES }).map((_, i) => (
                  <Heart
                    key={i}
                    className={cn(
                      "h-7 w-7 drop-shadow",
                      i < lives ? "fill-rose-500 text-rose-600" : "fill-black/20 text-black/30",
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Input row (outside arena, always visible while playing) */}
      {status === "playing" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="mt-4"
        >
          <div
            className={cn(
              "flex items-center gap-2 rounded-2xl border-2 bg-card p-1.5 transition-colors",
              error ? "border-rose-400" : "border-primary/30 focus-within:border-primary",
              shake && "wc-shake",
            )}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value.replace(/[^a-zA-Z'-]/g, ""))}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              placeholder={required ? `${required}…` : "nhập từ"}
              className="flex-1 bg-transparent px-3 py-2.5 text-lg font-bold outline-none placeholder:text-muted-foreground/60 lowercase"
            />
            <button
              type="submit"
              disabled={checking || !input.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 font-extrabold text-primary-foreground shadow disabled:opacity-50 active:scale-95 transition-transform"
            >
              {checking ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Send className="h-4 w-4" /> Nối</>}
            </button>
          </div>
          <div className="mt-2 h-5 text-center">
            {error ? (
              <span className="text-sm font-semibold text-rose-600">{error}</span>
            ) : (
              <span className="text-xs text-muted-foreground">Nhấn Enter để gửi • không lặp lại từ cũ</span>
            )}
          </div>

          {/* Recent words in the current chain */}
          {chain.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
              {chain.slice(-6).map((w, i, a) => (
                <span
                  key={`${w}-${i}`}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-bold",
                    i === a.length - 1 ? "bg-amber-500 text-white" : "bg-muted text-foreground/70",
                  )}
                >
                  {w}
                </span>
              ))}
            </div>
          )}
        </form>
      )}

      {/* Streak milestone celebration */}
      {celebrate != null && (
        <div className="pointer-events-none fixed inset-0 z-[70] grid place-items-center">
          <div className="wc-burst rounded-3xl bg-amber-500/95 px-8 py-5 text-center text-white shadow-2xl">
            <Flame className="mx-auto h-10 w-10" />
            <div className="font-display text-3xl font-extrabold mt-1">Chuỗi {celebrate}! 🔥</div>
            <div className="text-sm text-white/90">Tuyệt vời, giữ phong độ nhé!</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- sub-views ---------------- */

function Badge({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border-2 border-border bg-card px-3 py-1.5 shadow-sm">
      <Icon className={cn("h-4 w-4", tone)} />
      <span className="font-display text-lg font-extrabold tabular-nums leading-none">{value}</span>
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}

function StartView({ onStart }: { onStart: () => void }) {
  return (
    <div className="m-auto text-center text-white">
      <div
        className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white text-sky-600 shadow-lg"
      >
        <Link2 className="h-8 w-8" />
      </div>
      <h2
        className="mt-3 font-display text-3xl font-extrabold"
        style={{ textShadow: "0 2px 0 rgba(0,0,0,.35)" }}
      >
        Nối Từ
      </h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-white/95" style={{ textShadow: "0 1px 2px rgba(0,0,0,.3)" }}>
        Nối từ theo <b>chữ cái cuối</b>. Mỗi lượt 10 giây — hết giờ mất 1 ❤️.
        Có 3 mạng. Sau 5 từ phải nối <b>2 chữ cuối</b>!
      </p>
      <button
        onClick={onStart}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 font-extrabold text-sky-700 shadow-lg hover:scale-105 active:scale-95 transition-transform"
      >
        Bắt đầu chơi
      </button>
    </div>
  );
}

function GameOver({
  score,
  peak,
  best,
  onRestart,
}: {
  score: number;
  peak: number;
  best: number;
  onRestart: () => void;
}) {
  return (
    <div className="m-auto text-center text-white">
      <div className="font-display text-4xl font-extrabold" style={{ textShadow: "0 2px 0 rgba(0,0,0,.35)" }}>
        Game Over 💔
      </div>
      <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white/90 px-5 py-3 text-foreground shadow-lg">
        <span className="text-sm text-muted-foreground">Bạn nối được</span>
        <span className="font-display text-3xl font-extrabold text-amber-600">{score}</span>
        <span className="text-sm text-muted-foreground">từ</span>
      </div>
      <p className="mt-3 text-sm font-semibold" style={{ textShadow: "0 1px 2px rgba(0,0,0,.3)" }}>
        🔥 Chuỗi cao nhất ván này: {peak} — và bạn đã mất nó!
      </p>
      <p className="mt-0.5 text-xs text-white/90" style={{ textShadow: "0 1px 2px rgba(0,0,0,.3)" }}>
        Kỷ lục chuỗi: <b>{best}</b>
      </p>
      <button
        onClick={onRestart}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 font-extrabold text-sky-700 shadow-lg hover:scale-105 active:scale-95 transition-transform"
      >
        <RotateCcw className="h-4 w-4" /> Chơi lại
      </button>
    </div>
  );
}
