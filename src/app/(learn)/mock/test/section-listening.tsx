"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Headphones, Play, Pause } from "lucide-react";
import { formatDuration, cn } from "@/lib/utils";
import { speakText, stopSpeaking, isTTSSupported } from "@/lib/tts";
import { FormBlanks, TableBlanks, groupQuestions } from "@/components/learn/form-blanks";

type Q = {
  id: string;
  type: "MCQ" | "FILL_BLANK" | "TRUE_FALSE" | "TRUE_FALSE_NOT_GIVEN" | "MATCHING" | "MATCHING_HEADINGS" | "MATCHING_INFO" | "MATCHING_FEATURES" | "MATCHING_SENTENCE_ENDINGS" | "SHORT_ANSWER";
  prompt: string;
  options: string[] | null;
  correctAnswer: string;
  formGroup?: string | null;
};

export function MockListening({
  title,
  audioUrl,
  imageUrl,
  contentImageUrl,
  transcript,
  questions,
  timeLimit,
  onDone,
}: {
  title: string;
  audioUrl: string;
  imageUrl?: string | null;
  contentImageUrl?: string | null;
  transcript: string | null;
  questions: Q[];
  timeLimit: number;
  onDone: (answers: Record<string, string>) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState(timeLimit);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          onDone(answers);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasRealAudio = audioUrl && !audioUrl.startsWith("/audio/sample");

  const togglePlay = async () => {
    if (hasRealAudio && audioRef.current) {
      if (playing) {
        audioRef.current.pause();
        setPlaying(false);
      } else {
        await audioRef.current.play();
        setPlaying(true);
      }
      return;
    }
    if (!transcript) return;
    if (playing) {
      stopSpeaking();
      setPlaying(false);
      return;
    }
    if (!isTTSSupported()) {
      alert("Browser không hỗ trợ TTS. Dùng Chrome desktop nhé.");
      return;
    }
    setPlaying(true);
    try {
      await speakText(transcript, { rate: 0.9 });
    } finally {
      setPlaying(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="rounded-2xl border bg-amber-500 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Headphones className="h-6 w-6" />
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">Section 1/4</div>
            <div className="font-extrabold">Listening</div>
          </div>
        </div>
        <Badge variant="outline" className="bg-white/15 border-white/30 text-white text-base px-3 py-1">
          <Clock className="h-4 w-4 mr-1" /> {formatDuration(remaining)}
        </Badge>
      </div>

      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="font-semibold">{title}</div>
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="w-full max-h-72 rounded-lg border bg-muted/30 object-contain" />
          )}
          {hasRealAudio ? (
            <audio
              ref={audioRef}
              src={audioUrl}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              controls
              className="w-full"
            />
          ) : (
            <div className="rounded-xl border p-4 bg-muted/30">
              <Button onClick={togglePlay} variant={playing ? "destructive" : "brand"} size="lg" className="w-full">
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {playing ? "Dừng" : "Phát audio"}
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                ⚠️ Mock test — chỉ phát 1 lần. Audio dùng giọng AI.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {contentImageUrl && (
        <Card>
          <CardContent className="p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={contentImageUrl}
              alt="Hình ảnh cho bài làm"
              className="w-full max-h-[32rem] rounded-lg border bg-muted/30 object-contain"
            />
          </CardContent>
        </Card>
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
                  />
                </CardContent>
              </Card>
            );
          }
          const q = unit.q;
          const userAns = answers[q.id] || "";
          return (
            <Card key={q.id}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-primary">{unit.num}.</span>
                  <p className="font-medium flex-1">{q.prompt}</p>
                </div>
                {q.options ? (
                  <div className="space-y-2">
                    {q.options.map((opt) => (
                      <label
                        key={opt}
                        className={cn("flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer", userAns === opt && "border-primary bg-accent")}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={opt}
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
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button onClick={() => onDone(answers)} variant="brand" size="xl" className="w-full rounded-full">
        Nộp & sang Reading →
      </Button>
    </div>
  );
}
