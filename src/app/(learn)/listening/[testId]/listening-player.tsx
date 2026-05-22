"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, Play, Pause, Gauge } from "lucide-react";
import { formatDuration, cn } from "@/lib/utils";
import { speakText, stopSpeaking, isTTSSupported } from "@/lib/tts";
import { TipsCard } from "@/components/learn/tips-card";
import { ReviewReport, type ListeningReviewData } from "@/components/learn/review-report";
import { FormBlanks, TableBlanks, groupQuestions } from "@/components/learn/form-blanks";

type Q = {
  id: string;
  type: "MCQ" | "FILL_BLANK" | "TRUE_FALSE" | "TRUE_FALSE_NOT_GIVEN" | "MATCHING" | "MATCHING_HEADINGS" | "MATCHING_INFO" | "MATCHING_FEATURES" | "MATCHING_SENTENCE_ENDINGS" | "SHORT_ANSWER";
  prompt: string;
  options: string[] | null;
  correctAnswer: string;
  formGroup?: string | null;
};

export function ListeningPlayer({
  testId,
  title,
  audioUrl,
  imageUrl,
  transcript,
  questions,
}: {
  testId: string;
  title: string;
  audioUrl: string;
  imageUrl?: string | null;
  transcript: string | null;
  questions: Q[];
}) {
  const router = useRouter();
  const startedAtRef = useRef<number>(Date.now());
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [elapsed, setElapsed] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  // Practise — đếm xuôi thời gian đã làm, không giới hạn thời gian.
  useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [submitted]);

  const submit = async () => {
    setSubmitted(true);
    const correctCount = questions.filter(
      (q) => (answers[q.id] || "").trim().toLowerCase() === q.correctAnswer.toLowerCase(),
    ).length;
    const band = (correctCount / questions.length) * 9;
    try {
      const durationSec = Math.floor((Date.now() - startedAtRef.current) / 1000);
      await fetch("/api/listening/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId, answers, correctCount, total: questions.length, durationSec }),
      });
      toast.success(`Đúng ${correctCount}/${questions.length} — Band ~${band.toFixed(1)}`);
    } catch {
      toast.error("Lưu kết quả thất bại");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <button onClick={() => router.push("/listening")} className="text-sm text-muted-foreground hover:underline">
            ← Listening
          </button>
          <h1 className="text-xl md:text-2xl font-bold mt-1">{title}</h1>
        </div>
        <Badge variant="outline" className="text-base px-3 py-1">
          <Clock className="h-4 w-4 mr-1" /> Đã làm {formatDuration(elapsed)}
        </Badge>
      </div>

      <AudioPlayer audioUrl={audioUrl} transcript={transcript} />

      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="w-full max-h-80 rounded-2xl border bg-muted/30 object-contain" />
      )}


      <div className="space-y-3">
        {groupQuestions(questions).map((unit) => {
          if (unit.kind === "form") {
            const end = unit.startNum + unit.items.length - 1;
            const Block = unit.layout === "table" ? TableBlanks : FormBlanks;
            return (
              <Card key={`form-${unit.items[0].id}`}>
                <CardContent className="p-5 space-y-2">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-primary">
                    Câu {unit.startNum}–{end} · {unit.layout === "table" ? "Hoàn thành bảng" : "Điền vào chỗ trống"}
                  </div>
                  <Block
                    items={unit.items}
                    startNum={unit.startNum}
                    answers={answers}
                    onChange={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))}
                    disabled={submitted}
                    submitted={submitted}
                  />
                </CardContent>
              </Card>
            );
          }
          const q = unit.q;
          const userAns = answers[q.id] || "";
          const isCorrect = userAns.trim().toLowerCase() === q.correctAnswer.toLowerCase();
          return (
            <Card key={q.id} className={cn(submitted && (isCorrect ? "border-success" : "border-destructive"))}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-primary">{unit.num}.</span>
                  <p className="font-medium flex-1">{q.prompt}</p>
                  {submitted && (isCorrect ? <CheckCircle2 className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-destructive" />)}
                </div>
                {q.options ? (
                  <div className="space-y-2">
                    {q.options.map((opt) => (
                      <label
                        key={opt}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer",
                          userAns === opt && "border-primary bg-accent",
                          submitted && opt === q.correctAnswer && "border-success bg-success/10",
                        )}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={opt}
                          disabled={submitted}
                          checked={userAns === opt}
                          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <Input
                    placeholder="Câu trả lời..."
                    value={userAns}
                    disabled={submitted}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  />
                )}
                {submitted && !isCorrect && (
                  <div className="text-sm text-muted-foreground">
                    Đáp án: <strong className="text-success">{q.correctAnswer}</strong>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-3 justify-end">
        {!submitted ? (
          <Button size="lg" onClick={submit}>Nộp bài</Button>
        ) : (
          <>
            {transcript && (
              <Button variant="outline" onClick={() => setShowTranscript((s) => !s)}>
                {showTranscript ? "Ẩn" : "Xem"} transcript
              </Button>
            )}
            <Button onClick={() => router.push("/listening")}>Về danh sách</Button>
          </>
        )}
      </div>

      {submitted && showTranscript && transcript && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold mb-2">Transcript</h3>
            <div className="whitespace-pre-wrap text-sm text-muted-foreground">{transcript}</div>
          </CardContent>
        </Card>
      )}

      {submitted && (
        <>
          <TipsCard
            skill="LISTENING"
            score={(questions.filter((q) => (answers[q.id] || "").trim().toLowerCase() === q.correctAnswer.toLowerCase()).length / questions.length) * 9}
            context={`User got ${questions.filter((q) => (answers[q.id] || "").trim().toLowerCase() === q.correctAnswer.toLowerCase()).length}/${questions.length} questions correct on a listening test.`}
          />
          <ReviewReport
            data={{
              kind: "LISTENING",
              title,
              transcript: transcript ?? null,
              questions: questions.map((q) => ({
                prompt: q.prompt,
                type: q.type,
                userAnswer: answers[q.id] || "",
                correctAnswer: q.correctAnswer,
              })),
              totalCorrect: questions.filter((q) => (answers[q.id] || "").trim().toLowerCase() === q.correctAnswer.toLowerCase()).length,
              totalQuestions: questions.length,
              band: (questions.filter((q) => (answers[q.id] || "").trim().toLowerCase() === q.correctAnswer.toLowerCase()).length / questions.length) * 9,
            } satisfies ListeningReviewData}
          />
        </>
      )}
    </div>
  );
}

function AudioPlayer({ audioUrl, transcript }: { audioUrl: string; transcript: string | null }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const hasReal = audioUrl && !audioUrl.startsWith("/audio/sample");

  const setRate = (r: number) => {
    setSpeed(r);
    if (audioRef.current) audioRef.current.playbackRate = r;
  };

  const togglePlay = async () => {
    if (hasReal && audioRef.current) {
      if (playing) {
        audioRef.current.pause();
      } else {
        audioRef.current.playbackRate = speed;
        await audioRef.current.play();
      }
      return;
    }
    if (!transcript) {
      toast.error("Không có audio + transcript.");
      return;
    }
    if (!isTTSSupported()) {
      toast.error("Browser không hỗ trợ TTS.");
      return;
    }
    if (playing) {
      stopSpeaking();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    try {
      await speakText(transcript, { rate: speed });
    } finally {
      setPlaying(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        {hasReal ? (
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            className="w-full"
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
          />
        ) : (
          <Button onClick={togglePlay} variant={playing ? "destructive" : "brand"} size="lg" className="w-full">
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing ? "Dừng" : "Phát audio (AI voice)"}
          </Button>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <Gauge className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-semibold">Tốc độ:</span>
          {[0.75, 1, 1.25, 1.5, 2].map((r) => (
            <button
              key={r}
              onClick={() => setRate(r)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-bold transition-colors",
                speed === r ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent",
              )}
            >
              {r}x
            </button>
          ))}
        </div>
        {!hasReal && (
          <p className="text-xs text-muted-foreground italic">
            ⚠️ Audio dùng giọng AI (Web Speech). Practice — không giới hạn lần phát.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
