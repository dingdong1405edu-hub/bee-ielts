"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Volume2, Loader2 } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { VoicePicker, useTtsVoice } from "@/components/learn/voice-picker";
import { playExaminerLine, stopExaminerLine, primeAudioPlayback } from "@/lib/tts";
import { startWebSpeech, isWebSpeechSupported, type WebSpeechSession } from "@/lib/web-speech";

const INTRO_TEXT =
  "This is the speaking IELTS test for the International English Language Testing System.";

const PART2_PREP_SEC = 60;
const PART2_SPEAK_SEC = 120;

type Phase =
  | "intro"
  | "part1"
  | "part2-prep"
  | "part2-speak"
  | "part3"
  | "review";

// Per-part recording bundle bubbled back up to MockRunner so the result
// screen can replay each take and the AI grader gets pronunciation
// evidence (low-confidence words) instead of only text.
export interface MockSpeakingRecording {
  transcript: string;
  audioUrl: string;
  lowConfWords: string[];
}

export type MockSpeakingResult = {
  1: MockSpeakingRecording;
  2: MockSpeakingRecording;
  3: MockSpeakingRecording;
};

interface Props {
  topic: string;
  imageUrl?: string | null;
  part1Questions: string[];
  part2CueCard: { topic: string; points: string[] };
  part3Questions: string[];
  onDone: (recordings: MockSpeakingResult) => void;
}

const emptyRecording = (): MockSpeakingRecording => ({
  transcript: "",
  audioUrl: "",
  lowConfWords: [],
});

export function MockSpeaking({
  topic,
  imageUrl,
  part1Questions,
  part2CueCard,
  part3Questions,
  onDone,
}: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [questionIdx, setQuestionIdx] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [recordings, setRecordings] = useState<MockSpeakingResult>({
    1: emptyRecording(),
    2: emptyRecording(),
    3: emptyRecording(),
  });
  const recordingsRef = useRef(recordings);
  recordingsRef.current = recordings;

  // MediaRecorder + Web Speech state — Web Speech gives us live captions for
  // free; MediaRecorder gives us the blob we replay on the result screen and
  // the bytes we send to /api/speaking/transcribe for word-confidence
  // analysis (used by the IELTS grader's pronunciation rubric).
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const webSpeechRef = useRef<WebSpeechSession | null>(null);
  const activePartRef = useRef<1 | 2 | 3 | null>(null);

  const [part2Remaining, setPart2Remaining] = useState(PART2_PREP_SEC);
  const part2TimerRef = useRef<NodeJS.Timeout | null>(null);
  const [voice, setVoice] = useTtsVoice();
  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // AbortController tracks the currently-speaking examiner line — flipping
  // phase, advancing question, or unmounting all abort the previous fetch so
  // the next prompt starts INSTANTLY instead of stacking on top of a still-
  // pending Deepgram round-trip. Solves the user's "delay" + "AI vẫn còn
  // đọc sau khi kết thúc" complaints in one place.
  const speakAbortRef = useRef<AbortController | null>(null);

  const stopSpeak = () => {
    speakAbortRef.current?.abort();
    speakAbortRef.current = null;
    stopExaminerLine(audioRef);
    setSpeaking(false);
  };

  const speak = async (text: string): Promise<void> => {
    // Always cancel the previous line first so phase/question changes don't
    // pile up — the user wants the new voice to start IMMEDIATELY after they
    // hit a button, not after the in-flight one finishes.
    speakAbortRef.current?.abort();
    stopExaminerLine(audioRef);
    const ac = new AbortController();
    speakAbortRef.current = ac;
    setSpeaking(true);
    try {
      primeAudioPlayback();
      await playExaminerLine(text, voiceRef.current, audioRef, ac.signal);
    } finally {
      if (speakAbortRef.current === ac) speakAbortRef.current = null;
      setSpeaking(false);
    }
  };

  const stopRecording = () => {
    setRecording(false);
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    } catch {
      /* ignore */
    }
    webSpeechRef.current?.stop();
    webSpeechRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startRecording = async (part: 1 | 2 | 3) => {
    // Cut any examiner voice so it doesn't bleed into the mic.
    stopSpeak();
    activePartRef.current = part;
    setLiveTranscript("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const blobType = mr.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: blobType });
        const audioUrl = blob.size > 0 ? URL.createObjectURL(blob) : "";
        const browserTranscript = webSpeechRef.current?.getTranscript() ?? "";

        // Strategy: if MediaRecorder bytes are usable, hit Deepgram so we get
        // word-confidence (powers IELTS Pronunciation grading). Web Speech is
        // the fallback when Deepgram fails or the blob is too small.
        let transcript = browserTranscript.trim();
        let lowConfWords: string[] = [];
        if (blob.size >= 1200) {
          setTranscribing(true);
          try {
            const res = await fetch("/api/speaking/transcribe", {
              method: "POST",
              headers: { "Content-Type": blob.type || "audio/webm" },
              body: blob,
            });
            const data = await res.json();
            if (res.ok) {
              const text = (data.transcript ?? "").trim();
              const words = (data.words ?? []) as { word: string; confidence: number }[];
              lowConfWords = Array.from(
                new Set(words.filter((w) => w.confidence < 0.7).map((w) => w.word)),
              );
              if (text.length > 0) transcript = text;
            }
          } catch (e) {
            console.warn("[mock/speaking transcribe]", e);
          } finally {
            setTranscribing(false);
          }
        }

        // Persist the take — even when transcript is empty we still keep the
        // audioUrl so the user can listen back and the grader sees there was
        // an attempt at all.
        setRecordings((prev) => ({
          ...prev,
          [part]: { transcript, audioUrl, lowConfWords },
        }));
      };

      // Live captions — purely UI candy; the final transcript comes from
      // Deepgram (or Web Speech fallback in onstop).
      if (isWebSpeechSupported()) {
        webSpeechRef.current = startWebSpeech({
          lang: "en-US",
          onInterim: (t) => setLiveTranscript(t),
          onError: (err) => console.warn("[mock/speaking web-speech]", err),
        });
      }

      mr.start();
      recorderRef.current = mr;
      setRecording(true);
    } catch (e) {
      console.error("[mock/speaking getUserMedia]", e);
      alert(
        "Không truy cập được micro. Hãy cấp quyền micro cho trình duyệt rồi thử lại.",
      );
    }
  };

  // ============================ AUTO-READ FLOWS ============================
  // Intro: hand off to part1 the instant the welcome line ends — no padding.
  useEffect(() => {
    if (phase !== "intro") return;
    let cancelled = false;
    (async () => {
      await speak(INTRO_TEXT);
      if (cancelled) return;
      setPhase("part1");
      setQuestionIdx(0);
    })();
    return () => {
      cancelled = true;
      stopSpeak();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Auto-read part 1 questions when phase or idx changes
  useEffect(() => {
    if (phase !== "part1") return;
    const q = part1Questions[questionIdx];
    if (!q) return;
    void speak(`Question ${questionIdx + 1}. ${q}`);
    return () => stopSpeak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, questionIdx]);

  // Part 2 prep timer
  useEffect(() => {
    if (phase !== "part2-prep") return;
    setPart2Remaining(PART2_PREP_SEC);
    if (part2TimerRef.current) clearInterval(part2TimerRef.current);
    part2TimerRef.current = setInterval(() => {
      setPart2Remaining((r) => {
        if (r <= 1) {
          if (part2TimerRef.current) clearInterval(part2TimerRef.current);
          setPhase("part2-speak");
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (part2TimerRef.current) clearInterval(part2TimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Part 2 speak timer
  useEffect(() => {
    if (phase !== "part2-speak") return;
    setPart2Remaining(PART2_SPEAK_SEC);
    if (part2TimerRef.current) clearInterval(part2TimerRef.current);
    void startRecording(2);
    part2TimerRef.current = setInterval(() => {
      setPart2Remaining((r) => {
        if (r <= 1) {
          if (part2TimerRef.current) clearInterval(part2TimerRef.current);
          stopRecording();
          setPhase("part3");
          setQuestionIdx(0);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (part2TimerRef.current) clearInterval(part2TimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Auto-read part 3 questions
  useEffect(() => {
    if (phase !== "part3") return;
    const q = part3Questions[questionIdx];
    if (!q) return;
    void speak(`Question ${questionIdx + 1}. ${q}`);
    return () => stopSpeak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, questionIdx]);

  // Belt-and-braces unmount cleanup — solves "AI vẫn còn đọc sau khi kết
  // thúc bài thi": any in-flight Deepgram fetch, SpeechSynthesis utterance,
  // MediaRecorder, or open mic dies with this component.
  useEffect(() => {
    return () => {
      speakAbortRef.current?.abort();
      stopExaminerLine(audioRef);
      stopRecording();
      // Don't revoke blob URLs here — MockResultView mounts AFTER and needs
      // them. The runner-level "exit" path revokes them.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nextPart1 = () => {
    stopRecording();
    if (questionIdx + 1 < part1Questions.length) {
      setQuestionIdx(questionIdx + 1);
    } else {
      (async () => {
        await speak(
          "Thank you. Now let's move to part 2. I will give you a topic, and you have one minute to prepare. Then you will speak for one to two minutes.",
        );
        await speak(`The topic is: ${part2CueCard.topic}`);
        setPhase("part2-prep");
      })();
    }
  };

  const nextPart3 = () => {
    stopRecording();
    if (questionIdx + 1 < part3Questions.length) {
      setQuestionIdx(questionIdx + 1);
    } else {
      // Don't wait for the closing line to finish — phase changes to review
      // straight away, and the speak() is aborted by the cleanup so it
      // doesn't drone on under the review screen. Was the root cause of
      // "AI vẫn còn đọc sau khi kết thúc bài thi" before this rewrite.
      void speak("Thank you. That is the end of the speaking test.");
      setPhase("review");
    }
  };

  return (
    <div data-mock-pane className="max-w-2xl mx-auto space-y-4">
      <div className="rounded-2xl border bg-primary text-primary-foreground p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mic className="h-6 w-6" />
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">Section 4/4 · {topic}</div>
            <div className="font-extrabold">Speaking</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <VoicePicker voice={voice} onChange={setVoice} />
          <Badge variant="outline" className="bg-white/15 border-white/30 text-white text-base px-3 py-1">
            {phase === "part1" ? "Part 1" : phase === "part2-prep" ? "Part 2 (prep)" : phase === "part2-speak" ? "Part 2" : phase === "part3" ? "Part 3" : phase === "intro" ? "Intro" : "Review"}
          </Badge>
        </div>
      </div>

      {phase === "intro" && (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <div className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-honey-tint text-honey-deep ${speaking ? "animate-pulse" : ""}`}>
              <Volume2 className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold">Examiner đang nói...</h3>
            <p className="text-sm text-muted-foreground italic">"{INTRO_TEXT}"</p>
          </CardContent>
        </Card>
      )}

      {phase === "part1" && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Part 1 — Câu {questionIdx + 1}/{part1Questions.length}
            </div>
            <div className="flex items-start gap-3">
              <div className={`grid h-10 w-10 place-items-center rounded-xl bg-honey-tint text-honey-deep ${speaking ? "animate-pulse" : ""}`}>
                <Volume2 className="h-5 w-5" />
              </div>
              <p className="text-lg font-bold flex-1">{part1Questions[questionIdx]}</p>
            </div>
            <div className="flex gap-2">
              {!recording ? (
                <Button onClick={() => startRecording(1)} className="flex-1" variant="brand">
                  <Mic className="h-4 w-4" /> Bắt đầu trả lời
                </Button>
              ) : (
                <Button onClick={stopRecording} className="flex-1" variant="destructive">
                  <MicOff className="h-4 w-4" /> Dừng
                </Button>
              )}
              <Button onClick={nextPart1} variant="outline">
                {questionIdx + 1 < part1Questions.length ? "Câu tiếp →" : "Sang Part 2 →"}
              </Button>
            </div>
            <RecordingIndicator
              recording={recording}
              transcribing={transcribing}
              liveTranscript={liveTranscript}
            />
          </CardContent>
        </Card>
      )}

      {phase === "part2-prep" && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Part 2 — Chuẩn bị
            </div>
            <div className="text-center">
              <div className="text-5xl font-extrabold tabular-nums">{formatDuration(part2Remaining)}</div>
              <div className="text-sm text-muted-foreground mt-1">Còn lại để chuẩn bị</div>
            </div>
            <Card className="bg-gold-50 border-gold-200">
              <CardContent className="p-4 space-y-2">
                <div className="font-bold">{part2CueCard.topic}</div>
                {imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="" className="w-full max-h-56 rounded-lg border bg-background object-contain" />
                )}
                <div className="text-sm">You should say:</div>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {part2CueCard.points.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </CardContent>
            </Card>
            <Button onClick={() => setPhase("part2-speak")} variant="outline" className="w-full">
              Bỏ qua prep, nói luôn →
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === "part2-speak" && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Part 2 — Đang nói (1-2 phút)
            </div>
            <div className="text-center">
              <div className="text-5xl font-extrabold tabular-nums">{formatDuration(part2Remaining)}</div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <div className={`h-2 w-2 rounded-full ${recording ? "bg-red-500 animate-pulse" : "bg-muted-foreground"}`} />
                <span className="text-sm text-muted-foreground">{recording ? "Đang ghi âm" : "Mic tắt"}</span>
              </div>
            </div>
            <Card className="bg-gold-50 border-gold-200">
              <CardContent className="p-4 space-y-2">
                <div className="font-bold">{part2CueCard.topic}</div>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {part2CueCard.points.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </CardContent>
            </Card>
            <Button
              onClick={() => {
                if (part2TimerRef.current) clearInterval(part2TimerRef.current);
                stopRecording();
                setPhase("part3");
                setQuestionIdx(0);
              }}
              variant="outline"
              className="w-full"
            >
              Kết thúc Part 2 →
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === "part3" && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Part 3 — Câu {questionIdx + 1}/{part3Questions.length}
            </div>
            <div className="flex items-start gap-3">
              <div className={`grid h-10 w-10 place-items-center rounded-xl bg-honey-tint text-honey-deep ${speaking ? "animate-pulse" : ""}`}>
                <Volume2 className="h-5 w-5" />
              </div>
              <p className="text-lg font-bold flex-1">{part3Questions[questionIdx]}</p>
            </div>
            <div className="flex gap-2">
              {!recording ? (
                <Button onClick={() => startRecording(3)} className="flex-1" variant="brand">
                  <Mic className="h-4 w-4" /> Trả lời
                </Button>
              ) : (
                <Button onClick={stopRecording} className="flex-1" variant="destructive">
                  <MicOff className="h-4 w-4" /> Dừng
                </Button>
              )}
              <Button onClick={nextPart3} variant="outline">
                {questionIdx + 1 < part3Questions.length ? "Câu tiếp →" : "Hoàn thành →"}
              </Button>
            </div>
            <RecordingIndicator
              recording={recording}
              transcribing={transcribing}
              liveTranscript={liveTranscript}
            />
          </CardContent>
        </Card>
      )}

      {phase === "review" && (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-honey-tint text-honey-deep">
              <Mic className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold">Đã xong phần Speaking</h3>
            <p className="text-sm text-muted-foreground">
              AI sẽ chấm 4 tiêu chí IELTS (Fluency, Lexical, Grammar, Pronunciation) và bạn
              được nghe lại audio + đọc nhận xét từng phần ở màn kết quả.
            </p>
            <Button
              onClick={() => onDone(recordingsRef.current)}
              variant="brand"
              size="lg"
              className="w-full rounded-full"
            >
              Nộp & chấm điểm →
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Recording indicator with optional live transcript captions. */
function RecordingIndicator({
  recording,
  transcribing,
  liveTranscript,
}: {
  recording: boolean;
  transcribing: boolean;
  liveTranscript: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-2 rounded-lg border bg-muted/30 p-3">
        {transcribing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Đang chuyển giọng nói thành văn bản...</span>
          </>
        ) : (
          <>
            <div className={`h-2.5 w-2.5 rounded-full ${recording ? "bg-red-500 animate-pulse" : "bg-muted-foreground"}`} />
            <span className="text-sm text-muted-foreground">
              {recording ? "Đang ghi âm — cứ nói thoải mái, AI sẽ chấm sau." : "Mic chưa bật. Bấm 'Bắt đầu trả lời' để ghi."}
            </span>
          </>
        )}
      </div>
      {recording && liveTranscript && (
        <div className="rounded-lg border-2 border-primary/30 bg-primary/10 dark:bg-primary/10 dark:border-primary/30 p-3 text-sm italic text-primary dark:text-primary">
          {liveTranscript}
        </div>
      )}
    </div>
  );
}
