"use client";

/**
 * Word Chain ("Nối từ") — Last-Letter mini-game.
 *
 * Rules:
 *  - Starts from a random valid seed word.
 *  - Each new word must begin with the LAST letter(s) of the previous word.
 *  - No repeats within a run.
 *  - 10s countdown per turn; running out = Game Over.
 *  - Difficulty ramps: score < 5 → match last 1 letter; score ≥ 5 → last 2
 *    letters (e.g. "RI…"). Harder = longer required prefix.
 *  - Every submitted word is dictionary-checked async via /api/word-chain/validate.
 *    Invalid / wrong-start / repeat → reject, keep input, shake, and DO NOT
 *    reset the timer.
 *  - Streak (combo) grows with each accepted word and is lost on Game Over;
 *    the best streak is kept in localStorage.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Flame, Trophy, Timer, Link2, RotateCcw, Send, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const TURN_MS = 10_000;
const BEST_KEY = "bee_wordchain_best";

// Friendly, common seed words (valid dictionary words). Their final letter
// gives an easy first requirement (l / t / o / e / r …).
const SEED_WORDS = [
  "apple", "table", "river", "music", "water", "lemon", "garden", "pencil",
  "orange", "tiger", "planet", "ocean", "forest", "market", "animal", "rocket",
  "silver", "dragon", "butter", "candle", "flower", "jacket", "kitchen",
  "monkey", "number", "pepper", "rabbit", "summer", "ticket", "window",
  "yellow", "basket", "camera", "dinner", "engine", "future", "guitar",
  "hammer", "island", "jungle", "ladder", "mirror", "needle", "palace",
  "queen", "robot", "sunset", "temple", "violin", "wizard", "piano", "school",
];

/** Required prefix the next word must start with, given the last word + score. */
function requiredPrefix(lastWord: string, score: number): string {
  const len = Math.min(score >= 5 ? 2 : 1, lastWord.length);
  return lastWord.slice(-len).toLowerCase();
}

type Status = "idle" | "playing" | "over";

export function WordChainGame() {
  const [status, setStatus] = useState<Status>("idle");
  const [chain, setChain] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [shake, setShake] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TURN_MS);
  const [celebrate, setCelebrate] = useState<number | null>(null);
  const [lostStreak, setLostStreak] = useState(0);

  const usedRef = useRef<Set<string>>(new Set());
  const remainingRef = useRef(TURN_MS);
  const checkingRef = useRef(false);
  const streakRef = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    streakRef.current = streak;
  }, [streak]);

  // Load best streak once.
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
  const level = score >= 5 ? 2 : 1;

  const endGame = useCallback(() => {
    const s = streakRef.current;
    setLostStreak(s);
    setStreak(0); // chuỗi bị mất khi thua
    streakRef.current = 0;
    setStatus("over");
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

  // Countdown loop — pauses while a dictionary check is in flight so slow
  // network never costs the player their turn unfairly.
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
          endGame();
          return;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [status, endGame]);

  const resetTimer = () => {
    remainingRef.current = TURN_MS;
    setTimeLeft(TURN_MS);
  };

  const start = () => {
    const seed = SEED_WORDS[Math.floor(Math.random() * SEED_WORDS.length)];
    usedRef.current = new Set([seed]);
    setChain([seed]);
    setScore(0);
    setStreak(0);
    streakRef.current = 0;
    setInput("");
    setError(null);
    setCelebrate(null);
    resetTimer();
    setStatus("playing");
    setTimeout(() => inputRef.current?.focus(), 50);
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

    // Local rejections — no timer reset, keep input.
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

    // Dictionary check (timer pauses).
    setChecking(true);
    checkingRef.current = true;
    setError(null);
    try {
      const res = await fetch(`/api/word-chain/validate?word=${encodeURIComponent(w)}`);
      const data = (await res.json().catch(() => ({}))) as {
        valid?: boolean;
        error?: string;
      };
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
  }, [input, required, status]);

  const pct = Math.max(0, Math.min(100, (timeLeft / TURN_MS) * 100));
  const low = timeLeft <= 3500;
  const seconds = (timeLeft / 1000).toFixed(1);

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Header / scoreboard */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Stat icon={Link2} label="Nối được" value={score} tone="sky" />
        <Stat icon={Flame} label="Chuỗi" value={streak} tone="amber" pulse={streak > 0} />
        <Stat icon={Trophy} label="Kỷ lục" value={best} tone="violet" />
      </div>

      <div className="mt-4 rounded-3xl border-2 border-primary/25 bg-card shadow-xl overflow-hidden">
        {/* Timer bar */}
        <div className="relative h-3 w-full bg-muted">
          <div
            className={cn(
              "h-full transition-[width] duration-100 ease-linear",
              low ? "bg-rose-500" : "bg-gradient-to-r from-amber-400 to-amber-600",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="p-5 sm:p-7">
          {status === "idle" && <StartView onStart={start} />}

          {status !== "idle" && (
            <>
              {/* Requirement + timer */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Bắt đầu bằng
                  </span>
                  <span className="wc-pulse inline-flex items-center justify-center rounded-xl bg-amber-500 px-3 py-1.5 font-display text-xl font-extrabold uppercase text-white shadow">
                    {required || "—"}
                  </span>
                  {level === 2 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                      <Sparkles className="h-3 w-3" /> Khó: 2 chữ
                    </span>
                  )}
                </div>
                <div
                  className={cn(
                    "inline-flex items-center gap-1.5 font-display font-extrabold tabular-nums",
                    low ? "text-rose-600" : "text-foreground",
                  )}
                >
                  <Timer className="h-4 w-4" />
                  {seconds}s
                </div>
              </div>

              {/* Previous word with highlighted tail */}
              {lastWord && status === "playing" && (
                <div className="mt-4 text-center">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
                    Từ trước đó
                  </div>
                  <div className="mt-1 font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {renderHighlightedTail(lastWord, required.length)}
                  </div>
                </div>
              )}

              {/* Chain history */}
              <div className="mt-4 flex flex-wrap gap-2 justify-center max-h-40 overflow-y-auto rounded-2xl bg-muted/40 p-3">
                {chain.map((w, i) => (
                  <span
                    key={`${w}-${i}`}
                    className={cn(
                      "wc-pop rounded-full px-3 py-1 text-sm font-bold shadow-sm",
                      i === chain.length - 1
                        ? "bg-amber-500 text-white"
                        : "bg-card border border-border text-foreground/80",
                    )}
                  >
                    {w}
                  </span>
                ))}
              </div>

              {status === "playing" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                  }}
                  className="mt-5"
                >
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-2xl border-2 bg-background p-1.5 transition-colors",
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
                      {checking ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4" /> Nối
                        </>
                      )}
                    </button>
                  </div>
                  <div className="mt-2 h-5 text-center">
                    {error ? (
                      <span className="text-sm font-semibold text-rose-600">{error}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Gõ từ rồi nhấn Enter • không lặp lại từ cũ
                      </span>
                    )}
                  </div>
                </form>
              )}

              {status === "over" && (
                <GameOver score={score} lostStreak={lostStreak} best={best} onRestart={start} />
              )}
            </>
          )}
        </div>
      </div>

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

function Stat({
  icon: Icon,
  label,
  value,
  tone,
  pulse,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  tone: "sky" | "amber" | "violet";
  pulse?: boolean;
}) {
  const toneClass = {
    sky: "text-sky-600 dark:text-sky-400",
    amber: "text-amber-600 dark:text-amber-400",
    violet: "text-violet-600 dark:text-violet-400",
  }[tone];
  return (
    <div className="rounded-2xl border-2 border-border bg-card px-3 py-2.5 text-center shadow-sm">
      <Icon className={cn("mx-auto h-5 w-5", toneClass, pulse && "animate-pulse")} />
      <div className="mt-1 font-display text-2xl font-extrabold tabular-nums leading-none">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
        {label}
      </div>
    </div>
  );
}

function StartView({ onStart }: { onStart: () => void }) {
  return (
    <div className="py-6 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg">
        <Link2 className="h-8 w-8" />
      </div>
      <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight">Nối Từ</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Nối từ tiếng Anh bằng <b>chữ cái cuối</b> của từ trước. Mỗi lượt 10 giây.
        Sau 5 từ, độ khó tăng — phải nối bằng <b>2 chữ cái cuối</b>!
      </p>
      <ul className="mx-auto mt-3 max-w-sm text-left text-xs text-muted-foreground space-y-1">
        <li>• Từ phải có nghĩa (kiểm tra theo từ điển Anh).</li>
        <li>• Không lặp lại từ đã dùng.</li>
        <li>• Hết giờ là thua — và mất chuỗi đang có 🔥</li>
      </ul>
      <button
        onClick={onStart}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-extrabold text-primary-foreground shadow-lg hover:scale-105 active:scale-95 transition-transform"
      >
        Bắt đầu chơi
      </button>
    </div>
  );
}

function GameOver({
  score,
  lostStreak,
  best,
  onRestart,
}: {
  score: number;
  lostStreak: number;
  best: number;
  onRestart: () => void;
}) {
  return (
    <div className="py-4 text-center">
      <div className="font-display text-3xl font-extrabold tracking-tight">Hết giờ! ⏰</div>
      <div className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-muted px-5 py-3">
        <span className="text-sm text-muted-foreground">Bạn nối được</span>
        <span className="font-display text-3xl font-extrabold text-amber-600">{score}</span>
        <span className="text-sm text-muted-foreground">từ</span>
      </div>
      {lostStreak > 0 && (
        <p className="mt-3 text-sm font-semibold text-rose-600">
          💔 Bạn vừa mất chuỗi {lostStreak} 🔥
        </p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        Kỷ lục chuỗi của bạn: <b className="text-foreground">{best}</b>
      </p>
      <button
        onClick={onRestart}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 font-extrabold text-primary-foreground shadow-lg hover:scale-105 active:scale-95 transition-transform"
      >
        <RotateCcw className="h-4 w-4" /> Chơi lại
      </button>
    </div>
  );
}

/** Render a word with its last `n` letters highlighted (the required prefix). */
function renderHighlightedTail(word: string, n: number) {
  const cut = Math.max(0, word.length - Math.max(1, n));
  const head = word.slice(0, cut);
  const tail = word.slice(cut);
  return (
    <>
      <span className="text-foreground/70">{head}</span>
      <span className="rounded-md bg-amber-400/30 px-1 text-amber-700 dark:text-amber-300 underline decoration-amber-500 decoration-2">
        {tail}
      </span>
    </>
  );
}
