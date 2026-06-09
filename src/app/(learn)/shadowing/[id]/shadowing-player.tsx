"use client";
/**
 * Shadowing player — left pane: YouTube IFrame + tabs (Phụ đề | Ghi chú)
 * + bee progress trail + segment list. Right pane: current sentence with
 * clickable words (popup → Vietnamese gloss), IPA toggle, optional Vi line,
 * recorder, score card, nav.
 *
 * YouTube control: IFrame Player API loaded once on mount, then we
 * seekTo(start) + playVideo() + setTimeout pause at endSec for each segment.
 *
 * Recording: MediaRecorder → POST raw blob to /api/shadowing/score → Deepgram
 * transcribes → bag-of-words match → score returned.
 *
 * Click-to-translate: POST to /api/shadowing/translate-word with the word
 * + parent sentence → Claude returns {vi, pos, defEn}. Popup positions itself
 * over the clicked word.
 *
 * Notes tab: textarea autosaved 800ms after the last edit (PUT
 * /api/shadowing/note). Empty text deletes the row.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Mic,
  StopCircle,
  Loader2,
  Share2,
  Star,
  Volume2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Subtitles,
  NotebookPen,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WordTranslatePopup } from "@/components/learn/word-translate-popup";
import {Leaf, MascotBubble } from "@/components/brand";
import {
  playCorrectSfx,
  playWrongSfx,
  playSegmentDoneSfx,
  playStreakSfx,
  playLessonCompleteSfx,
  playSwooshSfx,
  playTypingTickSfx,
} from "@/lib/quiz-sfx";

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
  /** "shadowing" = speak the sentence with mic (default). "dictation" =
   *  type what you hear; video pauses until the full sentence is typed
   *  correctly letter-by-letter, then auto-advances. */
  mode?: "shadowing" | "dictation";
}

// Load the YouTube IFrame Player API exactly once across the page.
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

interface WordHint {
  word: string;
  pos: string;
  vi: string;
  defEn: string;
}
interface PopupState {
  word: string;
  sentence: string;
  x: number;
  y: number;
  loading: boolean;
  hint: WordHint | null;
}

export function ShadowingPlayer({ lesson, segments, mode = "shadowing" }: ShadowingPlayerProps) {
  const isDictation = mode === "dictation";
  const [activeIdx, setActiveIdx] = useState(0);
  const [showVi, setShowVi] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [recording, setRecording] = useState(false);
  const [scoring, setScoring] = useState(false);
  // Elapsed milliseconds since `scoring` flipped to true. We tick every
  // 100ms while scoring is active and surface this in the UI so the user
  // knows the request is alive even when STT takes 1-2s. Avoids the
  // "did it freeze?" feeling.
  const [scoringMs, setScoringMs] = useState(0);
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [tab, setTab] = useState<"subtitles" | "notes">("subtitles");
  const [noteText, setNoteText] = useState("");
  const [noteStatus, setNoteStatus] = useState<"" | "saving" | "saved">("");
  const [popup, setPopup] = useState<PopupState | null>(null);
  // ============= Dictation state =============
  // Letter-by-letter reveal: dictTyped is the number of characters of the
  // active segment's textEn the user has correctly typed so far. Reset
  // when the active segment changes. Wrong key triggers a shake + SFX.
  const [dictTyped, setDictTyped] = useState(0);
  const [dictShake, setDictShake] = useState(false);
  const [dictRevealed, setDictRevealed] = useState(false);
  // Countdown shown in the score card so the user knows the next segment is
  // coming. Set to 2.5s the moment scoring completes; cleared if the user
  // jumps somewhere else first.
  const [autoNextIn, setAutoNextIn] = useState<number | null>(null);
  const autoNextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoNextTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick the scoring elapsed-time counter so the UI can show "Đang chấm
  // … 1.2s". 100ms cadence — smooth enough to look alive, cheap enough
  // to not matter.
  useEffect(() => {
    if (!scoring) {
      setScoringMs(0);
      return;
    }
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      setScoringMs(Date.now() - startedAt);
    }, 100);
    return () => window.clearInterval(id);
  }, [scoring]);

  const clearAutoNext = () => {
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    if (autoNextTickRef.current) clearInterval(autoNextTickRef.current);
    autoNextTimerRef.current = null;
    autoNextTickRef.current = null;
    setAutoNextIn(null);
  };

  const playerRef = useRef<{
    seekTo: (s: number, allowSeekAhead?: boolean) => void;
    playVideo: () => void;
    pauseVideo: () => void;
    setPlaybackRate: (r: number) => void;
    mute?: () => void;
    unMute?: () => void;
    getCurrentTime?: () => number;
  } | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  // Poll handle for the end-of-segment guard. We use polling (not a single
  // setTimeout) because YouTube buffers ~200-800ms between seekTo and the
  // first playback frame, which would make a setTimeout fire BEFORE the
  // segment audibly ends — cutting off the last word.
  const stopPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [waitingForUser, setWaitingForUser] = useState(false);
  // Auto-follow mode: after a segment finishes, pause for "reading time"
  // (= the segment's own duration so user has the same time to read aloud
  // as the speaker took) and then auto-play the next segment. Default ON
  // because the user explicitly asked for this flow. Toggle in the header
  // disables it for users who prefer manual stepping.
  const [autoFollow, setAutoFollow] = useState(true);
  // Auto-record mode: when the video pauses at endSec, automatically open
  // the mic and record the user's shadowing take. They press a big "XONG"
  // button when finished → we score it and advance. Default ON because the
  // user explicitly asked for this flow. If mic permission was once denied
  // we flip this off so the player isn't stuck repeatedly toasting errors.
  const [autoRecord, setAutoRecord] = useState(true);
  const micDeniedRef = useRef(false);
  const [followCountdown, setFollowCountdown] = useState<number | null>(null);
  const followTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const followTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clearFollow = () => {
    if (followTimerRef.current) clearTimeout(followTimerRef.current);
    if (followTickRef.current) clearInterval(followTickRef.current);
    followTimerRef.current = null;
    followTickRef.current = null;
    setFollowCountdown(null);
  };

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const noteSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = segments[activeIdx];
  const total = segments.length;

  const clearStopPoll = () => {
    if (stopPollRef.current) {
      clearInterval(stopPollRef.current);
      stopPollRef.current = null;
    }
  };

  /** Schedule auto-advance to the next segment after the current segment
   *  ends. Wait time = the segment's own duration (clamped 2-8s) so the
   *  user has the same window to read/shadow as the speaker had. Mic
   *  recording or any manual nav cancels via clearFollow(). Last segment
   *  doesn't schedule.
   *
   *  Skipped entirely when autoRecord is ON because the recording flow
   *  takes over the post-pause window — user finishes with "XONG", we
   *  score, then scheduleAutoNext (separate flow) advances. */
  const scheduleFollow = useCallback(
    (justEndedSeg: Segment) => {
      if (!autoFollow) return;
      if (autoRecord && !micDeniedRef.current) return;
      // Dictation mode never auto-advances on a timer — the user must type
      // the sentence correctly to move on. Otherwise we'd skip past
      // segments they're still working on.
      if (isDictation) return;
      if (activeIdx >= total - 1) return;
      clearFollow();
      const segDur = Math.max(0.5, justEndedSeg.endSec - justEndedSeg.startSec);
      // Clamp: very short segments still need at least 2s to read, very
      // long ones don't need a full 30s pause.
      const waitSec = Math.min(8, Math.max(2, Math.round(segDur)));
      setFollowCountdown(waitSec);
      followTickRef.current = setInterval(() => {
        setFollowCountdown((s) => (s == null || s <= 1 ? null : s - 1));
      }, 1000);
      followTimerRef.current = setTimeout(() => {
        clearFollow();
        playSwooshSfx(); // subtle "moving on" cue
        setActiveIdx((i) => Math.min(i + 1, total - 1));
      }, waitSec * 1000);
    },
    [activeIdx, total, autoFollow, autoRecord],
  );

  /** Hard-cut the YouTube audio at the end of a segment. We call pauseVideo
   *  AND mute together because pauseVideo can take 50-200ms to actually
   *  silence on slow networks, and the user wants ZERO audio bleed between
   *  segments. unMute fires the next time we play. */
  const hardCutAudio = useCallback(() => {
    const yt = playerRef.current;
    if (!yt) return;
    try {
      yt.mute?.();
    } catch {
      /* silent */
    }
    try {
      yt.pauseVideo();
    } catch {
      /* silent */
    }
  }, []);

  /** Attach (or re-attach) the end-of-segment pause poll for `seg`. Does NOT
   *  seek or play — pure tail-end watcher. Polls getCurrentTime every 100ms
   *  and triggers hardCutAudio when the real playback head crosses endSec.
   *  Used both inside playSegment (where we just kicked off playback) and
   *  inside onStateChange (where the user hit YT's own play button). */
  const attachEndPoll = useCallback(
    (seg: Segment) => {
      const yt = playerRef.current;
      if (!yt) return;
      clearStopPoll();
      const maxWaitMs = Math.max(
        4000,
        Math.ceil(((seg.endSec - seg.startSec) * 4000) / speed),
      );
      const startedAt = Date.now();
      stopPollRef.current = setInterval(() => {
        try {
          const cur = yt.getCurrentTime?.() ?? 0;
          if (cur >= seg.endSec - 0.05) {
            hardCutAudio();
            clearStopPoll();
            setWaitingForUser(true);
            scheduleFollow(seg);
            return;
          }
          if (Date.now() - startedAt > maxWaitMs) {
            hardCutAudio();
            clearStopPoll();
            setWaitingForUser(true);
            scheduleFollow(seg);
          }
        } catch (e) {
          // If getCurrentTime throws, fall back to the safety pause so
          // the user isn't left with a video playing forever.
          console.error("[shadowing] end-of-segment poll error", e);
          if (Date.now() - startedAt > maxWaitMs) {
            hardCutAudio();
            clearStopPoll();
            setWaitingForUser(true);
            scheduleFollow(seg);
          }
        }
      }, 100);
    },
    [speed, scheduleFollow, hardCutAudio],
  );

  /** Play a single segment: seek to start, play, then attach the tail-end
   *  poll. Used when the user picks a segment from the list, or when the
   *  player auto-advances. Catches YT API throws so a single bad tick
   *  can't silently kill playback. */
  const playSegment = useCallback(
    (seg: Segment) => {
      const yt = playerRef.current;
      if (!yt) return;
      clearStopPoll();
      clearFollow();
      setWaitingForUser(false);
      try {
        yt.unMute?.();
        yt.setPlaybackRate(speed);
        yt.seekTo(seg.startSec, true);
        yt.playVideo();
      } catch (e) {
        console.error("[shadowing] playSegment YT call failed", e);
      }
      attachEndPoll(seg);
    },
    [speed, attachEndPoll],
  );

  // Initialise the YT player when the iframe element mounts.
  //
  // Critical: we MUST start polling for the segment-end pause both
  //   (a) the first time the player is ready (onReady), AND
  //   (b) any time the player transitions to PLAYING via YT's own
  //       controls (onStateChange data === 1).
  //
  // Without (a): the player loads after our useEffect already ran with a
  // null playerRef → playSegment early-exits → NO polling → if the user
  // then hits YT's own play button, the video runs through every segment
  // without pausing.
  // Without (b): if the user manually scrubs + plays via YT controls, the
  // poll we kicked off on (a) is still bound to the OLD segment. The new
  // PLAYING event re-runs playSegment with the active segment so the cut
  // lands at the right boundary again.
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi()
      .then((yt) => {
        if (cancelled || !playerContainerRef.current) return;
        type YTEvent = { data: number };
        type YTPlayerConstructor = new (
          el: HTMLElement,
          opts: {
            videoId: string;
            playerVars: Record<string, unknown>;
            events: {
              onReady: () => void;
              onStateChange?: (e: YTEvent) => void;
            };
          },
        ) => typeof playerRef.current;
        const YT = yt as { Player: YTPlayerConstructor };
        const player = new YT.Player(playerContainerRef.current, {
          videoId: lesson.youtubeId,
          playerVars: { rel: 0, modestbranding: 1, controls: 1 },
          events: {
            onReady: () => {
              playerRef.current = player;
              // Auto-start the first segment now that the player is ready —
              // covers the race where the activeIdx useEffect ran with a
              // null playerRef and did nothing.
              const cur = activeRef.current;
              if (cur) playSegment(cur);
            },
            onStateChange: (e) => {
              // YT IFrame API: 1 = PLAYING. If a poll is already running
              // we leave it alone (it's tracking the current segment). If
              // not — user just hit YT's native play button — attach a
              // fresh poll for the current active segment so we still
              // pause at endSec.
              if (e.data === 1 && !stopPollRef.current) {
                const cur = activeRef.current;
                if (cur) {
                  // Don't seek again — that would interrupt the user's
                  // manual scrub. Just attach a tail-end poll.
                  attachEndPoll(cur);
                }
              }
            },
          },
        });
      })
      .catch(() => {
        toast.error("Không tải được YouTube API. Tải lại trang nhé.");
      });
    return () => {
      cancelled = true;
      clearStopPoll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.youtubeId]);

  // When the user picks a different segment, auto-play and clear score.
  useEffect(() => {
    if (active) playSegment(active);
    setScore(null);
    setPopup(null);
    clearAutoNext();
    setDictTyped(0);
    setDictRevealed(false);
    setDictShake(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx]);

  // Auto-record trigger: when the segment ends (waitingForUser flips true)
  // AND auto-record is on AND we haven't already started a take, fire up
  // the mic so user can shadow without clicking anything. User presses the
  // big "XONG" button below to stop + score. micDeniedRef short-circuits
  // this so a single permission denial doesn't loop forever.
  useEffect(() => {
    if (!waitingForUser) return;
    if (!autoRecord) return;
    if (isDictation) return; // dictation never wants the mic
    if (micDeniedRef.current) return;
    if (recording || scoring) return;
    // Small delay so the YT pause/hardCutAudio is visually settled before
    // the mic indicator pops — feels less jarring.
    const t = setTimeout(() => {
      if (waitingForUser && autoRecord && !micDeniedRef.current && !recording && !scoring) {
        void toggleRecord();
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingForUser, autoRecord, recording, scoring]);

  // Load saved note on mount.
  useEffect(() => {
    fetch(`/api/shadowing/note?lessonId=${encodeURIComponent(lesson.id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.text === "string") setNoteText(d.text);
      })
      .catch(() => {});
  }, [lesson.id]);

  // Debounced autosave for the note.
  const onNoteChange = (v: string) => {
    setNoteText(v);
    setNoteStatus("saving");
    if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current);
    noteSaveTimer.current = setTimeout(async () => {
      try {
        await fetch("/api/shadowing/note", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId: lesson.id, text: v }),
        });
        setNoteStatus("saved");
        setTimeout(() => setNoteStatus(""), 1500);
      } catch {
        setNoteStatus("");
      }
    }, 800);
  };

  // Keyboard shortcuts: Tab=prev, Ctrl=replay, Enter=next.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (popup) {
        if (e.key === "Escape") {
          setPopup(null);
          return;
        }
      }
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
  }, [activeIdx, popup]);

  // ============= Dictation keystroke handler =============
  // When mode=dictation, every alpha-numeric keypress checks against the
  // next letter of active.textEn. Correct → reveal + tick SFX (and skip
  // over any whitespace/punctuation so the user only types letters).
  // Wrong → shake + buzz, no progress. Full sentence → segment complete
  // SFX + auto-advance after a short window.
  useEffect(() => {
    if (!isDictation) return;
    if (!active) return;
    const expected = active.textEn;
    const skipNonLetter = (start: number) => {
      let i = start;
      while (i < expected.length && !/[A-Za-z0-9]/.test(expected[i])) i++;
      return i;
    };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Only single printable characters count as a typed letter.
      if (e.key.length !== 1) return;
      let pos = dictTyped;
      // If we're sitting on punctuation/space, jump past it for free.
      pos = skipNonLetter(pos);
      if (pos >= expected.length) return;
      const typed = e.key.toLowerCase();
      const want = expected[pos].toLowerCase();
      if (typed === want) {
        e.preventDefault();
        const next = skipNonLetter(pos + 1);
        setDictTyped(next);
        playTypingTickSfx();
        if (next >= expected.length) {
          // Sentence done!
          setDictRevealed(true);
          playSegmentDoneSfx();
          setCompletedIds((s) => {
            if (s.has(active.id)) return s;
            const out = new Set(s).add(active.id);
            if (out.size === total) playLessonCompleteSfx();
            else if (out.size > 0 && out.size % 5 === 0) {
              setTimeout(playStreakSfx, 250);
            }
            return out;
          });
          // Brief celebration window then auto-advance.
          setTimeout(() => {
            if (activeIdx < total - 1) {
              playSwooshSfx();
              setActiveIdx((i) => Math.min(i + 1, total - 1));
            }
          }, 1200);
        }
      } else if (/[A-Za-z]/.test(typed)) {
        e.preventDefault();
        setDictShake(true);
        playWrongSfx();
        setTimeout(() => setDictShake(false), 320);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDictation, activeIdx, dictTyped, active]);

  const prev = () => {
    clearAutoNext();
    clearFollow();
    if (activeIdx > 0) setActiveIdx((i) => i - 1);
  };
  const next = () => {
    clearAutoNext();
    clearFollow();
    if (activeIdx < total - 1) setActiveIdx((i) => i + 1);
  };
  const replay = () => {
    clearAutoNext();
    clearFollow();
    if (active) playSegment(active);
  };

  /** Schedule auto-advance to the next segment after the score lands.
   *  2.5s gives the user time to read the score + cancel via Tab/Ctrl
   *  (which call clearAutoNext through prev/replay). Last segment doesn't
   *  auto-advance — it would loop or stop at the same place. */
  const scheduleAutoNext = useCallback(() => {
    if (activeIdx >= total - 1) return;
    clearAutoNext();
    const SECONDS = 3;
    setAutoNextIn(SECONDS);
    autoNextTickRef.current = setInterval(() => {
      setAutoNextIn((s) => (s == null || s <= 1 ? null : s - 1));
    }, 1000);
    autoNextTimerRef.current = setTimeout(() => {
      clearAutoNext();
      playSwooshSfx();
      setActiveIdx((i) => Math.min(i + 1, total - 1));
    }, SECONDS * 1000);
  }, [activeIdx, total]);

  const changeSpeed = (s: number) => {
    setSpeed(s);
    playerRef.current?.setPlaybackRate(s);
  };

  // Click on a word → fetch hint + open popup.
  const onWordClick = async (
    word: string,
    sentence: string,
    e: React.MouseEvent<HTMLSpanElement>,
  ) => {
    const cleaned = word.replace(/[^A-Za-z'-]/g, "");
    if (!cleaned) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setPopup({
      word: cleaned,
      sentence,
      x: rect.left + rect.width / 2,
      y: rect.bottom + 6,
      loading: true,
      hint: null,
    });
    try {
      const res = await fetch("/api/shadowing/translate-word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: cleaned, sentence }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Dịch lỗi");
      setPopup((p) => (p && p.word === cleaned ? { ...p, loading: false, hint: data } : p));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
      setPopup(null);
    }
  };

  // Recording — short clip per segment, capped at 30s.
  const toggleRecord = async () => {
    if (recording) {
      mediaRef.current?.stop();
      return;
    }
    // Defence in depth: pause the video the SECOND the user hits mic, even
    // if the YouTube end-of-segment poller hasn't fired yet (user could
    // click mic during a "Nghe lại" replay, or before buffering finished).
    // Without this, the video keeps playing while the user is speaking →
    // their mic captures the video too and the score is garbage.
    hardCutAudio();
    clearStopPoll();
    clearAutoNext();
    clearFollow();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      // Flag the denial so the auto-record useEffect doesn't keep firing
      // a doomed permission request every time a segment ends. The header
      // toggle stays so user can re-enable after granting permission.
      micDeniedRef.current = true;
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
        setCompletedIds((s) => {
          const next = new Set(s).add(active.id);
          // User asked "thêm nhiều sound effect càng nhiều càng tốt".
          // Tiered feedback so each take feels different:
          //   - score >= 80 → "segment done" 4-note flourish
          //   - score >= 50 → standard "correct" chime
          //   - score < 50  → soft wrong buzz (so user knows but isn't punished)
          //   - 5-streak    → bigger streak chime, layered on top
          //   - last segment → lesson-complete fanfare (no sub-chime)
          if (next.size === total) {
            playLessonCompleteSfx();
          } else {
            const score = (data as ScoreResult).score ?? 0;
            if (score >= 80) playSegmentDoneSfx();
            else if (score >= 50) playCorrectSfx();
            else playWrongSfx();
            // Streak SFX layered: every 5th completed segment.
            if (next.size > 0 && next.size % 5 === 0) {
              setTimeout(playStreakSfx, 250);
            }
          }
          return next;
        });
        // User wanted auto-advance after each take so they don't have to
        // hunt for "Câu sau". 3s gives them time to glance at the score
        // before we move them on — they can cancel by pressing Tab (prev)
        // or Ctrl (replay), both of which call clearAutoNext().
        scheduleAutoNext();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Lỗi");
      } finally {
        setScoring(false);
      }
    };
    mr.start();
    setRecording(true);
    setWaitingForUser(false);
    // Safety cap so a stuck recording doesn't run forever (lost focus, dead
    // tab, mic perm revoked mid-take). 60s is plenty for shadowing a single
    // sentence — anything past that is almost always abandoned.
    setTimeout(() => {
      if (mr.state === "recording") mr.stop();
    }, 60_000);
  };

  const progressPct = total === 0 ? 0 : Math.round((completedIds.size / total) * 100);

  // Tokenise the active sentence into clickable words + punctuation.
  const activeTokens = useMemo(() => {
    if (!active) return [] as { isWord: boolean; text: string }[];
    return active.textEn.split(/(\s+|[.,!?;:"()—–\-])/).map((t) => ({
      isWord: /[A-Za-z]/.test(t),
      text: t,
    }));
  }, [active]);

  return (
    <div className="grid lg:grid-cols-[1fr_1fr] gap-4 -mx-4 md:-mx-8 -mt-4 md:-mt-8 min-h-screen bg-card">
      {/* LEFT: video + tabs + bee progress + segment list / notes */}
      <div className="p-4 md:p-6 space-y-3 border-r">
        <div className="flex items-center gap-2 mb-2">
          <Link href="/shadowing" className="text-xs font-bold text-muted-foreground hover:text-primary">
            ← Shadowing
          </Link>
        </div>

        {/* YouTube embed — overlay dims + shows a "paused" badge while we
            hold the audio cut at end of segment, so the user clearly sees
            the YouTube audio has been stopped (not just a UI nudge). The
            overlay sits ON TOP of the iframe with pointer-events:none so
            users can still drag the YT scrubber if they want. */}
        <div className="rounded-2xl overflow-hidden border bg-black aspect-video relative">
          <div ref={playerContainerRef} className="w-full h-full" />
          {(waitingForUser || recording) && !scoring && (
            <div className="pointer-events-none absolute inset-0 bg-black/55 backdrop-blur-[1px] flex items-center justify-center transition-opacity">
              <div
                className={cn(
                  "flex items-center gap-3 rounded-full px-5 py-2.5 shadow-2xl ring-2 text-white",
                  recording
                    ? "bg-rose-500/95 ring-rose-200 animate-pulse"
                    : "bg-gold-500/95 ring-gold-200",
                )}
              >
                <span className="text-xl leading-none">{recording ? "🔴" : "⏸"}</span>
                <div className="text-sm">
                  <p className="font-extrabold leading-tight">
                    {recording
                      ? "Đang ghi âm — nói theo câu"
                      : "Đã dừng — bạn đọc theo"}
                  </p>
                  <p className="text-xs leading-tight opacity-90">
                    {recording
                      ? "Bấm XONG bên phải khi đọc xong"
                      : followCountdown != null
                        ? `Câu sau trong ${followCountdown}s`
                        : autoRecord && !micDeniedRef.current
                          ? "Mic đang mở..."
                          : "Bấm Câu sau / Enter để tiếp"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="relative overflow-hidden rounded-2xl">
          
          <div className="relative flex items-center justify-between flex-wrap gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-bold text-sm truncate">
              <Leaf className="h-4 w-4 shrink-0 text-leaf" />
              <span className="truncate">{lesson.title}</span>
            </p>
            <p className="text-xs text-muted-foreground">{lesson.source}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
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
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between border-b">
          <div className="flex items-center gap-1">
            <TabButton
              active={tab === "subtitles"}
              onClick={() => setTab("subtitles")}
              icon={Subtitles}
              label="Phụ đề"
            />
            <TabButton
              active={tab === "notes"}
              onClick={() => setTab("notes")}
              icon={NotebookPen}
              label="Ghi chú"
            />
          </div>
          {tab === "subtitles" && (
            <div className="flex items-center gap-2 text-xs pb-2 flex-wrap">
              <span className="font-bold">{total} Câu</span>
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <span>Tự chuyển câu</span>
                <input
                  type="checkbox"
                  checked={autoFollow}
                  onChange={(e) => {
                    setAutoFollow(e.target.checked);
                    if (!e.target.checked) clearFollow();
                  }}
                  className="h-4 w-7 appearance-none rounded-full bg-muted checked:bg-gold-500 relative transition-colors before:absolute before:top-0.5 before:left-0.5 before:h-3 before:w-3 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-3"
                />
              </label>
              {/* Tự ghi âm + Hiện tiếng việt are spoiler/irrelevant in
                  dictation mode (no mic, vi reveals meaning) → hide there. */}
              {!isDictation && (
                <>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                    <span>Tự ghi âm</span>
                    <input
                      type="checkbox"
                      checked={autoRecord}
                      onChange={(e) => {
                        setAutoRecord(e.target.checked);
                        // Re-arm mic permission after user toggles back on so
                        // we don't permanently disable it from one earlier denial.
                        if (e.target.checked) micDeniedRef.current = false;
                      }}
                      className="h-4 w-7 appearance-none rounded-full bg-muted checked:bg-rose-500 relative transition-colors before:absolute before:top-0.5 before:left-0.5 before:h-3 before:w-3 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-3"
                    />
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                    <span>Hiện tiếng việt</span>
                    <input
                      type="checkbox"
                      checked={showVi}
                      onChange={(e) => setShowVi(e.target.checked)}
                      className="h-4 w-7 appearance-none rounded-full bg-muted checked:bg-sage-500 relative transition-colors before:absolute before:top-0.5 before:left-0.5 before:h-3 before:w-3 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-3"
                    />
                  </label>
                </>
              )}
            </div>
          )}
          {tab === "notes" && (
            <span className="text-xs text-muted-foreground pb-2">
              {noteStatus === "saving" && "Đang lưu..."}
              {noteStatus === "saved" && "Đã lưu ✓"}
            </span>
          )}
        </div>

        {/* Bee progress trail — replaces the Mario screenshot. The bee
            sits on the trail at the current % progress; honey jar sits at
            the end. Looks branded + cute on mobile. */}
        <BeeProgress pct={progressPct} />

        {tab === "subtitles" ? (
          /* Segment list */
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
                      ? "border-sage-500 bg-sage-50 dark:bg-sage-950/30 shadow-sm"
                      : done
                        ? "border-sage-200 bg-sage-50/40 dark:bg-sage-950/10"
                        : "border-transparent bg-muted/30 hover:border-primary/30",
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        "grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold",
                        isActive
                          ? "bg-sage-500 text-white"
                          : done
                            ? "bg-sage-200 text-sage-800"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {done ? "✓" : ""}
                    </span>
                    <span className="text-xs font-extrabold text-muted-foreground">#{s.order}</span>
                    {isActive && (
                      <span className="text-[10px] font-extrabold rounded bg-sage-500 text-white px-1.5 py-0.5 uppercase tracking-wider">
                        Đang học
                      </span>
                    )}
                    <Volume2 className="h-3 w-3 text-muted-foreground ml-auto" />
                  </div>
                  {/* Dictation mode: blur the English for segments not yet
                      done. User can see length + word shapes (so segments are
                      distinguishable in the list) but can't read the answer.
                      Vietnamese is fully hidden — too easy a spoiler. */}
                  {isDictation && !done ? (
                    <p className="text-sm font-medium leading-snug blur-sm select-none">
                      {s.textEn}
                    </p>
                  ) : (
                    <>
                      <p className="text-sm font-medium leading-snug">{s.textEn}</p>
                      {showVi && s.textVi && (
                        <p className="text-xs text-muted-foreground italic mt-0.5">{s.textVi}</p>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          /* Notes editor */
          <div className="space-y-2">
            <textarea
              value={noteText}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder={
                "Ghi chú của bạn cho bài này — từ mới, idiom, mẹo phát âm... Auto-save khi bạn dừng gõ."
              }
              className="w-full min-h-[300px] rounded-2xl border-2 bg-card p-4 text-sm leading-relaxed focus:outline-none focus:border-primary"
            />
            <p className="text-xs text-muted-foreground">
              Ghi chú chỉ bạn nhìn thấy. Tự động lưu sau 0.8s khi ngừng gõ.
            </p>
          </div>
        )}
      </div>

      {/* RIGHT: current sentence + clickable words + record + nav */}
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

        <MascotBubble tone="tip">
          {isDictation
            ? "Nghe và gõ lại từng chữ nhé — gõ đúng thì chữ hiện ra, gõ sai bee sẽ rung!"
            : "Nói theo từng câu nhé — bắt chước đúng nhịp điệu là phát âm lên ngay!"}
        </MascotBubble>

        {/* DICTATION: hide the whole English-answer block (sentence + IPA +
            Vietnamese) until the user finishes typing OR reveals. Showing
            any of these is a direct spoiler — IPA reveals pronunciation
            shape, vi reveals meaning, the sentence itself is the answer. */}
        {!isDictation && (
          <>
            {/* Tabs row — hint at click-to-translate */}
            <div className="flex items-center gap-3 text-xs flex-wrap text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-gold-100 dark:bg-gold-950/40 px-2.5 py-1 font-bold text-gold-700 dark:text-gold-300">
                <Sparkles className="h-3 w-3" /> Click vào từ để dịch
              </span>
              {active?.ipa && (
                <span className="inline-flex items-center gap-1">
                  <Volume2 className="h-3.5 w-3.5" /> IPA bật
                </span>
              )}
            </div>

            {/* Clickable sentence */}
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-relaxed">
              {activeTokens.map((tok, i) =>
                tok.isWord ? (
                  <span
                    key={i}
                    onClick={(e) => onWordClick(tok.text, active.textEn, e)}
                    className="cursor-pointer hover:bg-gold-200/60 dark:hover:bg-gold-900/40 rounded transition-colors px-0.5"
                  >
                    {tok.text}
                  </span>
                ) : (
                  <span key={i}>{tok.text}</span>
                ),
              )}
            </h2>
            {active?.ipa && (
              <div className="border-l-4 border-primary/40 pl-3 font-mono text-base text-muted-foreground">
                /{active.ipa.replace(/^\/|\/$/g, "")}/
              </div>
            )}
            {showVi && active?.textVi && (
              <p className="text-base italic text-foreground/70">{active.textVi}</p>
            )}
          </>
        )}


        {/* DICTATION MODE — letter-by-letter reveal panel. Hidden in
            shadowing mode; shown instead of the record card. */}
        {isDictation && active && (
          <DictationCard
            expected={active.textEn}
            typed={dictTyped}
            shake={dictShake}
            revealed={dictRevealed}
            onReveal={() => {
              setDictRevealed(true);
              setDictTyped(active.textEn.length);
            }}
            onReset={() => {
              setDictTyped(0);
              setDictRevealed(false);
              setDictShake(false);
            }}
          />
        )}

        {/* Big record card — shadowing only. When the video has just
            paused at endSec (waitingForUser), pulse the card amber so
            users know it's their turn to speak. */}
        {!isDictation && (
        <div
          className={cn(
            "rounded-2xl border-2 p-5 flex items-center gap-4 transition-all",
            recording
              ? "border-rose-400 bg-rose-50 dark:bg-rose-950/30 animate-pulse"
              : waitingForUser && !scoring
                ? "border-gold-400 bg-gold-50 dark:bg-gold-950/30 ring-2 ring-gold-200 dark:ring-gold-900"
                : "border-sage-400 bg-sage-50/60 dark:bg-sage-950/30",
          )}
        >
          <button
            type="button"
            onClick={toggleRecord}
            disabled={scoring}
            className={cn(
              "grid h-14 w-14 place-items-center rounded-full text-white shadow-lg transition-transform active:scale-95",
              recording
                ? "bg-rose-500"
                : waitingForUser
                  ? "bg-gold-500 hover:bg-gold-600 animate-bounce"
                  : "bg-sage-500 hover:bg-sage-600",
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
          <div className="flex-1 min-w-0">
            <p className="font-extrabold">
              {scoring
                ? `Đang chấm... ${(scoringMs / 1000).toFixed(1)}s`
                : recording
                  ? "🔴 Đang ghi âm — nói theo câu vừa nghe"
                  : waitingForUser
                    ? followCountdown != null
                      ? `Đọc theo... câu sau sau ${followCountdown}s`
                      : "Đến lượt bạn — nói theo!"
                    : "Nhấn để thu âm"}
            </p>
            <p className="text-xs text-muted-foreground">
              {recording
                ? "Bấm XONG bên phải khi đọc xong • tối đa 60 giây"
                : scoring
                  ? scoringMs > 4000
                    ? "AI hơi chậm hôm nay — đang đợi server STT…"
                    : "Đang gửi audio + AI nhận dạng giọng nói…"
                  : followCountdown != null
                    ? "Bấm mic để dừng đếm ngược + thu âm chấm phát âm"
                    : waitingForUser
                      ? autoRecord && !micDeniedRef.current
                        ? "Đang mở mic..."
                        : "Video đã dừng. Nhấn mic và đọc theo câu này."
                      : "Tối đa 60 giây"}
            </p>
          </div>
          {/* Big XONG button — replaces the tiny stop-circle on the mic
              when auto-record kicked in. User flow: video pauses → mic
              opens automatically → user reads aloud → press XONG to score
              and move on. */}
          {recording && (
            <button
              type="button"
              onClick={() => mediaRef.current?.stop()}
              className="shrink-0 rounded-xl bg-sage-500 hover:bg-sage-600 px-5 py-3 text-white font-extrabold uppercase tracking-wider shadow-lg ring-2 ring-sage-300 active:scale-95"
            >
              XONG
            </button>
          )}
          {/* Cancel button for the auto-follow countdown so users on a
              hard sentence can take all the time they need. */}
          {followCountdown != null && !recording && !scoring && (
            <button
              type="button"
              onClick={clearFollow}
              className="shrink-0 rounded-lg border-2 border-gold-300 bg-white dark:bg-card px-3 py-1.5 text-xs font-bold hover:bg-gold-50 dark:hover:bg-gold-950/30"
            >
              Tạm dừng
            </button>
          )}
        </div>
        )}

        {/* Score result */}
        {score && (
          <div
            className={cn(
              "rounded-2xl border-2 p-4 space-y-2",
              score.score >= 80
                ? "border-sage-400 bg-sage-50 dark:bg-sage-950/20"
                : score.score >= 50
                  ? "border-gold-400 bg-gold-50 dark:bg-gold-950/20"
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
                    ? "text-sage-600"
                    : score.score >= 50
                      ? "text-gold-600"
                      : "text-rose-600",
                )}
              >
                {score.score}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-bold">Bạn nói:</span> &ldquo;{score.transcript}&rdquo;
            </p>
            {score.missingWords.length > 0 && (
              <p className="text-xs">
                <span className="font-bold text-rose-700">Bỏ sót:</span>{" "}
                {score.missingWords.join(", ")}
              </p>
            )}
            {autoNextIn !== null && (
              <div className="flex items-center justify-between gap-2 pt-2 border-t mt-2">
                <p className="text-xs text-muted-foreground">
                  Tự chuyển câu sau <span className="font-extrabold text-foreground">{autoNextIn}s</span>
                  <span className="ml-1 italic">(Tab/Ctrl để giữ lại)</span>
                </p>
                <button
                  onClick={clearAutoNext}
                  className="text-xs font-bold rounded-md px-2 py-1 bg-muted hover:bg-accent"
                >
                  Huỷ
                </button>
              </div>
            )}
          </div>
        )}

        {/* Nav buttons */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <NavCard label="Câu trước" shortcut="Tab" icon={ChevronLeft} onClick={prev} disabled={activeIdx === 0} />
          <NavCard label="Nghe lại" shortcut="Ctrl" icon={RotateCcw} onClick={replay} />
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

      {/* Word translate popup — shared component with the Reading player so
          both pages get the same "save to vocab deck" affordance. */}
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

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-extrabold pb-2 px-2 border-b-2 transition-colors",
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
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
            ? "border-sage-500 bg-sage-100 dark:bg-sage-950/40 hover:bg-sage-200"
            : "border-sage-300 bg-sage-50 dark:bg-sage-950/20 hover:bg-sage-100",
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

/**
 * Dictation panel. 3 visual layers stacked vertically:
 *
 *   1) Blurred preview of the full sentence — the user can see word *shapes*
 *      (length, capitalization) but not read the answer until they've typed
 *      enough to clear the blur on each letter.
 *   2) Per-letter slot boxes — every letter the user must type is its own
 *      empty box; typed letters fill green, current-cursor box outlined
 *      gold. Spaces + punctuation always show.
 *   3) Mario-style bee + obstacle trail — bee walks left→right along a grass
 *      track as `typedLetters / totalLetters` progresses, finish-flag at
 *      the right. Pure CSS, no canvas.
 *
 * Shake on wrong key, "Hiện đáp án" reveals everything, "Làm lại" resets.
 * Auto-advance happens at the parent level when typed === expected.length.
 */
function DictationCard({
  expected,
  typed,
  shake,
  revealed,
  onReveal,
  onReset,
}: {
  expected: string;
  typed: number;
  shake: boolean;
  revealed: boolean;
  onReveal: () => void;
  onReset: () => void;
}) {
  const totalLetters = (expected.match(/[A-Za-z0-9]/g) ?? []).length;
  const typedLetters = (expected.slice(0, typed).match(/[A-Za-z0-9]/g) ?? []).length;
  const pct = totalLetters === 0 ? 0 : Math.round((typedLetters / totalLetters) * 100);

  // Static obstacle pattern derived from the sentence length so it looks
  // varied but reproducible. Each obstacle has a left% and an emoji.
  const obstacles = useMemo(() => {
    const count = Math.min(6, Math.max(3, Math.floor(totalLetters / 6)));
    const icons = ["☁️", "📦", "🌳", "☁️", "🍯", "🌿"];
    return Array.from({ length: count }).map((_, i) => ({
      left: 10 + ((i + 1) * (80 / (count + 1))),
      icon: icons[i % icons.length],
    }));
  }, [totalLetters]);

  return (
    <div
      className={cn(
        "rounded-2xl border-2 p-5 space-y-4 transition-all",
        revealed
          ? "border-sage-400 bg-sage-50 dark:bg-sage-950/30"
          : "border-amber-400 bg-amber-50 dark:bg-amber-950/30",
        shake && "quiz-shake",
      )}
    >
      <div className="flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1.5 font-extrabold text-amber-700 dark:text-amber-300">
          🐝 Type what you hear — letters reveal as you go
        </span>
        <span className="font-extrabold text-foreground">
          {typedLetters} / {totalLetters} · Khớp: {pct}%
        </span>
      </div>

      {/* Layer 1: blurred preview. Lets the learner see how long the
          sentence is + where the word breaks are without revealing the
          spelling. Once everything is typed (or revealed), unblur. */}
      <div
        className={cn(
          "text-xl md:text-2xl font-extrabold tracking-wide leading-relaxed select-none transition-all text-foreground/70",
          !revealed && typedLetters < totalLetters && "blur-md",
        )}
      >
        {expected}
      </div>

      {/* Layer 2: per-letter slot row. */}
      <div className="flex flex-wrap items-end gap-y-2 gap-x-0.5 rounded-xl bg-card border p-3 min-h-[64px]">
        {expected.split("").map((ch, i) => {
          const isLetter = /[A-Za-z0-9]/.test(ch);
          const isRevealed = i < typed || revealed;
          const isCursor = i === typed && !revealed;
          if (!isLetter) {
            // Spaces + punctuation render outside boxes so word boundaries
            // stay readable.
            return (
              <span
                key={i}
                className={cn(
                  "inline-block text-base font-bold pb-1 px-0.5",
                  ch === " " ? "w-2" : "text-muted-foreground",
                )}
              >
                {ch === " " ? "" : ch}
              </span>
            );
          }
          return (
            <span
              key={i}
              className={cn(
                "inline-grid place-items-center h-8 w-6 md:h-9 md:w-7 rounded-md text-sm md:text-base font-extrabold border-2 transition-all",
                isRevealed
                  ? "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                  : isCursor
                    ? "border-amber-500 bg-amber-100/50 dark:bg-amber-950/30 animate-pulse"
                    : "border-foreground/15 bg-muted/40 text-transparent",
              )}
            >
              {isRevealed ? ch : "·"}
            </span>
          );
        })}
      </div>

      {/* Layer 3: Mario-style trail. Bee walks across a grass-on-dirt
          track; obstacles scatter the path; finish flag at the right.
          Pure CSS — no canvas. */}
      <div className="relative h-20 rounded-xl overflow-hidden border-2 border-amber-200 dark:border-amber-800/40 bg-gradient-to-b from-sky-100 via-sky-50 to-amber-100 dark:from-sky-950/40 dark:via-sky-950/20 dark:to-amber-950/40">
        {/* Sky decoration — drifting clouds */}
        <span className="absolute top-1 left-[20%] text-base opacity-50">☁️</span>
        <span className="absolute top-2 left-[55%] text-sm opacity-40">☁️</span>
        <span className="absolute top-1 left-[80%] text-base opacity-50">☁️</span>

        {/* Ground line */}
        <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-b from-amber-300 to-amber-500 dark:from-amber-700 dark:to-amber-900" />
        <div className="absolute bottom-3 left-0 right-0 h-1 bg-emerald-400 dark:bg-emerald-700" />

        {/* Obstacles sit on the ground line. */}
        {obstacles.map((o, i) => (
          <span
            key={i}
            className="absolute bottom-3 -translate-x-1/2 text-lg leading-none"
            style={{ left: `${o.left}%` }}
          >
            {o.icon}
          </span>
        ))}

        {/* Finish flag at the right. */}
        <span className="absolute bottom-3 right-1 text-xl leading-none">🏁</span>

        {/* The bee — its left% = match%. Smooth transition so it visibly
            walks each time the user types a letter. */}
        <div
          className="absolute bottom-3 -translate-x-1/2 transition-all duration-300 ease-out"
          style={{ left: `${Math.min(95, pct)}%` }}
        >
          <div className="grid h-8 w-8 place-items-center rounded-full bg-amber-300 border-2 border-amber-500 shadow-md shadow-amber-500/40 text-base leading-none animate-float">
            🐝
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onReveal}
          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-amber-300 bg-white dark:bg-card px-4 py-2 text-sm font-bold hover:bg-amber-50 dark:hover:bg-amber-950/30"
        >
          👀 Hiện đáp án
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-sage-300 bg-white dark:bg-card px-4 py-2 text-sm font-bold hover:bg-sage-50 dark:hover:bg-sage-950/30"
        >
          ↻ Làm lại
        </button>
        <p className="text-xs text-muted-foreground ml-auto hidden sm:block">
          Gõ chữ — dấu cách + dấu câu tự thêm.
        </p>
      </div>
    </div>
  );
}

function BeeProgress({ pct }: { pct: number }) {
  const safePct = Math.max(0, Math.min(100, pct));
  return (
    <div className="relative pt-3 pb-1">
      <div className="relative h-6">
        {/* Honey-coloured track that fills as the user progresses. */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2.5 rounded-full bg-gradient-to-r from-amber-100 via-orange-100 to-rose-100 dark:from-amber-950/40 dark:via-orange-950/40 dark:to-rose-950/40 border border-amber-200 dark:border-amber-800/40 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 transition-all duration-500"
            style={{ width: `${safePct}%` }}
          />
        </div>

        {/* 🐝 marker — user explicitly asked the bee back. Flies along the
            trail at the current % progress (= completed segments / total).
            Soft float so it looks alive even at 0%. */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-500"
          style={{ left: `calc(${safePct}% )` }}
        >
          <div className="grid h-7 w-7 place-items-center rounded-full bg-amber-300 border-2 border-amber-500 shadow-lg shadow-amber-500/30 text-base leading-none animate-float">
            🐝
          </div>
        </div>

        {/* 🍯 destination — honey jar at the finish line. */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-rose-100 dark:bg-rose-950/40 border-2 border-rose-400 text-base leading-none">
            🍯
          </div>
        </div>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span className="font-bold">Tiến độ</span>
        <span className="font-extrabold text-amber-700 dark:text-amber-300">{safePct}%</span>
      </div>
    </div>
  );
}
