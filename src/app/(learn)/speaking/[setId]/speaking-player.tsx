"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Loader2, Clock, Sparkles, ChevronRight } from "lucide-react";

type Part = 1 | 2 | 3;

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
  const [part, setPart] = useState<Part>(1);
  const [transcripts, setTranscripts] = useState<{ 1: string; 2: string; 3: string }>({ 1: "", 2: "", 3: "" });
  const [recording, setRecording] = useState(false);
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState<SpeakingResult | null>(null);
  const [resultPart, setResultPart] = useState<Part>(1);
  const recRef = useRef<unknown>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as unknown as { webkitSpeechRecognition?: unknown; SpeechRecognition?: unknown }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    if (!SR) setSupported(false);
  }, []);

  const start = () => {
    const W = window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown };
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) {
      toast.error("Trình duyệt không hỗ trợ. Vui lòng dùng Chrome trên desktop.");
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
    r.onerror = (err) => {
      console.error(err);
      setRecording(false);
    };
    r.onend = () => setRecording(false);
    r.start();
    recRef.current = r;
    setRecording(true);
  };

  const stop = () => {
    if (recRef.current) {
      (recRef.current as { stop: () => void }).stop();
      recRef.current = null;
    }
    setRecording(false);
  };

  const gradeCurrentPart = async () => {
    const transcript = transcripts[part].trim();
    if (transcript.length < 20) {
      toast.error("Transcript quá ngắn. Hãy nói/gõ nhiều hơn.");
      return;
    }
    setGrading(true);
    try {
      const questions = part === 1 ? part1Questions : part === 3 ? part3Questions : [];
      const cueCard = part === 2 ? part2CueCard : undefined;
      const res = await fetch("/api/grade/speaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setId, part, topic, questions, cueCard, transcript }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.result);
      setResultPart(part);
      toast.success(`Band ${data.result.overallBand}`);
    } catch (e) {
      console.error(e);
      toast.error("AI chấm bài thất bại");
    } finally {
      setGrading(false);
    }
  };

  if (result) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Card className="bg-gradient-to-br from-primary/10 to-accent">
          <CardContent className="p-6 text-center">
            <div className="text-sm text-muted-foreground">Part {resultPart} — Overall Band</div>
            <div className="text-6xl font-bold text-primary mt-2">{result.overallBand.toFixed(1)}</div>
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

        {result.observations.length > 0 && (
          <Card>
            <CardContent className="p-5 space-y-2">
              <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4" /> Nhận xét</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {result.observations.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
            </CardContent>
          </Card>
        )}

        {result.improvedSample && (
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-2">Sample trả lời tham khảo</h3>
              <div className="whitespace-pre-wrap text-sm text-muted-foreground">{result.improvedSample}</div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setResult(null)} className="flex-1">Quay lại làm part khác</Button>
          <Button onClick={() => router.push("/speaking")} className="flex-1">Về danh sách</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <button onClick={() => router.push("/speaking")} className="text-sm text-muted-foreground hover:underline">
          ← Speaking
        </button>
        <h1 className="text-xl md:text-2xl font-bold mt-1 flex items-center gap-2">
          <Mic className="h-6 w-6 text-indigo-500" />
          {topic}
        </h1>
      </div>

      <div className="flex gap-2">
        {[1, 2, 3].map((p) => (
          <Button key={p} variant={part === p ? "default" : "outline"} onClick={() => setPart(p as Part)} size="sm">
            Part {p}
          </Button>
        ))}
      </div>

      {!supported && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-sm text-destructive">
            Trình duyệt của bạn không hỗ trợ speech recognition. Bạn vẫn có thể gõ tay transcript vào ô bên dưới.
          </CardContent>
        </Card>
      )}

      {part === 1 && (
        <Card>
          <CardContent className="p-5 space-y-2">
            <Badge className="mb-1">Part 1</Badge>
            <h3 className="font-semibold">Câu hỏi</h3>
            <ul className="list-decimal pl-5 space-y-1 text-sm">
              {part1Questions.map((q, i) => <li key={i}>{q}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {part === 2 && (
        <Card>
          <CardContent className="p-5 space-y-2">
            <Badge className="mb-1">Part 2 — Cue Card</Badge>
            <h3 className="font-semibold">{part2CueCard.topic}</h3>
            <p className="text-sm text-muted-foreground">You should say:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {part2CueCard.points.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Chuẩn bị 1 phút, nói 1–2 phút.
            </p>
          </CardContent>
        </Card>
      )}

      {part === 3 && (
        <Card>
          <CardContent className="p-5 space-y-2">
            <Badge className="mb-1">Part 3</Badge>
            <h3 className="font-semibold">Câu hỏi thảo luận</h3>
            <ul className="list-decimal pl-5 space-y-1 text-sm">
              {part3Questions.map((q, i) => <li key={i}>{q}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Transcript</h3>
            {!recording ? (
              <Button size="sm" onClick={start} disabled={!supported}>
                <Mic className="h-4 w-4" /> Bắt đầu ghi
              </Button>
            ) : (
              <Button size="sm" variant="destructive" onClick={stop}>
                <MicOff className="h-4 w-4" /> Dừng
              </Button>
            )}
          </div>
          <Textarea
            value={transcripts[part]}
            onChange={(e) => setTranscripts({ ...transcripts, [part]: e.target.value })}
            placeholder="Hãy nói bằng tiếng Anh — transcript sẽ tự xuất hiện ở đây. Bạn cũng có thể chỉnh sửa hoặc gõ tay."
            className="min-h-[200px]"
          />
          <Button onClick={gradeCurrentPart} disabled={grading} className="w-full" size="lg">
            {grading && <Loader2 className="h-4 w-4 animate-spin" />}
            {grading ? "AI đang chấm..." : `Chấm Part ${part}`}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function labelOf(k: string) {
  switch (k) {
    case "fluencyCoherence": return "Fluency & Coherence";
    case "lexicalResource": return "Lexical Resource";
    case "grammaticalRange": return "Grammatical Range";
    case "pronunciation": return "Pronunciation*";
    default: return k;
  }
}
