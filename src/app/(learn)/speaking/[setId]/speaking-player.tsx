"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Loader2, Volume2, ArrowRight, Trophy, Clock, Play } from "lucide-react";
import { formatDuration, cn } from "@/lib/utils";
import { speakWithPauses, stopSpeaking, isTTSSupported } from "@/lib/tts";
import { TipsCard } from "@/components/learn/tips-card";
import { ReviewReport, type SpeakingReviewData } from "@/components/learn/review-report";

type SpeakingResult = {
  overallBand: number;
  criteria: {
    fluencyCoherence: { band: number; feedback: string };
    lexicalResource: { band: number; feedback: string };
    grammaticalRange: { band: number; feedback: string };
    pronunciation: { band: number; feedback: string; note: string };
  };
  observations: string[];
  improvedSample: string;
  summary: string;
};

type Phase = "intro" | "part1" | "part2-prep" | "part2-speak" | "part3" | "grading" | "done";

// Per-question time budget (sec)
// Part 1: no timer — user paces themselves (set to 0 to disable countdown)
const PART1_PER_Q = 0;
const PART2_PREP = 75; // 1 phút 15 giây chuẩn bị
const PART2_SPEAK = 60; // 1 phút nói
const PART3_PER_Q = 75;

export function SpeakingPlayer({
  setId,
  topic,
  part1Questions,
  part2CueCard,
  part3Questions,
}: {
  setId: string;
  topic: string;
  part1Questions: string[];
  part2CueCard: { topic: string; points: string[] };
  part3Questions: string[];
}) {
  const router = useRouter();
  const startedAtRef = useRef<number>(Date.now());

  const [phase, setPhase] = useState<Phase>("intro");
  const [qIdx, setQIdx] = useState(0);
  const [remaining, setRemaining] = useState(PART1_PER_Q);
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcripts, setTranscripts] = useState<{ 1: string[]; 2: string; 3: string[] }>({
    1: part1Questions.map(() => ""),
    2: "",
    3: part3Questions.map(() => ""),
  });
  const [result, setResult] = useState<SpeakingResult | null>(null);
  const [resultPart, setResultPart] = useState<1 | 2 | 3>(1);

  const recRef = useRef<unknown>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- recording helpers ---
  const startRecording = (part: 1 | 2 | 3) => {
    const W = window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown };
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) {
      toast.error("Browser không hỗ trợ. Dùng Chrome desktop nhé.");
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
    const currentText =
      part === 1 ? transcripts[1][qIdx] : part === 3 ? transcripts[3][qIdx] : transcripts[2];
    let final = currentText;
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t + " ";
        else interim += t;
      }
      const combined = (final + interim).trim();
      setTranscripts((prev) => {
        if (part === 1) {
          const arr = [...prev[1]];
          arr[qIdx] = combined;
          return { ...prev, 1: arr };
        }
        if (part === 3) {
          const arr = [...prev[3]];
          arr[qIdx] = combined;
          return { ...prev, 3: arr };
        }
        return { ...prev, 2: combined };
      });
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

  // --- TTS examiner ---
  const speak = async (text: string) => {
    if (!isTTSSupported()) return;
    setSpeaking(true);
    try {
      await speakWithPauses(text, { rate: 0.92 });
    } catch (e) {
      console.error(e);
    } finally {
      setSpeaking(false);
    }
  };

  // --- timer for current step (Part 1 has no auto-advance timer) ---
  useEffect(() => {
    if (phase === "intro" || phase === "done" || phase === "grading" || phase === "part1") return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleAutoAdvance();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qIdx]);

  // --- read out the current question via TTS ---
  useEffect(() => {
    if (phase === "part1") {
      stopSpeaking();
      const q = part1Questions[qIdx];
      if (q) speak(`Question ${qIdx + 1}. ${q}`);
    } else if (phase === "part3") {
      stopSpeaking();
      const q = part3Questions[qIdx];
      if (q) speak(`Question ${qIdx + 1}. ${q}`);
    } else if (phase === "part2-prep") {
      stopSpeaking();
      speak(`Here is your topic: ${part2CueCard.topic}. You have one minute to prepare.`);
    } else if (phase === "part2-speak") {
      stopSpeaking();
      speak("You may begin speaking now.");
    }
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qIdx]);

  // --- advance logic ---
  const handleAutoAdvance = () => {
    stopRecording();
    if (phase === "part1") {
      if (qIdx + 1 < part1Questions.length) {
        setQIdx((i) => i + 1);
      } else {
        setPhase("part2-prep");
        setQIdx(0);
        setRemaining(PART2_PREP);
      }
    } else if (phase === "part2-prep") {
      setPhase("part2-speak");
      setRemaining(PART2_SPEAK);
      startRecording(2);
    } else if (phase === "part2-speak") {
      setPhase("part3");
      setQIdx(0);
      setRemaining(PART3_PER_Q);
    } else if (phase === "part3") {
      if (qIdx + 1 < part3Questions.length) {
        setQIdx((i) => i + 1);
        setRemaining(PART3_PER_Q);
      } else {
        submitAndGrade();
      }
    }
  };

  const submitAndGrade = async () => {
    stopRecording();
    setPhase("grading");
    const durationSec = Math.floor((Date.now() - startedAtRef.current) / 1000);

    // Combine all parts into one transcript for grading
    const combined = `[Part 1]\n${transcripts[1].map((t, i) => `Q${i + 1}: ${part1Questions[i]}\nA: ${t}`).join("\n")}\n\n[Part 2]\nCue: ${part2CueCard.topic}\nA: ${transcripts[2]}\n\n[Part 3]\n${transcripts[3].map((t, i) => `Q${i + 1}: ${part3Questions[i]}\nA: ${t}`).join("\n")}`;

    try {
      const res = await fetch("/api/grade/speaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setId,
          part: 1,
          topic,
          questions: ["Combined Part 1, 2, 3"],
          transcript: combined,
          durationSec,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.result);
      setResultPart(1);
      setPhase("done");
    } catch (e) {
      console.error(e);
      toast.error("Chấm bài thất bại");
      setPhase("done");
    }
  };

  // --- intro ---
  if (phase === "intro") {
    return (
      <div className="max-w-xl mx-auto py-6 space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-lg shadow-indigo-500/30">
            <Mic className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Luyện tập <span className="gradient-brand-text">Speaking</span>
          </h1>
          <p className="text-muted-foreground">Topic: {topic}</p>
        </div>

        <Card>
          <CardContent className="p-6 text-sm space-y-2">
            <p>🎤 Cho phép truy cập <strong>micro</strong> để ghi âm</p>
            <p>🔊 Cho phép <strong>loa</strong> — AI examiner sẽ đọc câu hỏi</p>
            <p>⏱ <strong>Auto-advance</strong>: hết giờ sẽ chuyển câu tiếp theo. Không quay lại được.</p>
            <p>📋 Part 1 ({part1Questions.length} câu, ~45s/câu) → Part 2 (1 phút prep + 2 phút nói) → Part 3 ({part3Questions.length} câu, ~75s/câu)</p>
          </CardContent>
        </Card>

        <Button
          variant="brand"
          size="xl"
          className="w-full rounded-full"
          onClick={async () => {
            // pre-warm voices on user gesture (Chrome requires it)
            if (isTTSSupported()) window.speechSynthesis.getVoices();
            startedAtRef.current = Date.now();
            await speak("Welcome to the speaking practice. Let's begin with part one.");
            setPhase("part1");
            setQIdx(0);
            // start recording right away so user can answer immediately
            setTimeout(() => startRecording(1), 500);
          }}
        >
          <Play className="h-5 w-5" /> Bắt đầu làm bài
        </Button>
      </div>
    );
  }

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
            <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">{result.summary}</p>
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
                <p className="text-xs text-muted-foreground">{v.feedback}</p>
                {"note" in v && <p className="mt-1 text-xs italic text-muted-foreground">{v.note}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        {result.improvedSample && (
          <Card>
            <CardContent className="p-5">
              <h3 className="font-bold mb-2">Sample tham khảo</h3>
              <div className="whitespace-pre-wrap text-sm text-muted-foreground">{result.improvedSample}</div>
            </CardContent>
          </Card>
        )}

        <TipsCard skill="SPEAKING" score={result.overallBand} context={`Speaking practice, topic: ${topic}`} />

        <ReviewReport
          data={{
            kind: "SPEAKING",
            topic,
            transcripts: transcripts as SpeakingReviewData["transcripts"],
            part1Questions,
            part2CueCard,
            part3Questions,
            result,
          } satisfies SpeakingReviewData}
        />

        <Button onClick={() => router.push("/speaking")} variant="brand" size="xl" className="w-full rounded-full">
          Làm bài khác
        </Button>
      </div>
    );
  }

  // --- active phases (part1, part2-prep, part2-speak, part3) ---
  const phaseLabel =
    phase === "part1" ? "Part 1" : phase === "part2-prep" ? "Part 2 — Chuẩn bị" : phase === "part2-speak" ? "Part 2 — Nói" : "Part 3";

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="rounded-2xl border bg-indigo-600 text-white p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Mic className="h-6 w-6" />
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">Speaking · {topic}</div>
            <div className="font-extrabold">{phaseLabel}</div>
          </div>
        </div>
        {phase === "part1" ? (
          <Badge variant="outline" className="bg-white/15 border-white/30 text-white text-base px-3 py-1">
            Tự do — không tính giờ
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-white/15 border-white/30 text-white text-base px-3 py-1">
            <Clock className="h-4 w-4 mr-1" /> {formatDuration(remaining)}
          </Badge>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${phase}-${qIdx}`}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
        >
          {(phase === "part1" || phase === "part3") && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="text-xs text-muted-foreground font-semibold tracking-wider uppercase">
                  Câu {qIdx + 1} / {phase === "part1" ? part1Questions.length : part3Questions.length}
                </div>
                <div className="flex items-start gap-3">
                  <div className={cn("grid h-12 w-12 place-items-center rounded-2xl bg-indigo-100 text-indigo-600 shrink-0", speaking && "animate-pulse")}>
                    <Volume2 className="h-6 w-6" />
                  </div>
                  <p className="text-xl font-bold flex-1 leading-tight">
                    {phase === "part1" ? part1Questions[qIdx] : part3Questions[qIdx]}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className={cn("h-2.5 w-2.5 rounded-full", recording ? "bg-red-500 animate-pulse" : "bg-zinc-300")} />
                  <span className="text-sm text-muted-foreground">
                    {recording ? "Đang ghi âm — nói tiếng Anh vào micro" : "Mic tắt"}
                  </span>
                  {!recording && (
                    <Button size="sm" variant="outline" onClick={() => startRecording(phase === "part1" ? 1 : 3)} className="ml-auto">
                      <Mic className="h-4 w-4" /> Bật mic
                    </Button>
                  )}
                  {recording && (
                    <Button size="sm" variant="ghost" onClick={stopRecording} className="ml-auto">
                      <MicOff className="h-4 w-4" /> Tạm dừng
                    </Button>
                  )}
                </div>

                <Textarea
                  value={(phase === "part1" ? transcripts[1] : transcripts[3])[qIdx] || ""}
                  onChange={(e) => {
                    setTranscripts((prev) => {
                      const part = phase === "part1" ? 1 : 3;
                      const arr = [...prev[part]];
                      arr[qIdx] = e.target.value;
                      return { ...prev, [part]: arr };
                    });
                  }}
                  placeholder="Transcript sẽ hiện khi bạn nói..."
                  className="min-h-[140px]"
                />

                <Button onClick={handleAutoAdvance} variant="brand" size="lg" className="w-full rounded-full">
                  Xong câu này — sang câu tiếp <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {phase === "part2-prep" && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <div className="text-5xl font-extrabold tabular-nums">{formatDuration(remaining)}</div>
                  <div className="text-sm text-muted-foreground mt-1">Thời gian chuẩn bị (1 phút)</div>
                </div>
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-4 space-y-2">
                    <div className="font-bold text-base">{part2CueCard.topic}</div>
                    <div className="text-sm">You should say:</div>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      {part2CueCard.points.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Button onClick={handleAutoAdvance} variant="outline" size="lg" className="w-full rounded-full">
                  Bỏ qua prep — nói luôn
                </Button>
              </CardContent>
            </Card>
          )}

          {phase === "part2-speak" && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <div className="text-5xl font-extrabold tabular-nums">{formatDuration(remaining)}</div>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <div className={cn("h-2.5 w-2.5 rounded-full", recording ? "bg-red-500 animate-pulse" : "bg-zinc-300")} />
                    <span className="text-sm text-muted-foreground">{recording ? "Đang ghi âm" : "Mic tắt"}</span>
                  </div>
                </div>
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-4 space-y-2">
                    <div className="font-bold text-base">{part2CueCard.topic}</div>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      {part2CueCard.points.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Textarea
                  value={transcripts[2]}
                  onChange={(e) => setTranscripts((p) => ({ ...p, 2: e.target.value }))}
                  placeholder="Transcript..."
                  className="min-h-[140px]"
                />
                <Button onClick={handleAutoAdvance} variant="brand" size="lg" className="w-full rounded-full">
                  Xong Part 2 — sang Part 3 <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
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
      return "Pronunciation*";
    default:
      return k;
  }
}
