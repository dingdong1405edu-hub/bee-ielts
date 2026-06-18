"use client";
/**
 * Speaking Roulette multiplayer room — turn-based, polling-driven, FULL-SCREEN.
 *
 * The room renders as a fixed overlay (z-[60]) that covers the app shell —
 * sidebar + top nav are hidden so the game owns the whole viewport. "Rời phòng"
 * returns to /speaking.
 *
 * The room has 3 states the UI renders:
 *   - WAITING (lobby): invite code + players + "Bắt đầu" (any member can start)
 *   - PLAYING: current card + whose turn + Record (your turn) or a waiting
 *     screen. ANY member can "Spin lượt tiếp" once everyone answered the turn —
 *     the deck shuffles to a random card.
 *   - FINISHED: leaderboard + "Chơi tiếp".
 *
 * Polling every 2s via GET /rooms/[code] also carries chat + emoji messages.
 * Players can chat and fire emoji reactions (float up on everyone's screen),
 * with Web-Audio sound effects on spins, your-turn, scores and reactions.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  Crown,
  Loader2,
  Mic,
  RefreshCw,
  StopCircle,
  Trophy,
  MessageCircle,
  Send,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  playSwooshSfx,
  playCorrectSfx,
  playSegmentDoneSfx,
  playPopSfx,
} from "@/lib/quiz-sfx";

interface PlayerRow {
  userId: string;
  name: string;
  avatarUrl: string | null;
  score: number;
  lastSubmittedTurn: number;
  isHost: boolean;
}

interface ChatMsg {
  id: string;
  userId: string;
  name: string;
  kind: "chat" | "emoji";
  text: string;
  createdAt: string;
}

interface RoomState {
  code: string;
  hostId: string;
  part: 1 | 2 | 3;
  status: "WAITING" | "PLAYING" | "FINISHED";
  currentTurn: number;
  totalTurns: number;
  currentCard: {
    id: string;
    topic: string;
    question: string;
    talkPoints: string[];
    vocab: { sentence: string; keyWord: string }[];
    hue: string;
  } | null;
  currentPlayerId: string | null;
  meId: string;
  iAmHost: boolean;
  iAmCurrentPlayer: boolean;
  iHaveSubmittedThisTurn: boolean;
  players: PlayerRow[];
  messages: ChatMsg[];
}

const HUE_BG: Record<string, string> = {
  rose: "bg-rose-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-600",
  sky: "bg-sky-600",
  violet: "bg-violet-600",
  teal: "bg-teal-600",
};

const EMOJIS = ["👍", "😂", "🔥", "👏", "❤️", "😮", "🎉", "💪"];

interface Float {
  key: string;
  emoji: string;
  left: number;
}

export function RoomClient({ code }: { code: string }) {
  const router = useRouter();
  const [state, setState] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spinBusy, setSpinBusy] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [floats, setFloats] = useState<Float[]>([]);

  // SFX / reaction trackers — seeded on first poll so we don't replay history.
  const seededRef = useRef(false);
  const prevCardIdRef = useRef<string | null>(null);
  const prevMyTurnRef = useRef(false);
  const seenMsgRef = useRef<Set<string>>(new Set());
  const meIdRef = useRef<string>("");

  const pushFloat = useCallback((emoji: string) => {
    const key = `${Date.now()}-${Math.random()}`;
    const left = 8 + Math.random() * 78;
    setFloats((f) => [...f, { key, emoji, left }]);
    window.setTimeout(() => {
      setFloats((f) => f.filter((x) => x.key !== key));
    }, 2400);
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/speaking/roulette/rooms/${code}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Không tải được phòng");
        return;
      }
      const next = data as RoomState;
      meIdRef.current = next.meId;

      // ---- side effects vs the previous snapshot (skip on first seed) ----
      if (!seededRef.current) {
        seededRef.current = true;
        prevCardIdRef.current = next.currentCard?.id ?? null;
        prevMyTurnRef.current = next.iAmCurrentPlayer && !next.iHaveSubmittedThisTurn;
        for (const m of next.messages) seenMsgRef.current.add(m.id);
      } else {
        // New card drawn → swoosh.
        const cardId = next.currentCard?.id ?? null;
        if (cardId && cardId !== prevCardIdRef.current) playSwooshSfx();
        prevCardIdRef.current = cardId;

        // It just became my turn → chime.
        const myTurn = next.iAmCurrentPlayer && !next.iHaveSubmittedThisTurn;
        if (myTurn && !prevMyTurnRef.current) playCorrectSfx();
        prevMyTurnRef.current = myTurn;

        // New messages → float emoji + pop; surface others' chat as a tick.
        for (const m of next.messages) {
          if (seenMsgRef.current.has(m.id)) continue;
          seenMsgRef.current.add(m.id);
          if (m.kind === "emoji") {
            pushFloat(m.text);
            if (m.userId !== next.meId) playPopSfx();
          }
        }
      }

      setState(next);
      setError(null);
    } catch {
      // Network blip — keep last state, try again next tick.
    } finally {
      setLoading(false);
    }
  }, [code, pushFloat]);

  useEffect(() => {
    poll();
  }, [poll]);
  useEffect(() => {
    if (state?.status === "FINISHED") return;
    const id = window.setInterval(poll, 2000);
    return () => window.clearInterval(id);
  }, [poll, state?.status]);

  const onSpin = async () => {
    setSpinBusy(true);
    try {
      const res = await fetch(`/api/speaking/roulette/rooms/${code}/spin`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Spin lỗi");
      playSwooshSfx();
      await poll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setSpinBusy(false);
    }
  };

  const sendMessage = useCallback(
    async (kind: "chat" | "emoji", text: string) => {
      const body = text.trim();
      if (!body) return;
      // Optimistic local reaction so the sender gets instant feedback.
      if (kind === "emoji") {
        pushFloat(body);
        playPopSfx();
      }
      try {
        await fetch(`/api/speaking/roulette/rooms/${code}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, text: body }),
        });
        await poll();
      } catch {
        /* best-effort */
      }
    },
    [code, poll, pushFloat],
  );

  const exitToSpeaking = () => router.push("/speaking");

  const overlayBg = {
    background:
      "radial-gradient(ellipse at 50% 30%, #6f9450 0%, #4d6735 55%, #2f4220 100%)",
  } as const;

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] grid place-items-center text-white" style={overlayBg}>
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  if (error || !state) {
    return (
      <div className="fixed inset-0 z-[60] grid place-items-center text-white px-4" style={overlayBg}>
        <div className="text-center space-y-4">
          <p className="text-rose-200 font-bold">{error || "Không tìm thấy phòng"}</p>
          <button
            onClick={exitToSpeaking}
            className="inline-flex items-center gap-1.5 rounded-full bg-cream text-[#3b5128] px-5 py-2.5 font-extrabold"
          >
            <ArrowLeft className="h-4 w-4" /> Về Speaking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col text-white overflow-hidden" style={overlayBg}>
      {/* grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* floating emoji reactions */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
        {floats.map((f) => (
          <span
            key={f.key}
            className="roulette-emoji-float absolute bottom-28 text-4xl"
            style={{ left: `${f.left}%` }}
          >
            {f.emoji}
          </span>
        ))}
      </div>

      <div className="relative z-[10] flex flex-1 min-h-0">
        {/* MAIN COLUMN */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <Header
              code={code}
              part={state.part}
              status={state.status}
              onExit={exitToSpeaking}
              onOpenChat={() => setChatOpen(true)}
              unread={0}
            />

            {state.status === "WAITING" && (
              <Lobby state={state} onStart={onSpin} busy={spinBusy} />
            )}

            {state.status === "PLAYING" && state.currentCard && (
              <PlayingView
                state={state}
                onAfterSubmit={poll}
                onSpin={onSpin}
                busy={spinBusy}
              />
            )}

            {state.status === "FINISHED" && <Leaderboard state={state} onExit={exitToSpeaking} />}

            {state.status !== "FINISHED" && <PlayerStrip state={state} />}

            <EmojiBar onPick={(e) => sendMessage("emoji", e)} />
          </div>
        </div>

        {/* CHAT PANEL (static on desktop, drawer on mobile) */}
        <ChatPanel
          messages={state.messages}
          meId={state.meId}
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          onSend={(t) => sendMessage("chat", t)}
        />
      </div>
    </div>
  );
}

/* ---------------- subcomponents ---------------- */

function Header({
  code,
  part,
  status,
  onExit,
  onOpenChat,
}: {
  code: string;
  part: number;
  status: string;
  onExit: () => void;
  onOpenChat: () => void;
  unread?: number;
}) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <button
        onClick={onExit}
        className="inline-flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur px-3 py-1.5 text-sm font-bold"
      >
        <ArrowLeft className="h-4 w-4" /> Rời phòng
      </button>
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-display">
          Speaking Roulette · Part {part}
        </h1>
        <p className="text-[11px] text-white/70 uppercase tracking-[0.18em] font-bold">
          {status === "WAITING" ? "Sảnh chờ" : status === "PLAYING" ? "Đang chơi" : "Kết thúc"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenChat}
          className="lg:hidden inline-flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur px-3 py-1.5 text-sm font-bold"
          aria-label="Mở chat"
        >
          <MessageCircle className="h-4 w-4" /> Chat
        </button>
        <CopyCode code={code} />
      </div>
    </div>
  );
}

function CopyCode({ code }: { code: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        const url = `${window.location.origin}/speaking/roulette/room/${code}`;
        void navigator.clipboard.writeText(url);
        toast.success("Đã copy link mời");
      }}
      className="inline-flex items-center gap-1.5 rounded-full bg-cream text-[#3b5128] px-4 py-1.5 text-sm font-extrabold shadow"
    >
      <Copy className="h-3.5 w-3.5" />
      {code}
    </button>
  );
}

function Lobby({
  state,
  onStart,
  busy,
}: {
  state: RoomState;
  onStart: () => void;
  busy: boolean;
}) {
  const canStart = state.players.length >= 2;
  return (
    <div className="rounded-3xl bg-black/20 backdrop-blur p-6 md:p-8 text-center space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] font-bold text-white/70 mb-2">Mã phòng</p>
        <div className="text-5xl md:text-6xl font-extrabold tracking-[0.2em] font-display">
          {state.code}
        </div>
        <p className="text-sm text-white/80 mt-3">
          Chia sẻ mã hoặc link với bạn bè để cùng chơi · {state.totalTurns} lượt
        </p>
      </div>

      <button
        type="button"
        onClick={onStart}
        disabled={busy || !canStart}
        className="inline-flex items-center gap-2 rounded-full bg-cream text-[#3b5128] px-8 py-3 font-extrabold text-lg shadow-xl hover:scale-105 transition-transform disabled:opacity-50 font-display"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
        Bắt đầu game
      </button>
      {!canStart && (
        <p className="text-xs text-amber-300">Cần ít nhất 2 người chơi để bắt đầu.</p>
      )}
    </div>
  );
}

function PlayingView({
  state,
  onAfterSubmit,
  onSpin,
  busy,
}: {
  state: RoomState;
  onAfterSubmit: () => Promise<void>;
  onSpin: () => void;
  busy: boolean;
}) {
  const hue = HUE_BG[state.currentCard?.hue ?? "amber"] ?? HUE_BG.amber;
  const card = state.currentCard!;
  const currentPlayer = state.players.find((p) => p.userId === state.currentPlayerId);
  const everyoneSubmittedThisTurn = state.players.every(
    (p) => p.lastSubmittedTurn >= state.currentTurn,
  );
  return (
    <div className="space-y-4">
      <div className={cn("rounded-3xl p-6 md:p-8 shadow-2xl", hue)}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2 text-white/90">
          <span className="text-[11px] uppercase tracking-[0.2em] font-extrabold">
            Lượt {state.currentTurn}/{state.totalTurns} · {card.topic}
          </span>
          <span className="text-[11px] uppercase tracking-[0.2em] font-extrabold">
            🎤 {currentPlayer?.name ?? "—"}
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold leading-tight font-display text-white">
          {card.question}
        </h2>
        <div className="mt-4 grid gap-1.5 text-white/95">
          {card.talkPoints.map((p, i) => (
            <div key={i} className="text-sm md:text-base">
              <span className="font-extrabold mr-2">{i + 1}.</span>
              {p}
            </div>
          ))}
        </div>
      </div>

      {state.iAmCurrentPlayer && !state.iHaveSubmittedThisTurn ? (
        <TurnRecorder code={state.code} onAfter={onAfterSubmit} />
      ) : state.iAmCurrentPlayer ? (
        <div className="rounded-2xl bg-emerald-600/40 backdrop-blur p-4 text-center text-emerald-50 font-bold">
          ✅ Bạn đã nộp lượt này — bấm Spin để qua câu tiếp.
        </div>
      ) : (
        <div className="rounded-2xl bg-black/25 backdrop-blur p-4 text-center text-white/90 font-bold">
          {currentPlayer?.name} đang trả lời — cổ vũ họ nào!
        </div>
      )}

      {/* Any member can spin once everyone answered this turn. */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onSpin}
          disabled={busy || !everyoneSubmittedThisTurn}
          className="inline-flex items-center gap-2 rounded-full bg-cream text-[#3b5128] px-6 py-2.5 font-extrabold shadow disabled:opacity-50 font-display"
          title={everyoneSubmittedThisTurn ? "Đảo câu & sang lượt tiếp" : "Đợi người chơi nộp xong"}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Spin lượt tiếp
        </button>
      </div>
    </div>
  );
}

function TurnRecorder({
  code,
  onAfter,
}: {
  code: string;
  onAfter: () => Promise<void>;
}) {
  const [state, setState] = useState<"idle" | "recording" | "scoring" | "done">("idle");
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [earned, setEarned] = useState<number | null>(null);
  const [transcript, setTranscript] = useState<string>("");

  const cleanup = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recRef.current = null;
  };
  useEffect(() => () => cleanup(), []);

  const start = async () => {
    setEarned(null);
    setTranscript("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
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
          const txRes = await fetch("/api/speaking/transcribe", {
            method: "POST",
            headers: { "Content-Type": blob.type },
            body: blob,
          });
          const txData = await txRes.json().catch(() => ({}));
          if (!txRes.ok) throw new Error(txData.error || "Lỗi nhận dạng");
          const t = (txData.transcript as string) || "";
          setTranscript(t);
          const subRes = await fetch(`/api/speaking/roulette/rooms/${code}/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transcript: t }),
          });
          const subData = await subRes.json().catch(() => ({}));
          if (!subRes.ok) throw new Error(subData.error || "Submit lỗi");
          setEarned((subData.earned as number) ?? 0);
          playSegmentDoneSfx();
          setState("done");
          await onAfter();
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
    <div className="rounded-2xl bg-cream text-foreground p-5 shadow-lg">
      <p className="text-xs uppercase tracking-[0.2em] font-extrabold text-emerald-700 mb-2">
        Lượt của bạn — record câu trả lời
      </p>
      {state === "idle" && (
        <button
          type="button"
          onClick={start}
          className="inline-flex items-center gap-2 rounded-full bg-rose-500 text-white px-6 py-3 font-extrabold shadow-md"
        >
          <Mic className="h-4 w-4" /> Start recording
        </button>
      )}
      {state === "recording" && (
        <button
          type="button"
          onClick={stop}
          className="inline-flex items-center gap-2 rounded-full bg-rose-600 text-white px-6 py-3 font-extrabold shadow-md animate-pulse"
        >
          <StopCircle className="h-4 w-4" /> Stop & submit
        </button>
      )}
      {state === "scoring" && (
        <div className="inline-flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang chấm…
        </div>
      )}
      {state === "done" && (
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white px-3 py-1 text-sm font-extrabold">
            +{earned ?? 0} điểm
          </div>
          {transcript && (
            <p className="text-xs text-muted-foreground italic">Bạn nói: &ldquo;{transcript}&rdquo;</p>
          )}
          <p className="text-xs text-muted-foreground">Bấm Spin để sang lượt tiếp…</p>
        </div>
      )}
    </div>
  );
}

function EmojiBar({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <div className="rounded-2xl bg-black/25 backdrop-blur p-2 flex items-center justify-center gap-1.5 flex-wrap">
      {EMOJIS.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => onPick(e)}
          className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 hover:bg-white/25 text-2xl transition-transform hover:scale-110 active:scale-95"
          aria-label={`Gửi ${e}`}
        >
          {e}
        </button>
      ))}
    </div>
  );
}

function ChatPanel({
  messages,
  meId,
  open,
  onClose,
  onSend,
}: {
  messages: ChatMsg[];
  meId: string;
  open: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const chats = useMemo(() => messages.filter((m) => m.kind === "chat"), [messages]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chats.length]);

  const submit = () => {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };

  const body = (
    <>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="inline-flex items-center gap-1.5 text-sm font-extrabold">
          <MessageCircle className="h-4 w-4" /> Chat
        </span>
        <button onClick={onClose} className="lg:hidden text-white/70 hover:text-white" aria-label="Đóng chat">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div ref={scrollerRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2">
        {chats.length === 0 ? (
          <p className="text-center text-xs text-white/50 py-6">
            Chưa có tin nhắn. Chào nhau một câu nào! 👋
          </p>
        ) : (
          chats.map((m) => {
            const mine = m.userId === meId;
            return (
              <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                {!mine && <span className="px-1 text-[10px] font-bold text-white/60">{m.name}</span>}
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-1.5 text-sm leading-relaxed break-words",
                    mine ? "rounded-tr-sm bg-cream text-[#3b5128]" : "rounded-tl-sm bg-white/15 text-white",
                  )}
                >
                  {m.text}
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="border-t border-white/10 p-2.5">
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            maxLength={300}
            placeholder="Nhắn tin…"
            className="flex-1 rounded-full bg-white/15 px-4 py-2 text-sm text-white placeholder:text-white/50 outline-none focus:bg-white/25"
          />
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream text-[#3b5128] disabled:opacity-40"
            aria-label="Gửi"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* mobile backdrop */}
      {open && (
        <button
          aria-hidden
          tabIndex={-1}
          onClick={onClose}
          className="lg:hidden fixed inset-0 z-[65] bg-black/40"
        />
      )}
      <aside
        className={cn(
          "flex flex-col bg-black/30 backdrop-blur border-l border-white/10",
          // desktop: static right column
          "lg:w-[320px] lg:shrink-0",
          // mobile: slide-in drawer
          "max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-[66] max-lg:w-[86%] max-lg:max-w-sm max-lg:shadow-2xl max-lg:transition-transform",
          open ? "max-lg:translate-x-0" : "max-lg:translate-x-full",
        )}
      >
        {body}
      </aside>
    </>
  );
}

function PlayerStrip({ state }: { state: RoomState }) {
  const sorted = useMemo(() => [...state.players].sort((a, b) => b.score - a.score), [state.players]);
  return (
    <div className="rounded-2xl bg-black/30 backdrop-blur p-3 flex items-center gap-2 overflow-x-auto">
      {sorted.map((p) => {
        const isCurrent = p.userId === state.currentPlayerId;
        const submitted = p.lastSubmittedTurn >= state.currentTurn;
        return (
          <div
            key={p.userId}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2 shrink-0 border",
              isCurrent ? "bg-cream text-[#3b5128] border-cream" : "bg-white/10 border-white/15",
            )}
          >
            <div className="grid h-8 w-8 place-items-center rounded-full bg-white/20 overflow-hidden">
              {p.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-bold">{(p.name || "?").slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <div>
              <div className="text-xs font-extrabold flex items-center gap-1">
                {p.isHost && <Crown className="h-3 w-3 text-amber-300" />}
                {p.name}
              </div>
              <div className="text-[10px] uppercase tracking-wider opacity-80">
                {p.score} pt
                {submitted && state.status === "PLAYING" && " · ✓ đã nộp"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Leaderboard({ state, onExit }: { state: RoomState; onExit: () => void }) {
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  return (
    <div className="rounded-3xl bg-black/30 backdrop-blur p-6 md:p-8 text-center space-y-5">
      <Trophy className="mx-auto h-12 w-12 text-amber-300" />
      <h2 className="text-3xl md:text-4xl font-extrabold font-display">🏆 {winner?.name ?? "—"} thắng!</h2>
      <p className="text-white/80 text-sm">
        Với {winner?.score ?? 0} điểm sau {state.totalTurns} lượt.
      </p>
      <div className="rounded-2xl bg-white/10 border border-white/15 p-4 max-w-md mx-auto">
        <ol className="space-y-2">
          {sorted.map((p, i) => (
            <li key={p.userId} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <span className="font-extrabold w-5">{i + 1}.</span>
                {p.isHost && <Crown className="h-3 w-3 text-amber-300" />}
                <span className="font-bold">{p.name}</span>
              </span>
              <span className="font-extrabold">{p.score} pt</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <Link
          href="/speaking/roulette"
          className="inline-flex items-center gap-1.5 rounded-full bg-cream text-[#3b5128] px-5 py-2.5 font-extrabold font-display"
        >
          Chơi tiếp
        </Link>
        <button
          onClick={onExit}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 px-5 py-2.5 font-extrabold"
        >
          Về Speaking
        </button>
      </div>
    </div>
  );
}
