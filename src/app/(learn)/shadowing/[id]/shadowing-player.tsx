"use client";
/**
 * Shadowing player — left pane: YouTube IFrame embed + sentence list +
 * speed control + Hiện tiếng Việt toggle. Right pane: current sentence,
 * IPA, big record button, Câu trước/Nghe lại/Câu sau nav with keyboard
 * shortcuts (Tab / Ctrl / Enter).
 *
 * YouTube control uses the IFrame Player API loaded via the public
 * script tag; we play each segment with seekTo(start) → playVideo() and
 * stop with a setTimeout that pauses at segment.endSec. Re-seeking on
 * "Nghe lại" replays the same range without reloading the iframe.
 *
 * Recording: MediaRecorder → POST to /api/shadowing/score with
 * ?segmentId=… → Deepgram transcribes → word-match score back.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Mic,
  StopCircle,
  Loader2,
  Share2,
  Star,
  Volume2,
  Subtitles,
  Settings,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { youtubeEmbedUrl } from "@/lib/youtube";

interface Lesson {
  id: string;
  title: string;
  source: string;
  youtubeId: string;
}

interface Segment {
  id: string;
  order: number;
  startSec: number;
  endSec: number;
  textEn: string;
  textVi: string | null;
  ipa: string | null;
}

interface ScoreResult {
  transcript: string;
  expected: string;
  score: number;
  matched: number;
  total: number;
  missingWords: string[];
  extraWords: string[];
}

export interface ShadowingPlayerProps {
  lesson: Lesson;
  segments: Segment[];
}

// Loads the YouTube IFrame Player API exactly once across the page.
let ytApiPromise: Promise<unknown> | null = null;
function loadYouTubeApi(): Promise<unknown> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  type YTGlobal = Window & {
    YT?: { Player?: unknown };
    onYouTubeIframeAPIReady?: () => void;
  };
  const w = window as YTGlobal;
  if (w.YT && w.YT.Player) return Promise.resolve(w.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    w.onYouTubeIframeAPIReady = () => resolve(w.YT);
  });
  return ytApiPromise;
}

const SPEEDS = [0.5, 0.75, 1, 1.25];

export function ShadowingPlayer({ lesson, segments }: ShadowingPlayerProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [showVi, setShowVi] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [recording, setRecording] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [score, setScore] = useState<ScoreResult | null>(null);

  const playerRef = useRef<{
    seekTo: (s: number, allowSeekAhead?: boolean) => void;
    playVideo: () => void;
    pauseVideo: () => void;
    setPlaybackRate: (r: number) => void;
    getCurrentTime?: () => number;
  } | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const active = segments[activeIdx];
  const total = segments.length;

  const clearStopTimer = () => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  };

  /** Play a single segment: seek to start, play, schedule pause at end. */
  const playSegment = useCallback((seg: Segment) => {
    const yt = playerRef.current;
    if (!yt) return;
    clearStopTimer();
    yt.setPlaybackRate(speed);
    yt.seekTo(seg.startSec, true);
    yt.playVideo();
    const ms = Math.max(500, (seg.endSec - seg.startSec) * 1000);
    stopTimerRef.current = setTimeout(() => {
      yt.pauseVideo();
    }, ms / speed);
  }, [speed]);

  // Initialise the YT player when the iframe element mounts.
  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi()
      .then((yt) => {
        if (cancelled || !playerContainerRef.current) return;
        type YTPlayerConstructor = new (
          el: HTMLElement,
          opts: { videoId: string; playerVars: Record<string, unknown>; events: { onReady: () => void } },
        ) => typeof playerRef.current;
        const YT = yt as { Player: YTPlayerConstructor };
        const player = new YT.Player(playerContainerRef.current, {
          videoId: lesson.youtubeId,
          playerVars: { rel: 0, modestbranding: 1, controls: 1 },
          events: {
            onReady: () => {
              playerRef.current = player;
            },
          },
        });
      })
      .catch(() => {
        toast.error("Không tải được YouTube API. Tải lại trang nhé.");
      });
    return () => {
      cancelled = true;
      clearStopTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.youtubeId]);

  // When the user picks a different segment, auto-play it.
  useEffect(() => {
    if (active) playSegment(active);
    setScore(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx]);

  // Keyboard shortcuts: Tab=prev, Ctrl=replay, Enter=next.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore typing inside form elements.
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "Tab") {
        e.preventDefault();
        prev();
      } else if (e.key === "Control") {
        e.preventDefault();
        replay();
      } else if (e.key === "Enter") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx]);

  const prev = () => {
    if (activeIdx > 0) setActiveIdx((i) => i - 1);
  };
  const next = () => {
    if (activeIdx < total - 1) setActiveIdx((i) => i + 1);
  };
  const replay = () => {
    if (active) playSegment(active);
  };

  const changeSpeed = (s: number) => {
    setSpeed(s);
    playerRef.current?.setPlaybackRate(s);
  };

  // Recording — short clip per segment, capped at 30s.
  const toggleRecord = async () => {
    if (recording) {
      mediaRef.current?.stop();
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error("Cần quyền microphone để chấm phát âm");
      return;
    }
    chunksRef.current = [];
    const mr = new MediaRecorder(stream);
    mediaRef.current = mr;
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
      const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" });
      if (blob.size < 1000) {
        toast.error("Bản ghi quá ngắn");
        return;
      }
      setScoring(true);
      try {
        const res = await fetch(
          `/api/shadowing/score?segmentId=${encodeURIComponent(active.id)}`,
          {
            method: "POST",
            headers: { "Content-Type": blob.type },
            body: blob,
          },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Chấm thất bại");
        setScore(data as ScoreResult);
        setCompletedIds((s) => new Set(s).add(active.id));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Lỗi");
      } finally {
        setScoring(false);
      }
    };
    mr.start();
    setRecording(true);
    // Auto-stop at 30s.
    setTimeout(() => {
      if (mr.state === "recording") mr.stop();
    }, 30_000);
  };

  const progressPct = total === 0 ? 0 : Math.round((completedIds.size / total) * 100);

  return (
    <div className="grid lg:grid-cols-[1fr_1fr] gap-4 -mx-4 md:-mx-8 -mt-4 md:-mt-8 min-h-screen bg-card">
      {/* LEFT: video + segment list */}
      <div className="p-4 md:p-6 space-y-3 border-r">
        <div className="flex items-center gap-2 mb-2">
          <Link href="/shadowing" className="text-xs font-bold text-muted-foreground hover:text-primary">
            ← Shadowing
          </Link>
        </div>

        {/* YouTube embed */}
        <div className="rounded-2xl overflow-hidden border bg-black aspect-video relative">
          <div ref={playerContainerRef} className="w-full h-full" />
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="font-bold text-sm truncate">{lesson.title}</p>
            <p className="text-xs text-muted-foreground">{lesson.source}</p>
          </div>
          <div className="flex items-center gap-1">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => changeSpeed(s)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-bold transition-colors",
                  speed === s
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-accent",
                )}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Tabs: Phụ đề / Ghi chú (Phụ đề only for MVP) */}
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-4">
            <span className="text-sm font-extrabold border-b-2 border-primary pb-1">Phụ đề</span>
            <span className="text-sm text-muted-foreground">Ghi chú</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold">{total} Câu</span>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <span>Hiện tiếng việt</span>
              <input
                type="checkbox"
                checked={showVi}
                onChange={(e) => setShowVi(e.target.checked)}
                className="h-4 w-7 appearance-none rounded-full bg-muted checked:bg-emerald-500 relative transition-colors before:absolute before:top-0.5 before:left-0.5 before:h-3 before:w-3 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-3"
              />
            </label>
          </div>
        </div>

        {/* Progress bar */}
        <div className="rounded-full h-2.5 bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground -mt-1">
          <span>Tiến độ</span>
          <span className="font-bold text-emerald-700 dark:text-emerald-300">{progressPct}%</span>
        </div>

        {/* Segment list */}
        <div className="space-y-1.5 max-h-[calc(100vh-32rem)] overflow-y-auto pr-1">
          {segments.map((s, i) => {
            const isActive = i === activeIdx;
            const done = completedIds.has(s.id);
            return (
              <button
                key={s.id}
                onClick={() => setActiveIdx(i)}
                className={cn(
                  "w-full text-left rounded-xl border-2 p-3 transition-all",
                  isActive
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-sm"
                    : done
                      ? "border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/10"
                      : "border-transparent bg-muted/30 hover:border-primary/30",
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      "grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold",
                      isActive
                        ? "bg-emerald-500 text-white"
                        : done
                          ? "bg-emerald-200 text-emerald-800"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {done ? "✓" : ""}
                  </span>
                  <span className="text-xs font-extrabold text-muted-foreground">
                    #{s.order}
                  </span>
                  {isActive && (
                    <span className="text-[10px] font-extrabold rounded bg-emerald-500 text-white px-1.5 py-0.5 uppercase tracking-wider">
                      Đang học
                    </span>
                  )}
                  <Volume2 className="h-3 w-3 text-muted-foreground ml-auto" />
                </div>
                <p className="text-sm font-medium leading-snug">{s.textEn}</p>
                {showVi && s.textVi && (
                  <p className="text-xs text-muted-foreground italic mt-0.5">{s.textVi}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: current sentence + record + nav */}
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-extrabold text-foreground">{active?.order}</span>
            <span>·</span>
            <span className="font-bold">{lesson.source}</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <button className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <Share2 className="h-3.5 w-3.5" /> Chia sẻ
            </button>
            <button className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <Star className="h-3.5 w-3.5" /> Lưu
            </button>
          </div>
        </div>

        {/* Tabs row */}
        <div className="flex items-center gap-4 text-xs flex-wrap text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" /> Click the word to translate
          </span>
          <span>|</span>
          <span className="inline-flex items-center gap-1">
            <Subtitles className="h-3.5 w-3.5" /> Câu mẫu
          </span>
          <span>|</span>
          <span className="inline-flex items-center gap-1">
            <Volume2 className="h-3.5 w-3.5" /> IPA
          </span>
          <span>|</span>
          <span className="inline-flex items-center gap-1">
            <Settings className="h-3.5 w-3.5" /> Dịch nghĩa
          </span>
        </div>

        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
          {active?.textEn}
        </h2>
        {active?.ipa && (
          <div className="border-l-4 border-primary/40 pl-3 font-mono text-base text-muted-foreground">
            /{active.ipa.replace(/^\/|\/$/g, "")}/
          </div>
        )}
        {showVi && active?.textVi && (
          <p className="text-base italic text-foreground/70">{active.textVi}</p>
        )}

        {/* Big record card */}
        <div
          className={cn(
            "rounded-2xl border-2 p-5 flex items-center gap-4 transition-all",
            recording
              ? "border-rose-400 bg-rose-50 dark:bg-rose-950/30 animate-pulse"
              : "border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30",
          )}
        >
          <button
            type="button"
            onClick={toggleRecord}
            disabled={scoring}
            className={cn(
              "grid h-14 w-14 place-items-center rounded-full text-white shadow-lg transition-transform active:scale-95",
              recording ? "bg-rose-500" : "bg-emerald-500 hover:bg-emerald-600",
              scoring && "opacity-50 cursor-wait",
            )}
          >
            {scoring ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : recording ? (
              <StopCircle className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </button>
          <div>
            <p className="font-extrabold">
              {scoring ? "Đang chấm..." : recording ? "Đang ghi âm..." : "Nhấn để thu âm"}
            </p>
            <p className="text-xs text-muted-foreground">Tối đa 30 giây</p>
          </div>
        </div>

        {/* Score result */}
        {score && (
          <div
            className={cn(
              "rounded-2xl border-2 p-4 space-y-2",
              score.score >= 80
                ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
                : score.score >= 50
                  ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20"
                  : "border-rose-400 bg-rose-50 dark:bg-rose-950/20",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">
                Điểm phát âm: {score.matched}/{score.total} từ khớp
              </span>
              <span
                className={cn(
                  "text-2xl font-extrabold",
                  score.score >= 80
                    ? "text-emerald-600"
                    : score.score >= 50
                      ? "text-amber-600"
                      : "text-rose-600",
                )}
              >
                {score.score}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-bold">Bạn nói:</span> "{score.transcript}"
            </p>
            {score.missingWords.length > 0 && (
              <p className="text-xs">
                <span className="font-bold text-rose-700">Bỏ sót:</span>{" "}
                {score.missingWords.join(", ")}
              </p>
            )}
          </div>
        )}

        {/* Nav buttons */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <NavCard
            label="Câu trước"
            shortcut="Tab"
            icon={ChevronLeft}
            onClick={prev}
            disabled={activeIdx === 0}
          />
          <NavCard
            label="Nghe lại"
            shortcut="Ctrl"
            icon={RotateCcw}
            onClick={replay}
          />
          <NavCard
            label="Câu sau"
            shortcut="Enter"
            icon={ChevronRight}
            onClick={next}
            disabled={activeIdx === total - 1}
            primary
          />
        </div>
      </div>
    </div>
  );
}

function NavCard({
  label,
  shortcut,
  icon: Icon,
  onClick,
  disabled,
  primary,
}: {
  label: string;
  shortcut: string;
  icon: React.ElementType;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-2xl border-2 p-4 flex flex-col items-center justify-center gap-2 transition-all",
        disabled
          ? "opacity-40 cursor-not-allowed border-muted bg-muted/40"
          : primary
            ? "border-emerald-500 bg-emerald-100 dark:bg-emerald-950/40 hover:bg-emerald-200"
            : "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100",
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-sm font-extrabold">{label}</span>
      <kbd className="rounded border bg-card text-[10px] font-mono font-bold px-1.5 py-0.5 text-muted-foreground">
        {shortcut}
      </kbd>
    </button>
  );
}
