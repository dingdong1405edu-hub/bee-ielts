"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Music, Volume2, VolumeX, Play } from "lucide-react";
import { scopeForPathname, type MusicScope } from "@/lib/music-scopes";

interface Track {
  id: string;
  name: string;
  audioUrl: string;
  volume: number;
}

const LS_MUTED = "bee-music-muted";
const LS_VOLUME = "bee-music-volume"; // user multiplier 0..1
const SS_UNLOCKED = "bee-music-unlocked"; // gesture-unlocked this session

const FADE_MS = 600;

export function BackgroundMusicPlayer() {
  const pathname = usePathname();
  const scope = scopeForPathname(pathname || "/");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRafRef = useRef<number | null>(null);
  const cacheRef = useRef<Map<MusicScope, Track[]>>(new Map());

  const [track, setTrack] = useState<Track | null>(null);
  const [muted, setMuted] = useState<boolean>(false);
  const [userVolume, setUserVolume] = useState<number>(1);
  const [unlocked, setUnlocked] = useState<boolean>(false);
  const [playing, setPlaying] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<boolean>(false);

  // Hydrate persisted prefs on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    setMuted(window.localStorage.getItem(LS_MUTED) === "1");
    const v = window.localStorage.getItem(LS_VOLUME);
    setUserVolume(v == null ? 1 : Math.max(0, Math.min(1, Number(v) || 0)));
    setUnlocked(window.sessionStorage.getItem(SS_UNLOCKED) === "1");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LS_MUTED, muted ? "1" : "0");
  }, [muted]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LS_VOLUME, String(userVolume));
  }, [userVolume]);

  const cancelFade = useCallback(() => {
    if (fadeRafRef.current != null) {
      cancelAnimationFrame(fadeRafRef.current);
      fadeRafRef.current = null;
    }
  }, []);

  const fadeTo = useCallback(
    (target: number, done?: () => void) => {
      const audio = audioRef.current;
      if (!audio) return;
      cancelFade();
      const start = audio.volume;
      const startedAt = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - startedAt) / FADE_MS);
        audio.volume = start + (target - start) * t;
        if (t < 1) {
          fadeRafRef.current = requestAnimationFrame(tick);
        } else {
          fadeRafRef.current = null;
          done?.();
        }
      };
      fadeRafRef.current = requestAnimationFrame(tick);
    },
    [cancelFade],
  );

  const pickTrack = useCallback((tracks: Track[]): Track | null => {
    if (tracks.length === 0) return null;
    return tracks[Math.floor(Math.random() * tracks.length)];
  }, []);

  // Whenever the scope changes: fetch (or read cache) and decide what to play.
  useEffect(() => {
    let aborted = false;

    const stopAndClear = async () => {
      const audio = audioRef.current;
      if (audio && !audio.paused) {
        await new Promise<void>((res) => fadeTo(0, () => res()));
        if (!aborted) audio.pause();
      }
      if (!aborted) {
        setTrack(null);
        setPlaying(false);
        setLoadError(false);
      }
    };

    if (!scope) {
      stopAndClear();
      return () => {
        aborted = true;
      };
    }

    const apply = (tracks: Track[]) => {
      if (aborted) return;
      const next = pickTrack(tracks);
      // Keep current track if it's still valid for this scope — avoid
      // restarting on every navigation between same-scope pages.
      setTrack((prev) => {
        if (next && prev && tracks.some((t) => t.id === prev.id)) return prev;
        return next;
      });
      setLoadError(false);
    };

    const cached = cacheRef.current.get(scope);
    if (cached) {
      apply(cached);
    } else {
      fetch(`/api/music?scope=${scope}`)
        .then((r) => r.json())
        .then((data) => {
          const tracks: Track[] = Array.isArray(data?.tracks) ? data.tracks : [];
          cacheRef.current.set(scope, tracks);
          apply(tracks);
        })
        .catch(() => {
          /* network blip — keep silent */
        });
    }

    return () => {
      aborted = true;
    };
  }, [scope, fadeTo, pickTrack]);

  // Drive playback whenever (track | muted | unlocked | userVolume) changes.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!track) {
      if (!audio.paused) audio.pause();
      setPlaying(false);
      return;
    }

    if (audio.src !== track.audioUrl) {
      audio.src = track.audioUrl;
      audio.loop = true;
      audio.preload = "auto";
      audio.volume = 0;
    }

    if (muted || !unlocked) {
      if (!audio.paused) audio.pause();
      setPlaying(false);
      return;
    }

    const targetVol = Math.max(0, Math.min(1, track.volume * userVolume));
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => {
          setLoadError(false);
          setPlaying(true);
          fadeTo(targetVol);
        })
        .catch(() => {
          // Autoplay blocked — clear unlocked so we show the "Bật nhạc" pill.
          setUnlocked(false);
          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem(SS_UNLOCKED);
          }
          setPlaying(false);
        });
    }
  }, [track, muted, unlocked, userVolume, fadeTo]);

  // Re-target volume when user moves the slider (without restarting).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track || muted || !unlocked) return;
    audio.volume = Math.max(0, Math.min(1, track.volume * userVolume));
  }, [userVolume, track, muted, unlocked]);

  const unlock = useCallback(() => {
    setUnlocked(true);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(SS_UNLOCKED, "1");
    }
    if (muted) setMuted(false);
  }, [muted]);

  const showPill = !!scope && !!track;

  return (
    <>
      {/* Audio element lives ALWAYS so the ref is stable across scope flips. */}
      <audio
        ref={audioRef}
        hidden
        onError={() => setLoadError(true)}
      />
      {showPill && (
        <div
          data-chrome
          className="fixed bottom-[calc(env(safe-area-inset-bottom)_+_5.5rem)] left-3 z-40 max-w-[calc(100vw-1.5rem)] flex items-center gap-2 rounded-full border bg-card/95 backdrop-blur px-3 py-1.5 shadow-md text-xs md:bottom-3 md:left-[calc(15rem_+_0.75rem)]"
        >
          <div
            className={`grid h-7 w-7 place-items-center rounded-full ${
              playing
                ? "bg-primary text-primary-foreground animate-pulse"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Music className="h-3.5 w-3.5" />
          </div>
          <div className="hidden sm:flex flex-col leading-tight max-w-[140px]">
            <span className="font-bold truncate">{track!.name}</span>
            <span className="text-[10px] text-muted-foreground">
              {loadError
                ? "Không tải được"
                : playing
                  ? "Đang phát"
                  : !unlocked
                    ? "Nhấn để bật"
                    : muted
                      ? "Đã tắt"
                      : "Đang nghỉ"}
            </span>
          </div>
          {!unlocked ? (
            <button
              type="button"
              onClick={unlock}
              className="inline-flex items-center gap-1 rounded-full bg-sage-500 hover:bg-sage-600 text-white px-3 py-1 font-bold"
            >
              <Play className="h-3 w-3 fill-current" />
              Bật nhạc
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? "Bật nhạc" : "Tắt nhạc"}
                className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted"
              >
                {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={userVolume}
                onChange={(e) => setUserVolume(Number(e.target.value))}
                className="w-16 sm:w-20 accent-primary"
                aria-label="Âm lượng"
              />
            </>
          )}
        </div>
      )}
    </>
  );
}
