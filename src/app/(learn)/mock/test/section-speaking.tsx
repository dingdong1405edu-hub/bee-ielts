"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { VoicePicker, useTtsVoice } from "@/components/learn/voice-picker";

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

interface Props {
  topic: string;
  imageUrl?: string | null;
  part1Questions: string[];
  part2CueCard: { topic: string; points: string[] };
  part3Questions: string[];
  onDone: (transcripts: { 1: string; 2: string; 3: string }) => void;
}

export function MockSpeaking({ topic, imageUrl, part1Questions, part2CueCard, part3Questions, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [questionIdx, setQuestionIdx] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcripts, setTranscripts] = useState<{ 1: string; 2: string; 3: string }>({ 1: "", 2: "", 3: "" });
  const recRef = useRef<unknown>(null);
  const [part2Remaining, setPart2Remaining] = useState(PART2_PREP_SEC);
  const part2TimerRef = useRef<NodeJS.Timeout | null>(null);
  const [voice, setVoice] = useTtsVoice();
  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopSpeak = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeaking(false);
  };

  // Read a prompt aloud with the chosen Deepgram voice. Resolves when audio ends.
  const speak = async (text: string) => {
    setSpeaking(true);
    try {
      const res = await fetch("/api/speaking/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: voiceRef.current }),
      });
      if (!res.ok) throw new Error("tts");
      const url = URL.createObjectURL(await res.blob());
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      await new Promise<void>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.play().catch(() => resolve());
      });
    } catch {
      /* ignore TTS errors — keep the exam flowing */
    } finally {
      setSpeaking(false);
    }
  };

  const startRecording = (part: 1 | 2 | 3) => {
    const W = window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown };
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) {
      alert("Trình duyệt không hỗ trợ recording. Dùng Chrome desktop nhé.");
      return;
    }
    const r = new (SR as new () => {
      lang: string;
      continuous: boolean;
      interimResults: boolean;
      onresult: (e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>; resultIndex: number }) => void;
      onerror: (e: unknown) => void;
      onend: () => void;
      start: () => void;
      stop: () => void;
    })();
    r.lang = "en-US";
    r.continuous = true;
    r.interimResults = true;
    let final = transcripts[part];
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t + " ";
        else interim += t;
      }
      setTranscripts((prev) => ({ ...prev, [part]: (final + interim).trim() }));
    };
    r.onerror = () => setRecording(false);
    r.onend = () => setRecording(false);
    r.start();
    recRef.current = r;
    setRecording(true);
  };

  const stopRecording = () => {
    if (recRef.current) {
      (recRef.current as { stop: () => void }).stop();
      recRef.current = null;
    }
    setRecording(false);
  };

  // Intro flow
  useEffect(() => {
    if (phase !== "intro") return;
    (async () => {
      await speak(INTRO_TEXT);
      await new Promise((r) => setTimeout(r, 500));
      setPhase("part1");
      setQuestionIdx(0);
    })();
    return () => stopSpeak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Auto-read part 1 questions when phase or idx changes
  useEffect(() => {
    if (phase !== "part1") return;
    const q = part1Questions[questionIdx];
    if (!q) return;
    (async () => {
      await speak(`Question ${questionIdx + 1}. ${q}`);
    })();
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
    startRecording(2);
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
    (async () => {
      await speak(`Question ${questionIdx + 1}. ${q}`);
    })();
    return () => stopSpeak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, questionIdx]);

  const nextPart1 = () => {
    stopRecording();
    if (questionIdx + 1 < part1Questions.length) {
      setQuestionIdx(questionIdx + 1);
    } else {
      stopSpeak();
      (async () => {
        await speak("Thank you. Now let's move to part 2. I will give you a topic, and you have one minute to prepare. Then you will speak for one to two minutes.");
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
      stopSpeak();
      (async () => {
        await speak("Thank you. That is the end of the speaking test.");
        setPhase("review");
      })();
    }
  };

  return (
    <div data-mock-pane className="max-w-2xl mx-auto space-y-4">
      <div className="rounded-2xl border bg-indigo-600 text-white p-4 flex items-center justify-between">
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
            <div className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-100 text-indigo-600 ${speaking ? "animate-pulse" : ""}`}>
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
              <div className={`grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-600 ${speaking ? "animate-pulse" : ""}`}>
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
            <RecordingIndicator recording={recording} />
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
            <Card className="bg-amber-50 border-amber-200">
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
                <div className={`h-2 w-2 rounded-full ${recording ? "bg-red-500 animate-pulse" : "bg-zinc-400"}`} />
                <span className="text-sm text-muted-foreground">{recording ? "Đang ghi âm" : "Mic tắt"}</span>
              </div>
            </div>
            <Card className="bg-amber-50 border-amber-200">
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
              <div className={`grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-600 ${speaking ? "animate-pulse" : ""}`}>
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
            <RecordingIndicator recording={recording} />
          </CardContent>
        </Card>
      )}

      {phase === "review" && (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-100 text-indigo-600">
              <Mic className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold">Đã xong phần Speaking 🎉</h3>
            <p className="text-sm text-muted-foreground">
              Bài nói của bạn đã được ghi lại. AI giám khảo sẽ chấm điểm — bạn không xem transcript của mình theo chuẩn IELTS thi thật.
            </p>
            <Button onClick={() => onDone(transcripts)} variant="brand" size="lg" className="w-full rounded-full">
              Nộp & chấm điểm →
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Recording indicator — replaces the transcript textarea in mock mode. */
function RecordingIndicator({ recording }: { recording: boolean }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-lg border bg-muted/30 p-3">
      <div className={`h-2.5 w-2.5 rounded-full ${recording ? "bg-red-500 animate-pulse" : "bg-zinc-400"}`} />
      <span className="text-sm text-muted-foreground">
        {recording ? "Đang ghi âm — cứ nói thoải mái, AI sẽ chấm sau." : "Mic chưa bật. Bấm 'Bắt đầu trả lời' để ghi."}
      </span>
    </div>
  );
}
