"use client";

/**
 * Podcast player — passive listening with a synced transcript.
 *
 * Left/top: YouTube IFrame (16:9). The user can click the embed's own
 * fullscreen button (allowFullScreen on the iframe) — we don't gate that
 * behind our own UI. We do drive playback via the IFrame Player API so we
 * can highlight the active transcript line + click-to-seek.
 *
 * Right/bottom: scrolling transcript. Active segment is highlighted; we
 * auto-scroll it into view at the centre of the column (smooth). Clicking
 * any line seeks the player there.
 *
 * No recording, no scoring — different module than shadowing. Cheap to
 * render and load.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Gauge, ListMusic } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PodcastSegment {
  startSec: number;
  endSec: number;
  textEn: string;
}

interface Props {
  id: string;
  title: string;
  channel: string;
  youtubeId: string;
  thumbnailUrl: string;
  durationSec: number;
  segments: PodcastSegment[];
}

// One-time YouTube IFrame API loader, shared with shadowing-player.
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

const SPEEDS = [0.75, 1, 1.25, 1.5];

function formatTimestamp(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PodcastPlayer({
  title,
  channel,
  youtubeId,
  segments,
}: Props) {
  const [activeIdx, setActiveIdx] = useState(-1);
  const [speed, setSpeed] = useState(1);
  const [ready, setReady] = useState(false);

  const playerRef = useRef<{
    seekTo: (s: number, allowSeekAhead?: boolean) => void;
    playVideo: () => void;
    pauseVideo: () => void;
    setPlaybackRate: (r: number) => void;
    getCurrentTime?: () => number;
  } | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const activeRowRef = useRef<HTMLLIElement | null>(null);

  // Compute current segment index from a playback time. Linear scan is
  // fine — typical podcast has < 500 segments and we run this 4x/sec.
  const findSegmentIndex = useMemo(() => {
    return (t: number): number => {
      for (let i = 0; i < segments.length; i++) {
        const s = segments[i];
        if (t >= s.startSec && t < s.endSec) return i;
      }
      // Past the last segment? Stick to the last one so the highlight
      // doesn't disappear at the very end of the audio.
      const last = segments[segments.length - 1];
      if (last && t >= last.endSec) return segments.length - 1;
      return -1;
    };
  }, [segments]);

  // YouTube player init.
  useEffect(() => {
    if (!playerContainerRef.current) return;
    let mounted = true;
    let player: {
      destroy: () => void;
      seekTo: (s: number, allowSeekAhead?: boolean) => void;
      playVideo: () => void;
      pauseVideo: () => void;
      setPlaybackRate: (r: number) => void;
      getCurrentTime: () => number;
    } | null = null;

    loadYouTubeApi()
      .then((YT) => {
        if (!mounted || !playerContainerRef.current) return;
        type YTCtor = new (
          el: HTMLElement,
          opts: {
            videoId: string;
            playerVars?: Record<string, string | number>;
            events?: {
              onReady?: (e: { target: typeof player }) => void;
            };
          },
        ) => typeof player;
        const YTAny = YT as { Player: YTCtor };
        player = new YTAny.Player(playerContainerRef.current, {
          videoId: youtubeId,
          playerVars: {
            modestbranding: 1,
            rel: 0,
            // Show the YouTube controls — users want fullscreen + scrubbing.
            controls: 1,
            playsinline: 1,
          },
          events: {
            onReady: () => {
              if (!mounted) return;
              playerRef.current = player as typeof playerRef.current;
              setReady(true);
            },
          },
        });
      })
      .catch((e) => {
        console.error("[podcast] YT API load failed", e);
      });

    return () => {
      mounted = false;
      try {
        player?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [youtubeId]);

  // Apply speed when it changes.
  useEffect(() => {
    if (!ready) return;
    try {
      playerRef.current?.setPlaybackRate(speed);
    } catch {
      /* ignore */
    }
  }, [ready, speed]);

  // Drive the active highlight off the player clock.
  useEffect(() => {
    if (!ready) return;
    const tick = () => {
      const t = playerRef.current?.getCurrentTime?.() ?? 0;
      const idx = findSegmentIndex(t);
      setActiveIdx((cur) => (cur === idx ? cur : idx));
    };
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [ready, findSegmentIndex]);

  // Auto-scroll the active row to the centre of the transcript column.
  useEffect(() => {
    if (activeIdx < 0) return;
    activeRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIdx]);

  const seekTo = (sec: number) => {
    try {
      playerRef.current?.seekTo(sec, true);
      playerRef.current?.playVideo();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-6 py-4 sm:py-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <Link
          href="/podcasts"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Tất cả podcasts
        </Link>
        <div className="flex items-center gap-1 rounded-full border-2 border-honey/40 bg-paper p-1 shadow-sm">
          <Gauge className="h-3.5 w-3.5 ml-1.5 text-honey-deep" />
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors",
                speed === s
                  ? "bg-honey text-ink shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Video — true 16:9 frame, soft honey border for polish */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-honey/40 bg-black shadow-xl">
        <div className="aspect-video w-full">
          <div ref={playerContainerRef} className="h-full w-full" />
        </div>
      </div>

      {/* Title block */}
      <div className="mt-4 sm:mt-5 space-y-1">
        <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-honey" />
          {channel}
        </p>
      </div>

      {/* Transcript */}
      <section className="mt-5 sm:mt-6 rounded-2xl border-2 border-honey/20 bg-paper shadow-sm">
        <header className="flex items-center gap-2 border-b-2 border-honey/15 px-4 py-3">
          <ListMusic className="h-4 w-4 text-honey-deep" />
          <h2 className="font-display font-bold text-sm tracking-tight">
            Transcript
          </h2>
          <span className="ml-auto text-xs text-muted-foreground">
            {segments.length} dòng — bấm vào để nghe lại
          </span>
        </header>
        <ol className="max-h-[60vh] overflow-y-auto px-2 py-2 space-y-0.5">
          {segments.map((seg, i) => {
            const isActive = i === activeIdx;
            return (
              <li
                key={`${seg.startSec}-${i}`}
                ref={isActive ? activeRowRef : null}
                className={cn(
                  "group flex items-start gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-colors",
                  isActive
                    ? "bg-honey/15 ring-2 ring-honey/40"
                    : "hover:bg-honey/5",
                )}
                onClick={() => seekTo(seg.startSec)}
              >
                <span
                  className={cn(
                    "tabular-nums text-xs font-bold pt-0.5 shrink-0 w-12",
                    isActive ? "text-honey-deep" : "text-muted-foreground",
                  )}
                >
                  {formatTimestamp(seg.startSec)}
                </span>
                <p
                  className={cn(
                    "text-[15px] leading-relaxed flex-1",
                    isActive ? "font-bold text-ink" : "text-ink-soft",
                  )}
                >
                  {seg.textEn}
                </p>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
