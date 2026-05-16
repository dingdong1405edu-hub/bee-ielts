"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mic, Square, Loader2, Volume2, ArrowRight, Trophy, Play, Clock,
  Sparkles, MessageSquareQuote, ArrowRightToLine, ArrowLeftToLine,
} from "lucide-react";
import { formatDuration, cn } from "@/lib/utils";
import { TipsCard } from "@/components/learn/tips-card";

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
interface SpeakingResult {
  overallBand: number;
  criteria: {
    fluencyCoherence: { band: number; feedback: string };
    lexicalResource: { band: number; feedback: string };
    grammaticalRange: { band: number; feedback: string };
    pronunciation: { band: number; feedback: string; note?: string };
  };
  observations: string[];
  openingPhrases?: string[];
  closingPhrases?: string[];
  usefulPhrases?: Phrase[];
  improvedSample?: string;
  summary: string;
}

type Phase = "intro" | "part1" | "part2-prep" | "part2-speak" | "part3" | "grading" | "done";

const PART2_PREP = 60;
// Words below this recogniser confidence are treated as mispronounced / unclear.
const LOW_CONF = 0.7;

const empty = (): QResult => ({ transcript: "", words: [] });

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
  const [prepLeft, setPrepLeft] = useState(PART2_PREP);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [ttsBusy, setTtsBusy] = useState(false);
  const [result, setResult] = useState<SpeakingResult | null>(null);

  const [ans, setAns] = useState<{ 1: QResult[]; 2: QResult; 3: QResult[] }>({
    1: part1Questions.map(empty),
    2: empty(),
    3: part3Questions.map(empty),
  });

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prepTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ---- Deepgram TTS: play any text ----
  const playTTS = async (text: string) => {
    try {
      setTtsBusy(true);
      const res = await fetch("/api/speaking/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch {
      toast.error("Không phát được âm thanh");
    } finally {
      setTtsBusy(false);
    }
  };

  // ---- Recording (MediaRecorder) + transcription via Deepgram ----
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        await transcribe(blob);
      };
      mr.start();
      recorderRef.current = mr;
      setRecording(true);
    } catch {
      toast.error("Không truy cập được micro. Hãy cấp quyền micro.");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    setRecording(false);
  };

  const transcribe = async (blob: Blob) => {
    setTranscribing(true);
    try {
      const res = await fetch("/api/speaking/transcribe", {
        method: "POST",
        headers: { "Content-Type": blob.type || "audio/webm" },
        body: blob,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi");
      const qr: QResult = { transcript: data.transcript || "", words: data.words || [] };
      if (!qr.transcript.trim()) {
        toast.error("Không nghe được gì — thử nói to và rõ hơn.");
      }
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nhận dạng giọng nói thất bại");
    } finally {
      setTranscribing(false);
    }
  };

  // ---- navigation ----
  const goPart2Prep = () => {
    setPhase("part2-prep");
    setPrepLeft(PART2_PREP);
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    prepTimerRef.current = setInterval(() => {
      setPrepLeft((t) => {
        if (t <= 1) {
          if (prepTimerRef.current) clearInterval(prepTimerRef.current);
          setPhase("part2-speak");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const nextQuestion = () => {
    stopRecording();
    if (phase === "part1") {
      if (qIdx + 1 < part1Questions.length) setQIdx((i) => i + 1);
      else {
        setQIdx(0);
        goPart2Prep();
      }
    } else if (phase === "part2-speak") {
      setQIdx(0);
      setPhase("part3");
    } else if (phase === "part3") {
      if (qIdx + 1 < part3Questions.length) setQIdx((i) => i + 1);
      else submitAndGrade();
    }
  };

  // ---- grading ----
  const submitAndGrade = async () => {
    stopRecording();
    setPhase("grading");
    const durationSec = Math.floor((Date.now() - startedAtRef.current) / 1000);

    const combined = `[Part 1]\n${part1Questions
      .map((q, i) => `Q${i + 1}: ${q}\nA: ${ans[1][i]?.transcript || "(no answer)"}`)
      .join("\n")}\n\n[Part 2]\nCue: ${part2CueCard.topic}\nA: ${ans[2].transcript || "(no answer)"}\n\n[Part 3]\n${part3Questions
      .map((q, i) => `Q${i + 1}: ${q}\nA: ${ans[3][i]?.transcript || "(no answer)"}`)
      .join("\n")}`;

    const allWords: DGWord[] = [
      ...ans[1].flatMap((r) => r.words),
      ...ans[2].words,
      ...ans[3].flatMap((r) => r.words),
    ];
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
          questions: ["Combined Part 1, 2, 3"],
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

  // ============================== INTRO ==============================
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
            <p>🔊 Đề bài được đọc to bằng <strong>Deepgram</strong> — nhấn nút loa để nghe.</p>
            <p>🎤 Cấp quyền <strong>micro</strong>: ghi âm câu trả lời, AI nhận dạng giọng nói.</p>
            <p>📝 Bài nói hiện dưới dạng văn bản — từ phát âm chưa rõ được <strong>in đậm gạch chân</strong>, nhấn để nghe phát âm đúng.</p>
            <p>📋 Part 1 ({part1Questions.length} câu) → Part 2 (1 phút chuẩn bị) → Part 3 ({part3Questions.length} câu)</p>
          </CardContent>
        </Card>
        <Button
          variant="brand"
          size="xl"
          className="w-full rounded-full"
          onClick={() => {
            startedAtRef.current = Date.now();
            setPhase("part1");
            setQIdx(0);
          }}
        >
          <Play className="h-5 w-5" /> Bắt đầu làm bài
        </Button>
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
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Transcript review with mispronounced words */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-extrabold flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-primary" /> Bài nói của bạn
            </h3>
            <p className="text-xs text-muted-foreground -mt-1">
              Từ <span className="font-bold underline">in đậm gạch chân</span> là phát âm chưa rõ — nhấn để nghe cách đọc đúng.
            </p>
            {[
              ...part1Questions.map((q, i) => ({ q: `Part 1 · Câu ${i + 1}`, r: ans[1][i] })),
              { q: `Part 2 · ${part2CueCard.topic}`, r: ans[2] },
              ...part3Questions.map((q, i) => ({ q: `Part 3 · Câu ${i + 1}`, r: ans[3][i] })),
            ].map((item, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="text-xs font-bold text-muted-foreground mb-1">{item.q}</div>
                <TranscriptView result={item.r} onSpeak={playTTS} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Per-task suggestions */}
        {((result.openingPhrases?.length ?? 0) > 0 ||
          (result.closingPhrases?.length ?? 0) > 0 ||
          (result.usefulPhrases?.length ?? 0) > 0) && (
          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="font-extrabold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" /> Gợi ý cho chủ đề này
              </h3>
              {result.openingPhrases && result.openingPhrases.length > 0 && (
                <PhraseBlock
                  icon={ArrowRightToLine}
                  label="Cách mở câu"
                  color="text-emerald-600"
                  items={result.openingPhrases}
                  onSpeak={playTTS}
                />
              )}
              {result.closingPhrases && result.closingPhrases.length > 0 && (
                <PhraseBlock
                  icon={ArrowLeftToLine}
                  label="Cách kết câu"
                  color="text-rose-600"
                  items={result.closingPhrases}
                  onSpeak={playTTS}
                />
              )}
              {result.usefulPhrases && result.usefulPhrases.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-violet-600 mb-1.5">
                    <MessageSquareQuote className="h-3.5 w-3.5" /> Cụm từ / idiom hay
                  </div>
                  <div className="space-y-1.5">
                    {result.usefulPhrases.map((p, i) => (
                      <div key={i} className="rounded-lg border bg-violet-50 dark:bg-violet-950/30 p-2.5">
                        <button
                          onClick={() => playTTS(p.phrase)}
                          className="text-sm font-bold text-violet-700 dark:text-violet-300 inline-flex items-center gap-1 hover:underline"
                        >
                          <Volume2 className="h-3.5 w-3.5" /> {p.phrase}
                        </button>
                        <div className="text-xs text-muted-foreground mt-0.5">{p.use}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {result.observations.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <h3 className="font-bold mb-2">Nhận xét chi tiết</h3>
              <ul className="space-y-1.5 text-sm">
                {result.observations.map((o, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{o}</span>
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

  // ============================== ACTIVE PHASES ==============================
  const isQ = phase === "part1" || phase === "part3";
  const questions = phase === "part1" ? part1Questions : part3Questions;
  const currentQ = isQ ? questions[qIdx] : "";
  const currentResult = phase === "part1" ? ans[1][qIdx] : phase === "part3" ? ans[3][qIdx] : ans[2];
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
        {phase === "part2-prep" && (
          <Badge variant="outline" className="bg-white/15 border-white/30 text-white text-base px-3 py-1">
            <Clock className="h-4 w-4 mr-1" /> {formatDuration(prepLeft)}
          </Badge>
        )}
      </div>

      {/* Part 2 prep */}
      {phase === "part2-prep" && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="text-center">
              <div className="text-5xl font-extrabold tabular-nums">{formatDuration(prepLeft)}</div>
              <div className="text-sm text-muted-foreground mt-1">Thời gian chuẩn bị</div>
            </div>
            <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/30">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-base">{part2CueCard.topic}</div>
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => playTTS(part2CueCard.topic)} disabled={ttsBusy}>
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-sm">You should say:</div>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {part2CueCard.points.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Button onClick={() => setPhase("part2-speak")} variant="outline" size="lg" className="w-full rounded-full">
              Bỏ qua chuẩn bị — nói luôn
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Question phases: part1, part2-speak, part3 */}
      {(isQ || phase === "part2-speak") && (
        <Card>
          <CardContent className="p-6 space-y-4">
            {isQ && (
              <div className="text-xs text-muted-foreground font-semibold tracking-wider uppercase">
                Câu {qIdx + 1} / {questions.length}
              </div>
            )}
            <div className="flex items-start gap-3">
              <button
                onClick={() => playTTS(phase === "part2-speak" ? part2CueCard.topic : currentQ)}
                disabled={ttsBusy}
                className={cn(
                  "grid h-12 w-12 place-items-center rounded-2xl bg-indigo-100 text-indigo-600 shrink-0 dark:bg-indigo-950",
                  ttsBusy && "animate-pulse",
                )}
                aria-label="Nghe đề"
              >
                {ttsBusy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Volume2 className="h-6 w-6" />}
              </button>
              <div className="flex-1">
                <p className="text-xl font-bold leading-tight">
                  {phase === "part2-speak" ? part2CueCard.topic : currentQ}
                </p>
                {phase === "part2-speak" && (
                  <ul className="list-disc pl-5 text-sm space-y-0.5 mt-2 text-muted-foreground">
                    {part2CueCard.points.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-muted-foreground mt-1">Nhấn loa để nghe đề</p>
              </div>
            </div>

            {/* record */}
            <div className="flex items-center gap-2">
              {!recording ? (
                <Button
                  onClick={startRecording}
                  disabled={transcribing}
                  variant="brand"
                  size="lg"
                  className="rounded-full flex-1"
                >
                  <Mic className="h-5 w-5" /> {currentResult.transcript ? "Ghi âm lại" : "Bắt đầu ghi âm"}
                </Button>
              ) : (
                <Button onClick={stopRecording} size="lg" className="rounded-full flex-1 bg-red-600 hover:bg-red-700 text-white">
                  <Square className="h-5 w-5 fill-white" /> Dừng ghi âm
                </Button>
              )}
            </div>
            {recording && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" /> Đang ghi âm — nói tiếng Anh...
              </div>
            )}
            {transcribing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Đang nhận dạng giọng nói...
              </div>
            )}

            {/* transcript preview */}
            {currentResult.transcript && !recording && !transcribing && (
              <div className="rounded-lg border bg-muted/40 p-3">
                <div className="text-xs font-bold text-muted-foreground mb-1">Bài nói của bạn</div>
                <TranscriptView result={currentResult} onSpeak={playTTS} />
              </div>
            )}

            <Button onClick={nextQuestion} variant="outline" size="lg" className="w-full rounded-full" disabled={recording || transcribing}>
              {phase === "part3" && qIdx + 1 >= part3Questions.length ? "Nộp bài & chấm" : "Câu tiếp theo"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}
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

function PhraseBlock({
  icon: Icon,
  label,
  color,
  items,
  onSpeak,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  items: string[];
  onSpeak: (t: string) => void;
}) {
  return (
    <div>
      <div className={cn("flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider mb-1.5", color)}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <ul className="space-y-1.5">
        {items.map((s, i) => (
          <li key={i} className="rounded-lg border p-2.5 text-sm flex items-start gap-2">
            <button onClick={() => onSpeak(s)} className="text-primary shrink-0 mt-0.5" aria-label="Nghe">
              <Volume2 className="h-4 w-4" />
            </button>
            <span className="italic">"{s}"</span>
          </li>
        ))}
      </ul>
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
      return "Pronunciation";
    default:
      return k;
  }
}
