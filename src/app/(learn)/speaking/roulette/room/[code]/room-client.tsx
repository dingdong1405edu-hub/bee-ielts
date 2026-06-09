"use client";
/**
 * Speaking Roulette multiplayer room — turn-based, polling-driven.
 *
 * The room has 3 states the UI renders:
 *   - WAITING (lobby): show invite code + players list + Host "Start" btn
 *   - PLAYING: show current card + whose turn it is + Record (when it's
 *     your turn) or scoreboard waiting screen. Host clicks "Next turn"
 *     after current player submits (or skip if they timed out).
 *   - FINISHED: final leaderboard + "Play again" (back to deck) button.
 *
 * Polling every 2s via GET /rooms/[code]. We re-render whenever
 * currentTurn, currentCardId, currentPlayerId, or status changes.
 *
 * All AI / STT calls happen in the player's browser:
 *   1) MediaRecorder → POST /api/speaking/transcribe → transcript
 *   2) POST /api/speaking/roulette/rooms/[code]/submit { transcript }
 *      Server scores it (word-count tier) and bumps score.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayerRow {
  userId: string;
  name: string;
  avatarUrl: string | null;
  score: number;
  lastSubmittedTurn: number;
  isHost: boolean;
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
}

const HUE_BG: Record<string, string> = {
  rose: "bg-rose-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-600",
  sky: "bg-sky-600",
  violet: "bg-violet-600",
  teal: "bg-teal-600",
};

export function RoomClient({ code }: { code: string }) {
  const [state, setState] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hostBusy, setHostBusy] = useState(false);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/speaking/roulette/rooms/${code}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Không tải được phòng");
        return;
      }
      setState(data as RoomState);
      setError(null);
    } catch {
      // Network blip — keep last state, try again next tick.
    } finally {
      setLoading(false);
    }
  }, [code]);

  // First load + 2s polling tick. Stops when status === FINISHED to save
  // bandwidth (leaderboard doesn't change).
  useEffect(() => {
    poll();
  }, [poll]);
  useEffect(() => {
    if (state?.status === "FINISHED") return;
    const id = window.setInterval(poll, 2000);
    return () => window.clearInterval(id);
  }, [poll, state?.status]);

  const onHostSpin = async () => {
    setHostBusy(true);
    try {
      const res = await fetch(
        `/api/speaking/roulette/rooms/${code}/spin`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Spin lỗi");
      await poll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setHostBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="grid place-items-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }
  if (error || !state) {
    return (
      <div className="max-w-md mx-auto pt-12 text-center space-y-4">
        <p className="text-rose-600 font-bold">{error || "Không tìm thấy phòng"}</p>
        <Link
          href="/speaking/roulette"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 font-bold"
        >
          <ArrowLeft className="h-4 w-4" /> Về deck
        </Link>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-[88vh] -mx-4 sm:-mx-6 md:-mx-8 -mt-4 md:-mt-6 px-4 sm:px-6 md:px-8 py-8 rounded-3xl overflow-hidden text-white"
      style={{
        background:
          "radial-gradient(ellipse at 50% 35%, #6f9450 0%, #4d6735 55%, #2f4220 100%)",
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative max-w-4xl mx-auto space-y-6">
        <Header code={code} part={state.part} status={state.status} />

        {state.status === "WAITING" && (
          <Lobby
            state={state}
            onStart={onHostSpin}
            hostBusy={hostBusy}
          />
        )}

        {state.status === "PLAYING" && state.currentCard && (
          <PlayingView
            state={state}
            onAfterSubmit={poll}
            onHostNext={onHostSpin}
            hostBusy={hostBusy}
          />
        )}

        {state.status === "FINISHED" && <Leaderboard state={state} />}

        {state.status !== "FINISHED" && <PlayerStrip state={state} />}
      </div>
    </div>
  );
}

/* ---------------- subcomponents ---------------- */

function Header({
  code,
  part,
  status,
}: {
  code: string;
  part: number;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <Link
        href="/speaking/roulette"
        className="inline-flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur px-3 py-1.5 text-sm font-bold"
      >
        <ArrowLeft className="h-4 w-4" /> Rời phòng
      </Link>
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-display">
          Speaking Roulette · Part {part}
        </h1>
        <p className="text-[11px] text-white/70 uppercase tracking-[0.18em] font-bold">
          {status === "WAITING"
            ? "Sảnh chờ"
            : status === "PLAYING"
              ? "Đang chơi"
              : "Kết thúc"}
        </p>
      </div>
      <CopyCode code={code} />
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
  hostBusy,
}: {
  state: RoomState;
  onStart: () => void;
  hostBusy: boolean;
}) {
  return (
    <div className="rounded-3xl bg-black/20 backdrop-blur p-6 md:p-8 text-center space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] font-bold text-white/70 mb-2">
          Mã phòng
        </p>
        <div className="text-5xl md:text-6xl font-extrabold tracking-[0.2em] font-display">
          {state.code}
        </div>
        <p className="text-sm text-white/80 mt-3">
          Chia sẻ mã hoặc link với bạn bè để cùng chơi · {state.totalTurns} lượt
        </p>
      </div>

      {state.iAmHost ? (
        <button
          type="button"
          onClick={onStart}
          disabled={hostBusy || state.players.length < 2}
          className="inline-flex items-center gap-2 rounded-full bg-cream text-[#3b5128] px-8 py-3 font-extrabold text-lg shadow-xl hover:scale-105 transition-transform disabled:opacity-50 font-display"
        >
          {hostBusy ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <RefreshCw className="h-5 w-5" />
          )}
          Bắt đầu game
        </button>
      ) : (
        <p className="text-sm text-white/80 italic">
          Chờ host bấm Bắt đầu…
        </p>
      )}
      {state.iAmHost && state.players.length < 2 && (
        <p className="text-xs text-amber-300">
          Cần ít nhất 2 người chơi để bắt đầu.
        </p>
      )}
    </div>
  );
}

function PlayingView({
  state,
  onAfterSubmit,
  onHostNext,
  hostBusy,
}: {
  state: RoomState;
  onAfterSubmit: () => Promise<void>;
  onHostNext: () => void;
  hostBusy: boolean;
}) {
  const hue = HUE_BG[state.currentCard?.hue ?? "amber"] ?? HUE_BG.amber;
  const card = state.currentCard!;
  const currentPlayer = state.players.find(
    (p) => p.userId === state.currentPlayerId,
  );
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
          ✅ Bạn đã nộp lượt này — chờ host spin tiếp.
        </div>
      ) : (
        <div className="rounded-2xl bg-black/25 backdrop-blur p-4 text-center text-white/90 font-bold">
          {currentPlayer?.name} đang trả lời — cổ vũ họ nào!
        </div>
      )}

      {state.iAmHost && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onHostNext}
            disabled={hostBusy || !everyoneSubmittedThisTurn}
            className="inline-flex items-center gap-2 rounded-full bg-cream text-[#3b5128] px-6 py-2.5 font-extrabold shadow disabled:opacity-50 font-display"
            title={
              everyoneSubmittedThisTurn
                ? "Sang lượt tiếp"
                : "Đợi current player nộp"
            }
          >
            {hostBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Spin lượt tiếp
          </button>
        </div>
      )}
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
  const [state, setState] = useState<
    "idle" | "recording" | "scoring" | "done"
  >("idle");
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
          const txRes = await fetch("/api/speaking/transcribe", {
            method: "POST",
            headers: { "Content-Type": blob.type },
            body: blob,
          });
          const txData = await txRes.json().catch(() => ({}));
          if (!txRes.ok) throw new Error(txData.error || "Lỗi nhận dạng");
          const t = (txData.transcript as string) || "";
          setTranscript(t);
          const subRes = await fetch(
            `/api/speaking/roulette/rooms/${code}/submit`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ transcript: t }),
            },
          );
          const subData = await subRes.json().catch(() => ({}));
          if (!subRes.ok) throw new Error(subData.error || "Submit lỗi");
          setEarned((subData.earned as number) ?? 0);
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
            <p className="text-xs text-muted-foreground italic">
              Bạn nói: &ldquo;{transcript}&rdquo;
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Chờ host spin lượt tiếp…
          </p>
        </div>
      )}
    </div>
  );
}

function PlayerStrip({ state }: { state: RoomState }) {
  const sorted = useMemo(
    () => [...state.players].sort((a, b) => b.score - a.score),
    [state.players],
  );
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
              isCurrent
                ? "bg-cream text-[#3b5128] border-cream"
                : "bg-white/10 border-white/15",
            )}
          >
            <div className="grid h-8 w-8 place-items-center rounded-full bg-white/20 overflow-hidden">
              {p.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-bold">
                  {(p.name || "?").slice(0, 1).toUpperCase()}
                </span>
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

function Leaderboard({ state }: { state: RoomState }) {
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  return (
    <div className="rounded-3xl bg-black/30 backdrop-blur p-6 md:p-8 text-center space-y-5">
      <Trophy className="mx-auto h-12 w-12 text-amber-300" />
      <h2 className="text-3xl md:text-4xl font-extrabold font-display">
        🏆 {winner?.name ?? "—"} thắng!
      </h2>
      <p className="text-white/80 text-sm">
        Với {winner?.score ?? 0} điểm sau {state.totalTurns} lượt.
      </p>
      <div className="rounded-2xl bg-white/10 border border-white/15 p-4 max-w-md mx-auto">
        <ol className="space-y-2">
          {sorted.map((p, i) => (
            <li
              key={p.userId}
              className="flex items-center justify-between gap-3"
            >
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
      <Link
        href="/speaking/roulette"
        className="inline-flex items-center gap-1.5 rounded-full bg-cream text-[#3b5128] px-5 py-2.5 font-extrabold font-display"
      >
        Chơi tiếp
      </Link>
    </div>
  );
}
