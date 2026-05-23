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

interface Section {
  id: string;
  title: string;
  section: number;
  audioUrl: string;
  imageUrl?: string | null;
  contentImageUrl?: string | null;
  transcript: string | null;
  questions: Q[];
}

/**
 * Mock Listening — IELTS-style 4 sections in one sitting. Each section has its
 * own audio recording (admin labels which section it belongs to); the candidate
 * plays each, answers its questions, and submits everything together for grading.
 */
export function MockListening({
  sections,
  timeLimit,
  onDone,
}: {
  sections: Section[];
  timeLimit: number;
  onDone: (answers: Record<string, string>) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState(timeLimit);

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

  // Continuous numbering across the 4 sections (Q1–40 in a real IELTS).
  const sectionOffsets: number[] = [];
  {
    let off = 1;
    for (const s of sections) {
      sectionOffsets.push(off);
      off += s.questions.length;
    }
  }
  const totalAnswered = sections
    .flatMap((s) => s.questions)
    .filter((q) => (answers[q.id] || "").trim()).length;
  const totalQuestions = sections.reduce((n, s) => n + s.questions.length, 0);

  const onChange = (qId: string, value: string) =>
    setAnswers((a) => ({ ...a, [qId]: value }));

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="rounded-2xl border bg-amber-500 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Headphones className="h-6 w-6" />
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">Section 1/4 · Listening</div>
            <div className="font-extrabold">4 sections, {totalQuestions} câu</div>
          </div>
        </div>
        <Badge variant="outline" className="bg-white/15 border-white/30 text-white text-base px-3 py-1">
          <Clock className="h-4 w-4 mr-1" /> {formatDuration(remaining)}
        </Badge>
      </div>

      {sections.map((s, i) => (
        <SectionBlock
          key={s.id}
          section={s}
          startNum={sectionOffsets[i]}
          answers={answers}
          onChange={onChange}
        />
      ))}

      <div className="rounded-2xl border bg-card p-4 flex items-center justify-between gap-3 sticky bottom-3 shadow-lg">
        <div className="text-sm">
          Đã trả lời <strong>{totalAnswered}/{totalQuestions}</strong>
        </div>
        <Button onClick={() => onDone(answers)} variant="brand" size="lg" className="rounded-full">
          Nộp & sang Reading →
        </Button>
      </div>
    </div>
  );
}

/** One of the 4 listening sections — own audio + own question list. */
function SectionBlock({
  section,
  startNum,
  answers,
  onChange,
}: {
  section: Section;
  startNum: number;
  answers: Record<string, string>;
  onChange: (qId: string, value: string) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasRealAudio = section.audioUrl && !section.audioUrl.startsWith("/audio/sample");

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
    if (!section.transcript) return;
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
      await speakText(section.transcript, { rate: 0.9 });
    } finally {
      setPlaying(false);
    }
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-amber-600">
                Section {section.section}
              </div>
              <div className="font-semibold">{section.title}</div>
            </div>
            <Badge variant="outline">
              Câu {startNum}–{startNum + section.questions.length - 1}
            </Badge>
          </div>
          {section.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={section.imageUrl} alt="" className="w-full max-h-56 rounded-lg border bg-muted/30 object-contain" />
          )}
          {hasRealAudio ? (
            <audio
              ref={audioRef}
              src={section.audioUrl}
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
                ⚠️ Mock test — Audio dùng giọng AI.
              </p>
            </div>
          )}
          {section.contentImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={section.contentImageUrl}
              alt="Hình ảnh cho bài làm"
              className="w-full max-h-[32rem] rounded-lg border bg-muted/30 object-contain"
            />
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {groupQuestions(section.questions).map((unit) => {
          if (unit.kind === "form") {
            const end = startNum + unit.startNum - 1 + unit.items.length - 1;
            const start = startNum + unit.startNum - 1;
            const Block = unit.layout === "table" ? TableBlanks : FormBlanks;
            return (
              <Card key={`form-${unit.items[0].id}`}>
                <CardContent className="p-5 space-y-2">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-primary">
                    Câu {start}–{end} · {unit.layout === "table" ? "Hoàn thành bảng" : "Điền vào chỗ trống"}
                  </div>
                  <Block
                    items={unit.items}
                    startNum={start}
                    answers={answers}
                    onChange={onChange}
                  />
                </CardContent>
              </Card>
            );
          }
          const q = unit.q;
          const num = startNum + unit.num - 1;
          const userAns = answers[q.id] || "";
          return (
            <Card key={q.id}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-primary">{num}.</span>
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
                          onChange={(e) => onChange(q.id, e.target.value)}
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
                    onChange={(e) => onChange(q.id, e.target.value)}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
