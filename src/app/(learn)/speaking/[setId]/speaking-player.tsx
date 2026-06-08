"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Mic, Loader2, Volume2, ArrowRight, Trophy, Play, Timer,
  Sparkles, MessageSquareQuote, ArrowRightToLine, Wand2, Check, ClipboardList,
} from "lucide-react";
import { formatDuration, cn, personalize } from "@/lib/utils";
import { TipsCard } from "@/components/learn/tips-card";
import { VocabSuggestions, type VocabItem } from "@/components/learn/writing-feedback";
import { playExaminerLine, playStartBeep, timeOfDayGreeting, resetTtsPathLock, primeAudioPlayback, stopExaminerLine } from "@/lib/tts";
import { startWebSpeech, isWebSpeechSupported, type WebSpeechSession } from "@/lib/web-speech";

interface DGWord {
  word: string;
  confidence: number;
}
interface QResult {
  transcript: string;
  words: DGWord[];
}
interface Phrase {
  phrase: string;
  use: string;
}
interface QTip {
  question: string;
  opener: string;
  advice: string;
}
interface Correction {
  original: string;
  corrected: string;
  explanation: string;
}
interface PronFix {
  word: string;
  ipa: string;
  tip: string;
}
interface ParaphraseExample {
  question: string;
  candidateSaid: string;
  comment: string;
}
interface Paraphrasing {
  level: "verbatim" | "minimal" | "partial" | "strong";
  examples: ParaphraseExample[];
  impact: string;
}
interface SpeakingResult {
  overallBand: number;
  criteria: {
    fluencyCoherence: { band: number; feedback: string };
    lexicalResource: { band: number; feedback: string };
    grammaticalRange: { band: number; feedback: string };
    pronunciation: { band: number; feedback: string; note?: string };
  };
  paraphrasing?: Paraphrasing;
  observations: string[];
  corrections?: Correction[];
  pronunciationFixes?: PronFix[];
  questionTips?: QTip[];
  usefulPhrases?: Phrase[];
  collocations?: VocabItem[];
  phrasalVerbs?: VocabItem[];
  improvedSample?: string;
  summary: string;
}

type Phase = "intro" | "part1" | "part2-prep" | "part2-speak" | "part3" | "grading" | "done";
type PartNum = 1 | 2 | 3;

// Words below this recogniser confidence are treated as mispronounced / unclear.
const LOW_CONF = 0.7;

const empty = (): QResult => ({ transcript: "", words: [] });

export function SpeakingPlayer({
  setId,
  topic,
  imageUrl,
  userName,
  part1Questions: rawPart1,
  part2CueCard,
  part3Questions: rawPart3,
  initialParts,
}: {
  setId: string;
  topic: string;
  imageUrl?: string | null;
  userName?: string | null;
  part1Questions: string[];
  part2CueCard: { topic: string; points: string[] };
  part3Questions: string[];
  /** When provided via ?parts=N, pre-select these parts. A single part skips the intro. */
  initialParts?: PartNum[];
}) {
  // Config (luyennoi-style intro card): how many Part-1 questions to play,
  // whether to run in "Căng" 30-sec-per-question mode, voice + follow-ups.
  // Default to 4 questions (or whatever the set has if fewer).
  const maxAvailableP1 = Math.max(2, rawPart1.length || 2);
  const maxQuestions = Math.min(9, maxAvailableP1);
  const defaultNum = Math.min(4, maxAvailableP1);
  const [numQuestions, setNumQuestions] = useState(defaultNum);
  const [mode, setMode] = useState<"cang" | "thuong">("cang");
  const [enableFollowUp, setEnableFollowUp] = useState(true);
  // Practise format: numQuestions in Part 1, 1 cue card in Part 2, 1 question in Part 3.
  const part1Questions = rawPart1.slice(0, numQuestions);
  const part3Questions = rawPart3.slice(0, 1);
  const router = useRouter();
  const startedAtRef = useRef<number>(Date.now());
  // Examiner voice — Aurora, served via the user's own hosted endpoint.
  // The `voice` param is preserved here only because playExaminerLine() still
  // expects it; the server now ignores it and always plays Aurora.
  const voice = "aurora";

  const presetSinglePart = initialParts && initialParts.length === 1 ? initialParts[0] : null;
  const initialPhase: Phase = presetSinglePart
    ? presetSinglePart === 1
      ? "part1"
      : presetSinglePart === 2
        ? "part2-prep"
        : "part3"
    : "intro";
  const initialSelected: Record<PartNum, boolean> = initialParts && initialParts.length > 0
    ? { 1: initialParts.includes(1), 2: initialParts.includes(2), 3: initialParts.includes(3) }
    : { 1: true, 2: true, 3: true };

  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [selectedParts, setSelectedParts] = useState<Record<PartNum, boolean>>(initialSelected);
  const orderedParts: PartNum[] = ([1, 2, 3] as PartNum[]).filter((p) => selectedParts[p]);
  const [qIdx, setQIdx] = useState(0);
  // Self-paced stopwatches: count UP — user controls when to move on / when to stop speaking.
  const [prepElapsed, setPrepElapsed] = useState(0);
  const [recElapsed, setRecElapsed] = useState(0);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [ttsBusy, setTtsBusy] = useState(false);
  const [result, setResult] = useState<SpeakingResult | null>(null);

  const [ans, setAns] = useState<{ 1: QResult[]; 2: QResult; 3: QResult[] }>({
    1: part1Questions.map(empty),
    2: empty(),
    3: part3Questions.map(empty),
  });

  // Big "2..1..GO" countdown shown between the examiner reading the question
  // and the beep that opens recording. 0 = no overlay.
  const [countdown, setCountdown] = useState(0);
  // Notes the candidate types during Part 2 preparation (luyennoi-style pad).
  const [part2Notes, setPart2Notes] = useState("");
  // Recorded audio blobs kept around so the user can re-listen in the review.
  // Keyed by "p1-{idx}" / "p2" / "p3-{idx}". Refs (not state) because we don't
  // want re-renders during recording.
  const audioBlobsRef = useRef<Map<string, Blob>>(new Map());
  const recordingKeyRef = useRef<string | null>(null);
  // Object URLs derived from `audioBlobsRef` once we reach the done view —
  // created in an effect, revoked on unmount.
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  // Per-part greetings — fire once per session, not on every re-render.
  const greetedRef = useRef({ part1: false, part2: false });

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recTimerRef = useRef<NodeJS.Timeout | null>(null);
  // ONE persistent mic stream held for the whole session — getUserMedia is
  // requested up-front on "Bắt đầu" so subsequent question recordings don't
  // need to re-prompt and don't hit Safari's gesture-decay rejection.
  const streamRef = useRef<MediaStream | null>(null);
  // Web Audio analyser for the 3-bar visualiser in the active phase.
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  // Live in-browser STT (Web Speech API) — primary transcription path so the
  // candidate's words always show up even when Deepgram STT can't be reached.
  const webSpeechRef = useRef<WebSpeechSession | null>(null);
  // Live transcript shown under the question while the candidate is talking.
  const [liveTranscript, setLiveTranscript] = useState("");

  const keyForCurrent = (): string => {
    if (phase === "part1") return `p1-${qIdx}`;
    if (phase === "part3") return `p3-${qIdx}`;
    return "p2";
  };

  // When the user reaches the done view, materialise every saved blob into
  // an `<audio>`-friendly object URL so each question card can offer
  // playback. Revoke on unmount to avoid leaking memory.
  useEffect(() => {
    if (phase !== "done") return;
    const urls: Record<string, string> = {};
    for (const [k, blob] of audioBlobsRef.current.entries()) {
      urls[k] = URL.createObjectURL(blob);
    }
    setAudioUrls(urls);
    return () => {
      for (const u of Object.values(urls)) URL.revokeObjectURL(u);
    };
  }, [phase]);

  // Prep stopwatch: counts up while in part2-prep (no auto-flip).
  useEffect(() => {
    if (phase !== "part2-prep") {
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
      return;
    }
    setPrepElapsed(0);
    prepTimerRef.current = setInterval(() => setPrepElapsed((t) => t + 1), 1000);
    return () => {
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    };
  }, [phase]);

  // ---- Examiner TTS: Deepgram with SpeechSynthesis fallback ----
  // The optional `signal` lets the question-reading useEffect abort an
  // in-flight line on cleanup, so a fast phase / qIdx change can't leave
  // two examiner voices playing simultaneously.
  const playTTS = async (text: string, signal?: AbortSignal) => {
    setTtsBusy(true);
    try {
      await playExaminerLine(text, voice, audioRef, signal);
    } finally {
      if (!signal?.aborted) setTtsBusy(false);
    }
  };

  // Examiner flow: greeting (once per part) → read question → 2-sec countdown
  // → beep → auto-start recording. Modelled after luyennoi.com / the real
  // IELTS Speaking test so the candidate doesn't have to remember to press
  // the record button after every question.
  //
  // CRITICAL: the AbortController is what prevents "2 voices at once". React
  // Strict Mode runs effects twice and a fast qIdx change re-fires this — if
  // we only used a `cancelled` flag, both invocations of playTTS would race
  // their /api/speaking/tts fetches and BOTH would eventually start audio.
  // Aborting the signal kills the in-flight fetch + stops any source that
  // already started, so only the latest effect run actually plays.
  useEffect(() => {
    const ac = new AbortController();
    const { signal } = ac;
    // Stop any leftover line from a previous phase before kicking off a new
    // one — extra belt-and-braces beyond the new tts.ts source tracking.
    stopExaminerLine(audioRef);

    (async () => {
      // Part 1 opens with a friendly greeting tailored to the candidate's
      // local time of day — only on the very first Part 1 question.
      if (phase === "part1" && qIdx === 0 && !greetedRef.current.part1) {
        greetedRef.current.part1 = true;
        await playTTS(
          `Hi, ${timeOfDayGreeting()}. Today I want to ask you some questions.`,
          signal,
        );
        if (signal.aborted) return;
      }
      // Part 2 prep opens by setting expectations about prep time + notes.
      if (phase === "part2-prep" && !greetedRef.current.part2) {
        greetedRef.current.part2 = true;
        await playTTS(
          "Now I will give you a topic, and you will have one to two minutes to prepare and take notes.",
          signal,
        );
        if (signal.aborted) return;
      }

      // Read the question / cue card. Skip part2-speak because the cue was
      // already read during prep.
      let q = "";
      if (phase === "part1") q = part1Questions[qIdx] || "";
      else if (phase === "part3") q = part3Questions[qIdx] || "";
      else if (phase === "part2-prep") q = part2CueCard.topic;
      if (q) {
        await playTTS(q, signal);
        if (signal.aborted) return;
      }

      // Auto-record handshake — only for live answering phases, and only if
      // this slot hasn't already been recorded (so "Ghi âm lại" stays manual).
      const isAnswerPhase =
        phase === "part1" || phase === "part3" || phase === "part2-speak";
      if (!isAnswerPhase) return;
      const existing =
        phase === "part1"
          ? ans[1][qIdx]
          : phase === "part3"
            ? ans[3][qIdx]
            : ans[2];
      if (existing?.transcript) return;

      for (let n = 2; n > 0; n--) {
        if (signal.aborted) return;
        setCountdown(n);
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (signal.aborted) return;
      setCountdown(0);
      await playStartBeep();
      if (signal.aborted) return;
      startRecording();
    })();

    return () => {
      ac.abort();
      setCountdown(0);
      stopExaminerLine(audioRef);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qIdx]);

  // Acquire microphone once, reuse for every question. Safari and some
  // Chromium variants reject getUserMedia if too much time has elapsed since
  // the original user gesture — we cache the stream + Web Audio analyser so
  // the auto-record flow can fire any time without re-prompting.
  const ensureMicrophone = async (): Promise<boolean> => {
    if (streamRef.current && streamRef.current.getAudioTracks().some((t) => t.readyState === "live")) {
      return true;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      // Build the analyser once — feeds the waveform bars while recording.
      try {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AC) {
          const ctx = new AC();
          const src = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          src.connect(analyser);
          audioCtxRef.current = ctx;
          analyserRef.current = analyser;
        }
      } catch (e) {
        console.warn("[mic] analyser setup failed (visualiser will be static)", e);
      }
      return true;
    } catch (e) {
      console.error("[mic] getUserMedia failed", e);
      toast.error("Không truy cập được micro. Hãy cấp quyền micro và thử lại.");
      return false;
    }
  };

  // ---- Recording (MediaRecorder) + transcription via Deepgram ----
  const startRecording = async () => {
    // Defensive: tear down any leftover recorder before opening a new one.
    // Otherwise two MediaRecorders can race on the same stream and the new
    // recording silently drops all chunks.
    if (recorderRef.current) {
      try {
        if (recorderRef.current.state !== "inactive") recorderRef.current.stop();
      } catch {
        /* ignore */
      }
      recorderRef.current = null;
    }
    const ok = await ensureMicrophone();
    if (!ok || !streamRef.current) return;
    try {
      const stream = streamRef.current;
      // If a previous track was somehow ended, request a fresh stream.
      if (!stream.getAudioTracks().some((t) => t.readyState === "live")) {
        streamRef.current = null;
        const got = await ensureMicrophone();
        if (!got || !streamRef.current) return;
      }
      const liveStream = streamRef.current!;
      // Let the browser pick its native default mimeType — this is the most
      // compatible across Chrome / Firefox / Safari and the resulting blob
      // type is whatever Deepgram already knows how to handle.
      const mr = new MediaRecorder(liveStream);
      console.log("[recorder] starting with mimeType:", mr.mimeType);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onerror = (e) => {
        console.error("[recorder] error event", e);
        toast.error("Lỗi MediaRecorder — thử bấm 'Ghi âm lại'.");
      };
      mr.onstop = async () => {
        const blobType = mr.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: blobType });
        console.log(`[recorder] stop — blob type=${blobType} size=${blob.size}`);
        const key = recordingKeyRef.current ?? keyForCurrent();
        if (blob.size >= 1200) {
          audioBlobsRef.current.set(key, blob);
        }
        recordingKeyRef.current = null;

        // Grab whatever Web Speech captured first — instant, in-browser.
        const browserTranscript = webSpeechRef.current?.getTranscript() ?? "";
        webSpeechRef.current?.stop();
        webSpeechRef.current = null;

        if (browserTranscript.trim().length > 0) {
          console.log("[transcribe] using Web Speech transcript:", browserTranscript);
          applyTranscript(browserTranscript, []);
          return;
        }
        // Web Speech gave nothing — fall back to Deepgram STT with the blob.
        if (blob.size < 1200) {
          toast.error("Không thu được tiếng — kiểm tra micro và thử lại.");
          return;
        }
        await transcribe(blob);
      };
      recordingKeyRef.current = keyForCurrent();
      // Start Web Speech alongside MediaRecorder. Live transcript shows up in
      // the UI as the candidate speaks.
      setLiveTranscript("");
      if (isWebSpeechSupported()) {
        webSpeechRef.current = startWebSpeech({
          lang: "en-US",
          onInterim: (t) => setLiveTranscript(t),
          onError: (err) => console.warn("[web-speech]", err),
        });
        if (!webSpeechRef.current) {
          console.warn("[web-speech] failed to start — Deepgram STT will handle it");
        }
      } else {
        console.warn("[web-speech] not supported in this browser");
      }
      // No timeslice — single contiguous EBML container on stop.
      mr.start();
      recorderRef.current = mr;
      setRecording(true);
      setRecElapsed(0);
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      recTimerRef.current = setInterval(() => setRecElapsed((t) => t + 1), 1000);
    } catch (e) {
      console.error("[recorder] start failed", e);
      toast.error("Không bắt đầu được ghi âm — thử bấm 'Bấm để nói' thủ công.");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        /* ignore — already stopped */
      }
    }
    recorderRef.current = null;
    setRecording(false);
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
  };

  // Căng mode: hard 30-sec cap per question — once reached, examiner cuts in
  // and we auto-stop the take. Matches luyennoi.com's "Giới hạn 30s mỗi câu".
  useEffect(() => {
    if (mode !== "cang" || !recording) return;
    if (recElapsed >= 30) {
      toast.info("Hết 30 giây — giám khảo ngắt lời, chuyển câu.");
      stopRecording();
    }
  }, [mode, recording, recElapsed]);

  // Release the persistent mic stream + audio context when the player
  // unmounts, so the browser's recording indicator disappears.
  useEffect(() => {
    return () => {
      webSpeechRef.current?.stop();
      webSpeechRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      audioCtxRef.current?.close().catch(() => undefined);
      audioCtxRef.current = null;
      analyserRef.current = null;
    };
  }, []);

  // Slot a finished transcript into ans for the current question. Shared by
  // both the Web Speech and Deepgram paths so the resulting state shape is
  // identical regardless of which engine produced the text.
  const applyTranscript = (transcript: string, words: DGWord[]) => {
    const qr: QResult = { transcript, words };
    setAns((prev) => {
      if (phase === "part1") {
        const arr = [...prev[1]];
        arr[qIdx] = qr;
        return { ...prev, 1: arr };
      }
      if (phase === "part3") {
        const arr = [...prev[3]];
        arr[qIdx] = qr;
        return { ...prev, 3: arr };
      }
      return { ...prev, 2: qr };
    });
  };

  const transcribe = async (blob: Blob) => {
    setTranscribing(true);
    try {
      console.log(`[transcribe] sending ${blob.size} bytes, type=${blob.type}`);
      const res = await fetch("/api/speaking/transcribe", {
        method: "POST",
        headers: { "Content-Type": blob.type || "audio/webm" },
        body: blob,
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("[transcribe] server error:", res.status, data);
        throw new Error(data.error || `Lỗi ${res.status}`);
      }
      console.log(`[transcribe] got transcript: "${data.transcript ?? ""}"`);
      if (!data.transcript || !data.transcript.trim()) {
        toast.error("Không nghe được gì — thử nói to và rõ hơn.");
      }
      applyTranscript(data.transcript || "", data.words || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nhận dạng giọng nói thất bại");
    } finally {
      setTranscribing(false);
    }
  };

  // ---- navigation ----
  const goPart2Prep = () => {
    // Self-paced: just enter prep phase. The stopwatch effect in useEffect handles the timer,
    // and the user manually clicks "Sẵn sàng nói" when ready.
    setPhase("part2-prep");
  };

  const isLastStep = () => {
    const currentPart: PartNum | null =
      phase === "part1" ? 1 : phase === "part2-speak" ? 2 : phase === "part3" ? 3 : null;
    if (currentPart == null) return false;
    const isLastPart = orderedParts.indexOf(currentPart) === orderedParts.length - 1;
    if (!isLastPart) return false;
    if (currentPart === 1) return qIdx + 1 >= part1Questions.length;
    if (currentPart === 3) return qIdx + 1 >= part3Questions.length;
    return true; // part 2 has a single utterance
  };

  const advanceAfterPart = (finished: PartNum) => {
    const idx = orderedParts.indexOf(finished);
    const next = orderedParts[idx + 1];
    if (next == null) {
      submitAndGrade();
      return;
    }
    setQIdx(0);
    if (next === 1) setPhase("part1");
    else if (next === 2) goPart2Prep();
    else setPhase("part3");
  };

  const nextQuestion = () => {
    stopRecording();
    if (phase === "part1") {
      if (qIdx + 1 < part1Questions.length) setQIdx((i) => i + 1);
      else advanceAfterPart(1);
    } else if (phase === "part2-speak") {
      advanceAfterPart(2);
    } else if (phase === "part3") {
      if (qIdx + 1 < part3Questions.length) setQIdx((i) => i + 1);
      else advanceAfterPart(3);
    }
  };

  // ---- grading ----
  const submitAndGrade = async () => {
    stopRecording();
    setPhase("grading");
    const durationSec = Math.floor((Date.now() - startedAtRef.current) / 1000);

    const sections: string[] = [];
    const allQuestions: string[] = [];
    const allWords: DGWord[] = [];

    if (selectedParts[1]) {
      sections.push(
        `[Part 1]\n${part1Questions
          .map((q, i) => `Q${i + 1}: ${q}\nA: ${ans[1][i]?.transcript || "(no answer)"}`)
          .join("\n")}`,
      );
      allQuestions.push(...part1Questions);
      allWords.push(...ans[1].flatMap((r) => r.words));
    }
    if (selectedParts[2]) {
      sections.push(`[Part 2]\nCue: ${part2CueCard.topic}\nA: ${ans[2].transcript || "(no answer)"}`);
      allQuestions.push(`Part 2 cue card: ${part2CueCard.topic} — You should say: ${part2CueCard.points.join("; ")}`);
      allWords.push(...ans[2].words);
    }
    if (selectedParts[3]) {
      sections.push(
        `[Part 3]\n${part3Questions
          .map((q, i) => `Q${i + 1}: ${q}\nA: ${ans[3][i]?.transcript || "(no answer)"}`)
          .join("\n")}`,
      );
      allQuestions.push(...part3Questions);
      allWords.push(...ans[3].flatMap((r) => r.words));
    }
    const combined = sections.join("\n\n");

    const lowConfidenceWords = Array.from(
      new Set(
        allWords
          .filter((w) => w.confidence < LOW_CONF)
          .map((w) => w.word.toLowerCase().replace(/[^a-z']/g, "")),
      ),
    ).filter(Boolean);

    try {
      const res = await fetch("/api/grade/speaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setId,
          part: 1,
          topic,
          questions: allQuestions,
          transcript: combined,
          lowConfidenceWords,
          durationSec,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.result);
      setPhase("done");
    } catch (e) {
      console.error(e);
      toast.error("Chấm bài thất bại");
      setPhase("done");
    }
  };

  // ============================== INTRO (luyennoi-style config) =============
  if (phase === "intro") {
    const partsLabel = orderedParts.length === 1 ? `Part ${orderedParts[0]}` : "Speaking";
    const noneSelected = orderedParts.length === 0;
    const togglePart = (p: PartNum) =>
      setSelectedParts((prev) => ({ ...prev, [p]: !prev[p] }));
    const startSession = async () => {
      if (noneSelected) return;
      // CRITICAL: prime audio playback synchronously inside this gesture
      // before any `await` — otherwise the autoplay policy blocks every
      // subsequent audio.play() in the auto-read effect and the candidate
      // hears nothing.
      primeAudioPlayback();
      // New session → reset the TTS path lock so the new voice/gender choice
      // gets a fresh shot at Deepgram.
      resetTtsPathLock();
      // Pre-warm the microphone while we still have a fresh user gesture —
      // this is what makes the auto-record at countdown=0 reliable.
      await ensureMicrophone();
      startedAtRef.current = Date.now();
      setAns({
        1: part1Questions.map(empty),
        2: empty(),
        3: part3Questions.map(empty),
      });
      setQIdx(0);
      const first = orderedParts[0];
      if (first === 1) setPhase("part1");
      else if (first === 2) goPart2Prep();
      else setPhase("part3");
    };
    return (
      <div className="max-w-3xl mx-auto py-6">
        <div className="rounded-3xl border bg-card shadow-sm p-6 md:p-8 space-y-6">
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-center">
            Test {partsLabel} — Thi thử, nhận điểm và sửa lỗi
          </h1>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Left column: pitch bullets + part selector */}
            <div className="space-y-4">
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-start gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-emerald-600 shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span>Làm quen với cấu trúc bài thi, áp lực như thi thật.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-emerald-600 shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span>Nhận đánh giá điểm sát như thi thật.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-emerald-600 shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span>AI examiner đọc câu hỏi như người thật — bạn chỉ cần trả lời.</span>
                </li>
              </ul>

              <div className="space-y-1.5">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Phần luyện
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {([1, 2, 3] as PartNum[]).map((p) => {
                    const active = selectedParts[p];
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePart(p)}
                        aria-pressed={active}
                        className={cn(
                          "rounded-full border-2 px-3 py-1 text-xs font-bold transition-all",
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-input text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        Part {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right column: config form (mode, voice, num questions, follow-up) */}
            <div className="space-y-5">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Chế độ thi
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <span
                    role="switch"
                    aria-checked={mode === "cang"}
                    onClick={() => setMode(mode === "cang" ? "thuong" : "cang")}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors",
                      mode === "cang" ? "bg-primary" : "bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                        mode === "cang" ? "translate-x-5" : "translate-x-0.5",
                      )}
                    />
                  </span>
                  <span>
                    <span className={cn("font-extrabold", mode === "cang" && "text-primary")}>
                      Căng — chuẩn phòng thi
                    </span>
                    <span className="block text-xs text-muted-foreground leading-snug">
                      Giới hạn thời gian mỗi câu. Hết giờ là giám khảo ngắt lời để sang câu sau.
                      Tối đa 30 giây mỗi câu.
                    </span>
                  </span>
                </label>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Giọng giám khảo
                </div>
                <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2">
                  <button
                    type="button"
                    onClick={() =>
                      playTTS("Hi, how are you today? Let's begin the test.")
                    }
                    disabled={ttsBusy}
                    aria-label="Nghe thử giọng"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50"
                  >
                    {ttsBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                  </button>
                  <div className="flex-1 text-sm">
                    <span className="font-extrabold">Aurora</span>
                    <span className="text-xs text-muted-foreground ml-1.5">
                      (Female · American)
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Giọng cố định cho mọi phần Speaking.
                </p>
              </div>

              {selectedParts[1] && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Số câu hỏi (Part 1)
                    </div>
                    <div className="text-sm font-extrabold text-primary">{numQuestions}</div>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={maxQuestions}
                    step={1}
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground -mt-1">
                    {Array.from({ length: maxQuestions - 1 }, (_, i) => i + 2).map((n) => (
                      <span key={n}>{n}</span>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-semibold">Thêm follow-up questions</span>
                <span
                  role="switch"
                  aria-checked={enableFollowUp}
                  onClick={() => setEnableFollowUp((v) => !v)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors",
                    enableFollowUp ? "bg-primary" : "bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                      enableFollowUp ? "translate-x-5" : "translate-x-0.5",
                    )}
                  />
                </span>
              </label>
            </div>
          </div>

          <div className="border-t pt-4 flex items-center justify-between">
            <Button
              variant="outline"
              size="lg"
              className="rounded-full px-6"
              onClick={() => router.push("/speaking")}
            >
              Thoát
            </Button>
            <Button
              variant="brand"
              size="lg"
              className="rounded-full px-8"
              disabled={noneSelected}
              onClick={startSession}
            >
              Bắt đầu
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ============================== GRADING ==============================
  if (phase === "grading") {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <h2 className="text-2xl font-extrabold">AI đang chấm bài...</h2>
          <p className="text-muted-foreground max-w-md">Đợi ~20-30 giây</p>
        </div>
      </div>
    );
  }

  // ============================== DONE ==============================
  if (phase === "done" && result) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="text-center space-y-2">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl gradient-brand text-white shadow-lg shadow-primary/30">
            <Trophy className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Hoàn thành Speaking 🎉</h1>
        </div>

        <Card className="bg-gradient-to-br from-primary/10 to-accent border-2 border-primary/20">
          <CardContent className="p-8 text-center">
            <div className="text-sm text-muted-foreground">Speaking Band</div>
            <div className="text-6xl font-extrabold gradient-brand-text mt-2">{result.overallBand.toFixed(1)}</div>
            <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">{personalize(result.summary, userName)}</p>
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-2 gap-3">
          {Object.entries(result.criteria).map(([k, v]) => (
            <Card key={k}>
              <CardContent className="p-4">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{labelOf(k)}</span>
                  <span className="text-lg font-bold text-primary">{v.band.toFixed(1)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{personalize(v.feedback, userName)}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {result.paraphrasing && (
          <ParaphrasingCard data={result.paraphrasing} />
        )}

        {/* Transcript review — each question shows a native HTML5 audio
            player for the user's own recording PLUS the transcript with
            mispronounced words underlined. Same affordance as luyennoi.com. */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-extrabold flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-primary" /> Bài nói của bạn (audio + văn bản)
            </h3>
            <p className="text-xs text-muted-foreground -mt-1">
              Nhấn ▶︎ để nghe lại bản ghi âm. Từ <span className="font-bold underline">in đậm gạch chân</span> là phát âm chưa rõ — nhấn để nghe cách đọc đúng.
            </p>
            {[
              ...(selectedParts[1]
                ? part1Questions.map((_q, i) => ({ q: `Part 1 · Câu ${i + 1}`, r: ans[1][i], key: `p1-${i}` }))
                : []),
              ...(selectedParts[2]
                ? [{ q: `Part 2 · ${part2CueCard.topic}`, r: ans[2], key: "p2" }]
                : []),
              ...(selectedParts[3]
                ? part3Questions.map((_q, i) => ({ q: `Part 3 · Câu ${i + 1}`, r: ans[3][i], key: `p3-${i}` }))
                : []),
            ].map((item, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <div className="text-xs font-bold text-muted-foreground">{item.q}</div>
                {audioUrls[item.key] && (
                  <audio
                    controls
                    src={audioUrls[item.key]}
                    className="w-full h-10"
                    preload="metadata"
                  />
                )}
                <TranscriptView result={item.r} onSpeak={playTTS} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Pronunciation fixes — IPA + tips for unclear words */}
        {result.pronunciationFixes && result.pronunciationFixes.length > 0 && (
          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="font-extrabold flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-rose-500" /> Sửa phát âm
              </h3>
              <p className="text-xs text-muted-foreground -mt-1">
                Phiên âm IPA + cách đọc đúng cho các từ bạn phát âm chưa rõ. Nhấn loa để nghe.
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {result.pronunciationFixes.map((p, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => playTTS(p.word)}
                        disabled={ttsBusy}
                        className="font-bold inline-flex items-center gap-1.5 hover:text-primary"
                      >
                        <Volume2 className="h-4 w-4" /> {p.word}
                      </button>
                      <span className="text-sm font-mono text-primary">{p.ipa}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{p.tip}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Corrections — the fixed version of the candidate's mistakes */}
        {result.corrections && result.corrections.length > 0 && (
          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="font-extrabold flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-emerald-500" /> Lỗi & cách sửa
              </h3>
              <div className="space-y-2">
                {result.corrections.map((c, i) => (
                  <div key={i} className="rounded-lg border p-3 space-y-1">
                    <p className="text-sm text-destructive line-through">{c.original}</p>
                    <p className="text-sm font-semibold text-success flex items-start gap-1.5">
                      <span className="shrink-0">✅</span>
                      <button onClick={() => playTTS(c.corrected)} className="text-left hover:underline">
                        {c.corrected}
                      </button>
                    </p>
                    <p className="text-xs text-muted-foreground">{c.explanation}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Per-question tips — opening sentence + how to develop the answer (English) */}
        {result.questionTips && result.questionTips.length > 0 && (
          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="font-extrabold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" /> Tips for each question
              </h3>
              <p className="text-xs text-muted-foreground -mt-1">
                Câu mở đầu gợi ý và cách triển khai cho từng câu hỏi. Nhấn loa để nghe.
              </p>
              <div className="space-y-2.5">
                {result.questionTips.map((t, i) => (
                  <div key={i} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => playTTS(t.question)}
                        disabled={ttsBusy}
                        className="text-primary shrink-0 mt-0.5"
                        aria-label="Nghe câu hỏi"
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                      <p className="text-sm font-bold">{t.question}</p>
                    </div>
                    <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 p-2.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 mb-1">
                        <ArrowRightToLine className="h-3.5 w-3.5" /> Opening sentence
                      </div>
                      <button
                        onClick={() => playTTS(t.opener)}
                        disabled={ttsBusy}
                        className="text-sm italic text-emerald-800 dark:text-emerald-200 hover:underline text-left inline-flex items-start gap-1.5"
                      >
                        <Volume2 className="h-3.5 w-3.5 mt-0.5 shrink-0" /> &ldquo;{t.opener}&rdquo;
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{t.advice}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Useful phrases & idioms for this topic */}
        {result.usefulPhrases && result.usefulPhrases.length > 0 && (
          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="font-extrabold flex items-center gap-2">
                <MessageSquareQuote className="h-5 w-5 text-leaf" /> Useful phrases &amp; idioms
              </h3>
              <div className="space-y-1.5">
                {result.usefulPhrases.map((p, i) => (
                  <div key={i} className="rounded-lg border bg-leaf-tint dark:bg-leaf-deep/20 p-2.5">
                    <button
                      onClick={() => playTTS(p.phrase)}
                      className="text-sm font-bold text-leaf-deep dark:text-leaf inline-flex items-center gap-1 hover:underline"
                    >
                      <Volume2 className="h-3.5 w-3.5" /> {p.phrase}
                    </button>
                    <div className="text-xs text-muted-foreground mt-0.5">{p.use}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Collocations & phrasal verbs — expand vocabulary */}
        <VocabSuggestions
          collocations={result.collocations}
          phrasalVerbs={result.phrasalVerbs}
          onSpeak={playTTS}
        />

        {result.observations.length > 0 && (
          <Card className="border-2 border-primary/30 bg-primary/[0.03]">
            <CardContent className="p-5">
              <h3 className="text-xl font-extrabold tracking-tight mb-3 flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
                  <ClipboardList className="h-5 w-5" />
                </span>
                Nhận xét chi tiết
              </h3>
              <ul className="space-y-2 text-sm">
                {result.observations.map((o, i) => (
                  <li key={i} className="flex gap-2 leading-relaxed">
                    <span className="text-primary font-bold shrink-0">•</span>
                    <span>{personalize(o, userName)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {result.improvedSample && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">Câu trả lời mẫu (band 7.5)</h3>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => playTTS(result.improvedSample!)} disabled={ttsBusy}>
                  <Volume2 className="h-4 w-4" /> Nghe
                </Button>
              </div>
              <div className="whitespace-pre-wrap text-sm text-muted-foreground">{result.improvedSample}</div>
            </CardContent>
          </Card>
        )}

        <TipsCard skill="SPEAKING" score={result.overallBand} context={`Speaking practice, topic: ${topic}`} />

        <Button onClick={() => router.push("/speaking")} variant="brand" size="xl" className="w-full rounded-full">
          Làm bài khác
        </Button>
      </div>
    );
  }

  // ============================== ACTIVE PHASES (luyennoi-style) ============
  const isQ = phase === "part1" || phase === "part3";
  const questions = phase === "part1" ? part1Questions : part3Questions;
  const currentQ = isQ ? questions[qIdx] : "";
  const currentResult =
    phase === "part1" ? ans[1][qIdx] : phase === "part3" ? ans[3][qIdx] : ans[2];
  const partTitle =
    phase === "part1"
      ? "PART 1"
      : phase === "part2-prep" || phase === "part2-speak"
        ? "PART 2"
        : "PART 3";

  // Part 2 prep keeps its own dedicated layout (cue card + notes) — image 2
  // of the user's mockups. Question phases share the minimal top/center/bottom
  // layout (image 1's recording screen).
  if (phase === "part2-prep") {
    return (
      <div className="max-w-3xl mx-auto py-6">
        <div className="rounded-3xl border bg-card shadow-sm p-5 md:p-7 space-y-5">
          <SpeakingTopBar
            mode={mode}
            partTitle="PART 2"
            elapsed={prepElapsed}
            onExit={() => router.push("/speaking")}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-white border-2 border-border dark:bg-muted/40 dark:border-border shadow-sm">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-base text-honey-deep dark:text-honey">
                    {part2CueCard.topic}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full h-8 w-8 p-0"
                    onClick={() => playTTS(part2CueCard.topic)}
                    disabled={ttsBusy}
                    aria-label="Nghe đề"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt=""
                    className="w-full max-h-40 rounded-lg border bg-background object-contain"
                  />
                )}
                <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground dark:text-muted-foreground">
                  {part2CueCard.points.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <textarea
              value={part2Notes}
              onChange={(e) => setPart2Notes(e.target.value)}
              placeholder="Ghi chú ở đây..."
              className="min-h-[200px] rounded-lg border-2 border-border bg-background p-3 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-border"
            />
          </div>
          <div className="border-t pt-4 flex items-center justify-between">
            <div className="text-sm text-primary inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              {prepElapsed < 60
                ? `Chuẩn bị ghi chú sau ${Math.max(0, 60 - prepElapsed)} giây`
                : "Đã sẵn sàng — có thể nhấn 'Bắt đầu nói'"}
            </div>
            <Button
              onClick={() => setPhase("part2-speak")}
              variant="brand"
              size="lg"
              className="rounded-full"
            >
              Bắt đầu nói <Play className="h-4 w-4 fill-current" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Question phases (Part 1 / Part 2 speak / Part 3) ----
  const partQuestionsTotal = isQ ? questions.length : 1;
  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="rounded-3xl border bg-card shadow-sm p-5 md:p-7 flex flex-col min-h-[520px]">
        <SpeakingTopBar
          mode={mode}
          partTitle={partTitle}
          elapsed={recElapsed}
          onExit={() => router.push("/speaking")}
          questionIndex={isQ ? qIdx + 1 : undefined}
          questionTotal={isQ ? partQuestionsTotal : undefined}
        />

        <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 py-6">
          {/* Cue card content shown alongside notes during Part 2 speak */}
          {phase === "part2-speak" && (
            <div className="w-full text-left rounded-lg border-2 border-border bg-white/60 dark:bg-muted/40 dark:border-border p-3 space-y-1">
              <div className="font-bold text-honey-deep dark:text-honey">
                {part2CueCard.topic}
              </div>
              <ul className="list-disc pl-5 text-sm space-y-0.5 text-muted-foreground dark:text-muted-foreground">
                {part2CueCard.points.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
              {part2Notes.trim() && (
                <div className="mt-2 rounded-md bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1.5">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    Ghi chú của bạn
                  </div>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed">{part2Notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Question text — visible at all times so the candidate can refer
              back to it while speaking (matches luyennoi.com's behaviour of
              keeping the question on-screen during the answer). */}
          <div className="w-full">
            <div className="rounded-2xl border-2 border-primary/20 bg-primary/[0.04] dark:bg-primary/[0.08] p-5 md:p-6 text-center">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-primary/80 mb-2">
                Câu hỏi
              </div>
              <p className="text-lg md:text-xl font-bold leading-snug text-foreground">
                {phase === "part2-speak" ? part2CueCard.topic : currentQ}
              </p>
              {phase === "part2-speak" && part2CueCard.points.length > 0 && (
                <ul className="mt-3 inline-block text-left list-disc pl-5 text-sm text-muted-foreground dark:text-muted-foreground">
                  {part2CueCard.points.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              )}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() =>
                    playTTS(phase === "part2-speak" ? part2CueCard.topic : currentQ)
                  }
                  disabled={ttsBusy}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white hover:bg-muted dark:bg-muted dark:hover:bg-muted border px-4 py-1.5 text-sm font-semibold disabled:opacity-50"
                >
                  {ttsBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                  Nghe lại
                </button>
              </div>
            </div>
          </div>

          {countdown > 0 && !recording ? (
            <div className="flex flex-col items-center gap-1">
              <div className="text-xs font-extrabold uppercase tracking-wider text-primary">
                Sẵn sàng nói trong...
              </div>
              <div className="text-6xl font-extrabold text-primary tabular-nums animate-pulse leading-none">
                {countdown}
              </div>
              <div className="text-xs text-muted-foreground">
                Sẽ có tiếng bíp khi bắt đầu ghi âm
              </div>
            </div>
          ) : recording && liveTranscript ? (
            // Live caption while the candidate speaks — Web Speech updates
            // this in real-time so they SEE their words being captured.
            <div className="w-full max-w-2xl rounded-2xl border-2 border-primary/30 bg-primary/10 dark:bg-primary/10 dark:border-primary/30 p-4 text-left">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-primary mb-1">
                Bạn đang nói (live)
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{liveTranscript}</p>
            </div>
          ) : recording ? (
            <p className="text-sm text-primary max-w-md leading-relaxed animate-pulse">
              Đang nghe bạn nói... cứ trả lời tự nhiên rồi nhấn{" "}
              <span className="font-bold">Ghi nhận câu trả lời</span>.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              <span className="text-muted-foreground">*</span>Trả lời câu hỏi, sau đó nhấn{" "}
              <span className="font-bold text-primary">Ghi nhận câu trả lời</span> để sang câu
              tiếp theo.
            </p>
          )}
        </div>

        <div className="border-t pt-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-[140px]">
            {recording ? (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-semibold text-primary">Đang ghi âm...</span>
              </>
            ) : transcribing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Đang nhận dạng...</span>
              </>
            ) : currentResult.transcript ? (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-sm font-semibold text-emerald-600">Đã ghi xong</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Sẵn sàng</span>
            )}
          </div>

          <WaveformBars active={recording} analyser={analyserRef} />

          <div className="flex items-center gap-2">
            {!recording && currentResult.transcript && (
              <Button
                onClick={startRecording}
                disabled={transcribing || countdown > 0 || ttsBusy}
                variant="outline"
                size="sm"
                className="rounded-full"
              >
                <Mic className="h-4 w-4" /> Ghi âm lại
              </Button>
            )}
            {recording ? (
              <Button
                onClick={nextQuestion}
                disabled={transcribing}
                variant="brand"
                size="lg"
                className="rounded-full px-5"
              >
                Ghi nhận câu trả lời
              </Button>
            ) : (
              <Button
                onClick={nextQuestion}
                disabled={transcribing || (!currentResult.transcript && countdown === 0 && !ttsBusy)}
                variant="brand"
                size="lg"
                className="rounded-full px-5"
              >
                {isLastStep() ? "Nộp bài & chấm" : "Ghi nhận câu trả lời"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Top bar shared by every active speaking phase. Matches image 2's layout:
 *  [Căng tag] · ........ PART X ........ · [Thoát] / divider line. */
function SpeakingTopBar({
  mode,
  partTitle,
  elapsed,
  onExit,
  questionIndex,
  questionTotal,
}: {
  mode: "cang" | "thuong";
  partTitle: string;
  elapsed: number;
  onExit: () => void;
  questionIndex?: number;
  questionTotal?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-3">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border-2 px-3 py-1 text-xs font-extrabold",
            mode === "cang"
              ? "border-primary text-primary"
              : "border-border text-muted-foreground",
          )}
        >
          <Timer className="h-3.5 w-3.5" /> {mode === "cang" ? "Căng" : "Thường"}
        </span>
        {questionIndex != null && questionTotal != null && questionTotal > 1 && (
          <span className="text-xs text-muted-foreground">
            Câu {questionIndex}/{questionTotal}
          </span>
        )}
      </div>
      <div className="font-extrabold tracking-wider">{partTitle}</div>
      <div className="flex items-center gap-2">
        {elapsed > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatDuration(elapsed)}
          </span>
        )}
        <button
          type="button"
          onClick={onExit}
          className="rounded-full border-2 border-border px-3 py-1 text-xs font-bold text-muted-foreground hover:border-border"
        >
          Thoát
        </button>
      </div>
    </div>
  );
}

/** Three audio-reactive bars (image 2's mid widget). When `analyser` is
 *  connected we drive heights from FFT levels; otherwise just CSS pulses
 *  so the candidate gets visual feedback even if Web Audio is unavailable. */
function WaveformBars({
  active,
  analyser,
}: {
  active: boolean;
  analyser: { current: AnalyserNode | null };
}) {
  const [levels, setLevels] = useState<[number, number, number]>([0.3, 0.3, 0.3]);
  useEffect(() => {
    if (!active || !analyser.current) {
      setLevels([0.3, 0.3, 0.3]);
      return;
    }
    let raf = 0;
    const buf = new Uint8Array(analyser.current.frequencyBinCount);
    const tick = () => {
      const a = analyser.current;
      if (!a) return;
      a.getByteFrequencyData(buf);
      // Cheap 3-band split.
      const len = buf.length;
      const band = (s: number, e: number) => {
        let sum = 0;
        for (let i = s; i < e; i++) sum += buf[i];
        return sum / (e - s) / 255;
      };
      setLevels([
        0.25 + band(0, Math.floor(len / 3)) * 0.9,
        0.25 + band(Math.floor(len / 3), Math.floor((2 * len) / 3)) * 0.9,
        0.25 + band(Math.floor((2 * len) / 3), len) * 0.9,
      ]);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, analyser]);
  return (
    <div className="flex items-end gap-1 h-7" aria-hidden>
      {levels.map((l, i) => (
        <span
          key={i}
          className={cn(
            "w-1.5 rounded-full transition-all",
            active ? "bg-primary" : "bg-muted animate-pulse",
          )}
          style={{ height: `${Math.min(28, Math.max(6, l * 28))}px` }}
        />
      ))}
    </div>
  );
}

/** Renders a transcript; words with low recogniser confidence are bold+underlined and clickable. */
function TranscriptView({ result, onSpeak }: { result: QResult; onSpeak: (t: string) => void }) {
  if (!result.transcript) {
    return <p className="text-sm italic text-muted-foreground">(chưa có bài nói)</p>;
  }
  if (result.words.length === 0) {
    return <p className="text-sm leading-relaxed">{result.transcript}</p>;
  }
  return (
    <p className="text-sm leading-relaxed">
      {result.words.map((w, i) => {
        const low = w.confidence < LOW_CONF;
        return (
          <span key={i}>
            {low ? (
              <button
                onClick={() => onSpeak(w.word)}
                title={`Phát âm chưa rõ — nhấn để nghe đúng (độ tin cậy ${(w.confidence * 100).toFixed(0)}%)`}
                className="font-bold underline decoration-2 decoration-rose-500 text-rose-600 hover:text-rose-700"
              >
                {w.word}
              </button>
            ) : (
              <span>{w.word}</span>
            )}{" "}
          </span>
        );
      })}
    </p>
  );
}

function labelOf(k: string) {
  switch (k) {
    case "fluencyCoherence":
      return "Fluency & Coherence";
    case "lexicalResource":
      return "Lexical Resource";
    case "grammaticalRange":
      return "Grammatical Range";
    case "pronunciation":
      return "Pronunciation";
    default:
      return k;
  }
}

/** Paraphrasing analysis — surfaces the level (verbatim/minimal/partial/strong)
 *  Groq's grader assigned, the actual paraphrases the candidate produced (or
 *  the verbatim moments they should fix), and the impact on Lexical Resource
 *  / Grammatical Range bands. */
function ParaphrasingCard({ data }: { data: NonNullable<SpeakingResult["paraphrasing"]> }) {
  const LEVEL_META: Record<
    Paraphrasing["level"],
    { label: string; tone: string; emoji: string }
  > = {
    verbatim: {
      label: "Đọc nguyên xi câu hỏi",
      tone: "bg-rose-100 text-rose-700 border-rose-300",
      emoji: "🚫",
    },
    minimal: {
      label: "Paraphrase rất ít",
      tone: "bg-amber-100 text-amber-700 border-amber-300",
      emoji: "⚠️",
    },
    partial: {
      label: "Paraphrase một phần",
      tone: "bg-primary/10 text-primary border-primary/30",
      emoji: "👍",
    },
    strong: {
      label: "Paraphrase tốt",
      tone: "bg-emerald-100 text-emerald-700 border-emerald-300",
      emoji: "⭐",
    },
  };
  const meta = LEVEL_META[data.level] ?? LEVEL_META.minimal;
  return (
    <Card className="border-2 border-honey/30 bg-honey-tint/40 dark:bg-honey-deep/15">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-extrabold flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-honey-deep" /> Paraphrasing câu hỏi
          </h3>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-extrabold uppercase tracking-wider",
              meta.tone,
            )}
          >
            <span>{meta.emoji}</span> {meta.label}
          </span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{data.impact}</p>
        {data.examples.length > 0 && (
          <div className="space-y-2">
            {data.examples.map((ex, i) => (
              <div key={i} className="rounded-lg border bg-card p-3 space-y-1.5">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Câu hỏi gốc
                </div>
                <p className="text-sm italic">{ex.question}</p>
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 mt-2">
                  Bạn đã nói
                </div>
                <p className="text-sm font-semibold">&ldquo;{ex.candidateSaid}&rdquo;</p>
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-honey-deep mt-2">
                  Nhận xét
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{ex.comment}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
