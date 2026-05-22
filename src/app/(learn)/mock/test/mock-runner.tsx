"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Headphones, BookOpen, PenLine, Mic, GraduationCap, Trophy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BreakTimer } from "./break-timer";
import { MockListening } from "./section-listening";
import { MockReading } from "./section-reading";
import { MockWriting } from "./section-writing";
import { MockSpeaking } from "./section-speaking";
import { toast } from "sonner";

type Stage =
  | "intro"
  | "listening"
  | "reading"
  | "break"
  | "writing"
  | "speaking"
  | "grading"
  | "done";

type Q = {
  id: string;
  type: "MCQ" | "FILL_BLANK" | "TRUE_FALSE" | "TRUE_FALSE_NOT_GIVEN" | "MATCHING" | "MATCHING_HEADINGS" | "MATCHING_INFO" | "MATCHING_FEATURES" | "MATCHING_SENTENCE_ENDINGS" | "SHORT_ANSWER";
  prompt: string;
  options: string[] | null;
  correctAnswer: string;
  formGroup?: string | null;
};

interface Props {
  targetBand: number;
  listening: { id: string; title: string; audioUrl: string; imageUrl?: string | null; transcript: string | null; questions: Q[] };
  readings: { id: string; title: string; level: string; passage: string; imageUrl?: string | null; questions: Q[] }[];
  writing: {
    task1: { id: string; prompt: string; minWords: number; diagramSvg: string | null };
    task2: { id: string; prompt: string; minWords: number };
  };
  speaking: {
    id: string;
    topic: string;
    imageUrl?: string | null;
    part1Questions: string[];
    part2CueCard: { topic: string; points: string[] };
    part3Questions: string[];
  };
}

export function MockRunner({ targetBand, listening, readings, writing, speaking }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("intro");
  const [listeningAns, setListeningAns] = useState<Record<string, string>>({});
  const [readingAns, setReadingAns] = useState<Record<string, string>>({});
  const [writingEssays, setWritingEssays] = useState<{ essay1: string; essay2: string }>({
    essay1: "",
    essay2: "",
  });
  const [speakingTranscripts, setSpeakingTranscripts] = useState<{ 1: string; 2: string; 3: string }>({ 1: "", 2: "", 3: "" });
  const [result, setResult] = useState<MockResult | null>(null);

  const submitMock = async (transcripts: { 1: string; 2: string; 3: string }) => {
    setStage("grading");
    try {
      const res = await fetch("/api/mock/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listening: {
            testId: listening.id,
            answers: listeningAns,
            questions: listening.questions.map((q) => ({ id: q.id, correctAnswer: q.correctAnswer, type: q.type })),
          },
          reading: {
            testIds: readings.map((r) => r.id),
            answers: readingAns,
            questions: readings.flatMap((r) => r.questions.map((q) => ({ id: q.id, correctAnswer: q.correctAnswer, type: q.type }))),
          },
          writing: {
            task1Id: writing.task1.id,
            essay1: writingEssays.essay1,
            task2Id: writing.task2.id,
            essay2: writingEssays.essay2,
          },
          speaking: { setId: speaking.id, topic: speaking.topic, transcripts },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      setStage("done");
    } catch (e) {
      console.error(e);
      toast.error("Chấm bài thất bại. Đã lưu draft.");
      setStage("done");
    }
  };

  if (stage === "intro") {
    return (
      <div className="max-w-2xl mx-auto py-10 space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl gradient-brand text-white shadow-lg shadow-primary/30">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Sẵn sàng thi thử?</h1>
          <p className="text-muted-foreground">Đề được chọn theo target band {targetBand.toFixed(1)} của bạn.</p>
        </div>
        <Card>
          <CardContent className="p-5 text-sm space-y-2">
            <p>📋 Listening → Reading (60′, 4 bài) → nghỉ 15′ → Writing (60′, 2 task) → Speaking (3 part)</p>
            <p>⏸ Có 1 lần nghỉ 15 phút sau Reading (có thể skip)</p>
            <p>🚫 Khi bắt đầu rồi thì không thể quay lại phần trước</p>
            <p>📊 Cuối bài AI sẽ chấm cả 4 kỹ năng</p>
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button variant="outline" size="xl" className="flex-1 rounded-full" onClick={() => router.push("/mock")}>
            Quay lại
          </Button>
          <Button variant="brand" size="xl" className="flex-1 rounded-full" onClick={() => setStage("listening")}>
            Bắt đầu →
          </Button>
        </div>
      </div>
    );
  }

  if (stage === "listening") {
    return (
      <MockListening
        title={listening.title}
        audioUrl={listening.audioUrl}
        imageUrl={listening.imageUrl}
        transcript={listening.transcript}
        questions={listening.questions}
        timeLimit={20 * 60}
        onDone={(ans) => {
          setListeningAns(ans);
          setStage("reading");
        }}
      />
    );
  }

  if (stage === "reading") {
    return (
      <MockReading
        passages={readings}
        timeLimit={60 * 60}
        onDone={(ans) => {
          setReadingAns(ans);
          setStage("break");
        }}
      />
    );
  }
  if (stage === "break") return <BreakTimer seconds={15 * 60} onDone={() => setStage("writing")} />;

  if (stage === "writing") {
    return (
      <MockWriting
        task1={writing.task1}
        task2={writing.task2}
        timeLimit={60 * 60}
        onDone={(essays) => {
          setWritingEssays(essays);
          setStage("speaking");
        }}
      />
    );
  }

  if (stage === "speaking") {
    return (
      <MockSpeaking
        topic={speaking.topic}
        imageUrl={speaking.imageUrl}
        part1Questions={speaking.part1Questions}
        part2CueCard={speaking.part2CueCard}
        part3Questions={speaking.part3Questions}
        onDone={(transcripts) => {
          setSpeakingTranscripts(transcripts);
          submitMock(transcripts);
        }}
      />
    );
  }

  if (stage === "grading") {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <h2 className="text-2xl font-extrabold">AI đang chấm bài...</h2>
          <p className="text-muted-foreground max-w-md">Đợi 30-60 giây cho cả 4 kỹ năng. Đừng đóng tab nhé.</p>
        </div>
      </div>
    );
  }

  if (stage === "done" && result) {
    return <MockResultView result={result} onBack={() => router.push("/mock")} />;
  }

  return null;
}

type MockResult = {
  overallBand: number;
  perSkill: {
    listening: { band: number; correct: number; total: number };
    reading: { band: number; correct: number; total: number };
    writing: { band: number; feedback: string };
    speaking: { band: number; feedback: string };
  };
  summary: string;
};

function MockResultView({ result, onBack }: { result: MockResult; onBack: () => void }) {
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="text-center space-y-2">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl gradient-brand text-white shadow-lg shadow-primary/30">
          <Trophy className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Mock test hoàn thành 🎉</h1>
      </div>

      <Card className="bg-gradient-to-br from-primary/10 to-accent border-2 border-primary/20">
        <CardContent className="p-8 text-center">
          <div className="text-sm text-muted-foreground">Overall Band</div>
          <div className="text-7xl font-extrabold gradient-brand-text mt-2">{result.overallBand.toFixed(1)}</div>
          <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">{result.summary}</p>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-3">
        <SkillCard icon={Headphones} label="Listening" band={result.perSkill.listening.band} note={`${result.perSkill.listening.correct}/${result.perSkill.listening.total} câu đúng`} grad="from-amber-500 to-orange-500" />
        <SkillCard icon={BookOpen} label="Reading" band={result.perSkill.reading.band} note={`${result.perSkill.reading.correct}/${result.perSkill.reading.total} câu đúng`} grad="from-emerald-500 to-teal-500" />
        <SkillCard icon={PenLine} label="Writing" band={result.perSkill.writing.band} note={result.perSkill.writing.feedback} grad="from-rose-500 to-pink-500" />
        <SkillCard icon={Mic} label="Speaking" band={result.perSkill.speaking.band} note={result.perSkill.speaking.feedback} grad="from-indigo-500 to-blue-500" />
      </div>

      <Button onClick={onBack} variant="brand" size="xl" className="w-full rounded-full">
        Về trang Mock
      </Button>
    </div>
  );
}

function SkillCard({
  icon: Icon,
  label,
  band,
  note,
  grad,
}: {
  icon: React.ElementType;
  label: string;
  band: number;
  note: string;
  grad: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${grad} text-white`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="text-3xl font-extrabold gradient-brand-text">{band.toFixed(1)}</div>
        </div>
        <div className="mt-3">
          <div className="font-bold">{label}</div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{note}</p>
        </div>
      </CardContent>
    </Card>
  );
}
