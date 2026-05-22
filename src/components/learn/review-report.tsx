"use client";
import { Download, Printer, CheckCircle2, XCircle, Sparkles, Lightbulb, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isAnswerCorrect } from "@/lib/utils";

export interface ReadingReviewData {
  kind: "READING";
  passages: {
    title: string;
    level?: string;
    questions: {
      prompt: string;
      type: string;
      userAnswer: string;
      correctAnswer: string;
      explanation?: string | null;
    }[];
  }[];
  totalCorrect: number;
  totalQuestions: number;
  band: number;
}

export interface ListeningReviewData {
  kind: "LISTENING";
  title: string;
  transcript?: string | null;
  questions: {
    prompt: string;
    type: string;
    userAnswer: string;
    correctAnswer: string;
    explanation?: string | null;
  }[];
  totalCorrect: number;
  totalQuestions: number;
  band: number;
}

export interface WritingReviewData {
  kind: "WRITING";
  taskType: 1 | 2;
  prompt: string;
  essay: string;
  result: {
    overallBand: number;
    criteria?: {
      taskAchievement?: { band: number; feedback: string };
      coherenceCohesion?: { band: number; feedback: string };
      lexicalResource?: { band: number; feedback: string };
      grammaticalRange?: { band: number; feedback: string };
    };
    annotations?: { excerpt: string; issue: string; suggestion: string }[];
    improvedVersion?: string;
    summary?: string;
  };
}

export interface SpeakingReviewData {
  kind: "SPEAKING";
  topic: string;
  transcripts: { 1: string[] | string; 2: string; 3: string[] | string };
  part1Questions: string[];
  part2CueCard: { topic: string; points: string[] };
  part3Questions: string[];
  result: {
    overallBand: number;
    criteria: {
      fluencyCoherence: { band: number; feedback: string };
      lexicalResource: { band: number; feedback: string };
      grammaticalRange: { band: number; feedback: string };
      pronunciation: { band: number; feedback: string; note?: string };
    };
    observations: string[];
    improvedSample: string;
    summary: string;
  };
}

export type ReviewData = ReadingReviewData | ListeningReviewData | WritingReviewData | SpeakingReviewData;

const skillLabel = {
  READING: "Reading",
  LISTENING: "Listening",
  WRITING: "Writing",
  SPEAKING: "Speaking",
} as const;

const methodTips = {
  MCQ: "Đọc kỹ tất cả 4 lựa chọn trước khi chọn. Tìm các từ paraphrase trong passage tương ứng với đáp án.",
  FILL_BLANK: "Kiểm tra grammar xung quanh ô trống: số ít/số nhiều, thì, từ loại. Đáp án thường nằm gần các từ khoá xung quanh chỗ trống.",
  TRUE_FALSE: "True = đúng theo passage. False = trái với passage. Đừng dựa vào kiến thức ngoài.",
  MATCHING: "Tìm key words duy nhất ở mỗi lựa chọn rồi scan passage để locate.",
  SHORT_ANSWER: "Giữ đáp án ngắn gọn; copy đúng cụm từ trong passage; chú ý số từ giới hạn.",
};

export function ReviewReport({ data, onClose }: { data: ReviewData; onClose?: () => void }) {
  const triggerPrint = () => {
    window.print();
  };

  return (
    <div className="print-area space-y-5">
      <div className="no-print flex items-center justify-between gap-3 flex-wrap rounded-2xl border bg-card p-4">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl gradient-brand text-white">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <div className="font-extrabold tracking-tight">Báo cáo chi tiết</div>
            <div className="text-xs text-muted-foreground">Bấm "Tải PDF" để lưu lại (Print → Save as PDF)</div>
          </div>
        </div>
        <div className="flex gap-2">
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Ẩn
            </Button>
          )}
          <Button variant="brand" size="sm" onClick={triggerPrint}>
            <Download className="h-4 w-4" /> Tải PDF
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐝</span>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Bee IELTS · {skillLabel[data.kind]} Report</div>
              <div className="text-lg font-extrabold tracking-tight">
                {data.kind === "READING" && `4 Passages · Band ${data.band.toFixed(1)}`}
                {data.kind === "LISTENING" && `${data.title} · Band ${data.band.toFixed(1)}`}
                {data.kind === "WRITING" && `Task ${data.taskType} · Band ${data.result.overallBand.toFixed(1)}`}
                {data.kind === "SPEAKING" && `${data.topic} · Band ${data.result.overallBand.toFixed(1)}`}
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">{new Date().toLocaleString("vi-VN")}</div>
        </div>

        {data.kind === "READING" && <ReadingBody data={data} />}
        {data.kind === "LISTENING" && <ListeningBody data={data} />}
        {data.kind === "WRITING" && <WritingBody data={data} />}
        {data.kind === "SPEAKING" && <SpeakingBody data={data} />}
      </div>
    </div>
  );
}

function ReadingBody({ data }: { data: ReadingReviewData }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-accent/40 p-4 text-sm avoid-break">
        <div className="font-bold mb-1 flex items-center gap-1"><Sparkles className="h-4 w-4 text-primary" /> Tổng quan</div>
        <p>Đúng <strong>{data.totalCorrect}/{data.totalQuestions}</strong> câu · Band ước tính <strong>{data.band.toFixed(1)}</strong></p>
      </div>

      {data.passages.map((p, pi) => (
        <div key={pi} className={`space-y-2 ${pi > 0 ? "page-break" : ""}`}>
          <h3 className="text-base font-extrabold border-b pb-1">Passage {pi + 1}: {p.title}{p.level ? ` (${p.level})` : ""}</h3>
          <div className="space-y-2">
            {p.questions.map((q, qi) => {
              const ok = isAnswerCorrect(q.userAnswer, q.correctAnswer, q.type);
              return (
                <QABlock
                  key={qi}
                  idx={qi + 1}
                  question={q.prompt}
                  userAnswer={q.userAnswer}
                  correctAnswer={q.correctAnswer}
                  ok={ok}
                  explanation={q.explanation || undefined}
                  method={methodTips[q.type as keyof typeof methodTips] || "Đọc kỹ câu hỏi và tìm key word liên quan trong passage."}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ListeningBody({ data }: { data: ListeningReviewData }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-accent/40 p-4 text-sm avoid-break">
        <div className="font-bold mb-1 flex items-center gap-1"><Sparkles className="h-4 w-4 text-primary" /> Tổng quan</div>
        <p>Đúng <strong>{data.totalCorrect}/{data.totalQuestions}</strong> câu · Band ước tính <strong>{data.band.toFixed(1)}</strong></p>
      </div>

      <h3 className="text-base font-extrabold border-b pb-1">Câu hỏi & đáp án</h3>
      <div className="space-y-2">
        {data.questions.map((q, qi) => {
          const ok = isAnswerCorrect(q.userAnswer, q.correctAnswer, q.type);
          return (
            <QABlock
              key={qi}
              idx={qi + 1}
              question={q.prompt}
              userAnswer={q.userAnswer}
              correctAnswer={q.correctAnswer}
              ok={ok}
              explanation={q.explanation || undefined}
              method={methodTips[q.type as keyof typeof methodTips] || "Predict đáp án trước khi audio chạy, nghe key word, không panic khi miss 1 câu."}
            />
          );
        })}
      </div>

      {data.transcript && (
        <div className="space-y-2 page-break avoid-break">
          <h3 className="text-base font-extrabold border-b pb-1">Transcript</h3>
          <div className="whitespace-pre-wrap text-sm text-muted-foreground">{data.transcript}</div>
        </div>
      )}
    </div>
  );
}

function WritingBody({ data }: { data: WritingReviewData }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-accent/40 p-4 text-sm avoid-break">
        <div className="font-bold mb-1 flex items-center gap-1"><Sparkles className="h-4 w-4 text-primary" /> Tổng quan</div>
        <p>{data.result.summary}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 avoid-break">
        {Object.entries(data.result.criteria ?? {}).map(([k, v]) =>
          v ? (
            <div key={k} className="rounded-xl border p-3 text-sm">
              <div className="flex items-center justify-between font-bold">
                <span>{writingCriterionLabel(k)}</span>
                <span className="text-primary">{v.band.toFixed(1)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{v.feedback}</p>
            </div>
          ) : null,
        )}
      </div>

      <div className="page-break">
        <h3 className="text-base font-extrabold border-b pb-1 mb-2">Đề bài</h3>
        <p className="whitespace-pre-wrap text-sm">{data.prompt}</p>
      </div>

      <div className="avoid-break">
        <h3 className="text-base font-extrabold border-b pb-1 mb-2">Bài của bạn</h3>
        <p className="whitespace-pre-wrap text-sm">{(data.essay ?? "").normalize("NFC")}</p>
      </div>

      {data.result.annotations && data.result.annotations.length > 0 && (
        <div className="space-y-2 page-break">
          <h3 className="text-base font-extrabold border-b pb-1">Lỗi / Góp ý chi tiết</h3>
          {data.result.annotations.map((a, i) => (
            <div key={i} className="rounded-xl border p-3 space-y-1.5 text-sm avoid-break">
              <div className="text-xs text-muted-foreground">#{i + 1}</div>
              <div className="italic">"{a.excerpt}"</div>
              <div><strong className="text-destructive">Lỗi:</strong> {a.issue}</div>
              <div><strong className="text-success">Phương pháp:</strong> {a.suggestion}</div>
            </div>
          ))}
        </div>
      )}

      {data.result.improvedVersion && (
        <div className="space-y-2 page-break avoid-break">
          <h3 className="text-base font-extrabold border-b pb-1">Bản viết tham khảo (band cao hơn)</h3>
          <p className="whitespace-pre-wrap text-sm">{data.result.improvedVersion.normalize("NFC")}</p>
        </div>
      )}
    </div>
  );
}

function SpeakingBody({ data }: { data: SpeakingReviewData }) {
  const t1 = Array.isArray(data.transcripts[1]) ? (data.transcripts[1] as string[]) : [data.transcripts[1] as string];
  const t3 = Array.isArray(data.transcripts[3]) ? (data.transcripts[3] as string[]) : [data.transcripts[3] as string];
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-accent/40 p-4 text-sm avoid-break">
        <div className="font-bold mb-1 flex items-center gap-1"><Sparkles className="h-4 w-4 text-primary" /> Tổng quan</div>
        <p>{data.result.summary}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 avoid-break">
        {Object.entries(data.result.criteria).map(([k, v]) => (
          <div key={k} className="rounded-xl border p-3 text-sm">
            <div className="flex items-center justify-between font-bold">
              <span>{speakingCriterionLabel(k)}</span>
              <span className="text-primary">{v.band.toFixed(1)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{v.feedback}</p>
            {"note" in v && v.note && <p className="mt-1 text-xs italic text-muted-foreground">{v.note}</p>}
          </div>
        ))}
      </div>

      <div className="space-y-3 page-break">
        <h3 className="text-base font-extrabold border-b pb-1">Part 1 — câu hỏi và câu trả lời</h3>
        {data.part1Questions.map((q, i) => (
          <div key={i} className="rounded-xl border p-3 text-sm avoid-break">
            <div className="text-xs text-muted-foreground">Q{i + 1}</div>
            <div className="font-semibold">{q}</div>
            <div className="mt-1 italic">{t1[i] || "(không có câu trả lời)"}</div>
          </div>
        ))}
      </div>

      <div className="space-y-2 avoid-break">
        <h3 className="text-base font-extrabold border-b pb-1">Part 2 — Cue card</h3>
        <div className="rounded-xl border p-3 text-sm">
          <div className="font-bold">{data.part2CueCard.topic}</div>
          <ul className="list-disc pl-5 mt-1">
            {data.part2CueCard.points.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
          <div className="mt-2 italic whitespace-pre-wrap">{data.transcripts[2] || "(không có câu trả lời)"}</div>
        </div>
      </div>

      <div className="space-y-3 page-break">
        <h3 className="text-base font-extrabold border-b pb-1">Part 3 — thảo luận</h3>
        {data.part3Questions.map((q, i) => (
          <div key={i} className="rounded-xl border p-3 text-sm avoid-break">
            <div className="text-xs text-muted-foreground">Q{i + 1}</div>
            <div className="font-semibold">{q}</div>
            <div className="mt-1 italic">{t3[i] || "(không có câu trả lời)"}</div>
          </div>
        ))}
      </div>

      {data.result.observations.length > 0 && (
        <div className="space-y-2 avoid-break">
          <h3 className="text-base font-extrabold border-b pb-1">Nhận xét & phương pháp</h3>
          <ul className="list-disc pl-5 text-sm space-y-1">
            {data.result.observations.map((o, i) => <li key={i}>{o}</li>)}
          </ul>
        </div>
      )}

      {data.result.improvedSample && (
        <div className="space-y-2 page-break avoid-break">
          <h3 className="text-base font-extrabold border-b pb-1">Sample trả lời tham khảo</h3>
          <p className="whitespace-pre-wrap text-sm">{data.result.improvedSample.normalize("NFC")}</p>
        </div>
      )}
    </div>
  );
}

function QABlock({
  idx,
  question,
  userAnswer,
  correctAnswer,
  ok,
  explanation,
  method,
}: {
  idx: number;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  ok: boolean;
  explanation?: string;
  method: string;
}) {
  return (
    <div className={`rounded-xl border p-3 text-sm avoid-break ${ok ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
      <div className="flex items-start gap-2">
        <span className="font-bold shrink-0">{idx}.</span>
        <span className="flex-1">{question}</span>
        {ok ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" /> : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
      </div>
      <div className="mt-2 ml-6 space-y-1">
        <div>
          <span className="text-xs font-bold text-muted-foreground">Của bạn: </span>
          <span className={ok ? "font-semibold text-success" : "font-semibold text-destructive line-through"}>
            {userAnswer || "(trống)"}
          </span>
        </div>
        {!ok && (
          <div>
            <span className="text-xs font-bold text-muted-foreground">Đáp án đúng: </span>
            <span className="font-semibold text-success">{correctAnswer}</span>
          </div>
        )}
        {explanation && (
          <div>
            <span className="text-xs font-bold text-muted-foreground">Lý do: </span>
            <span>{explanation}</span>
          </div>
        )}
        <div className="flex items-start gap-1.5 pt-1 text-xs text-muted-foreground">
          <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
          <span><strong className="text-foreground">Phương pháp: </strong>{method}</span>
        </div>
      </div>
    </div>
  );
}

function writingCriterionLabel(k: string) {
  switch (k) {
    case "taskAchievement": return "Task Achievement";
    case "coherenceCohesion": return "Coherence & Cohesion";
    case "lexicalResource": return "Lexical Resource";
    case "grammaticalRange": return "Grammar Range & Accuracy";
    default: return k;
  }
}
function speakingCriterionLabel(k: string) {
  switch (k) {
    case "fluencyCoherence": return "Fluency & Coherence";
    case "lexicalResource": return "Lexical Resource";
    case "grammaticalRange": return "Grammar Range";
    case "pronunciation": return "Pronunciation*";
    default: return k;
  }
}
