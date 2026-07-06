"use client";

/**
 * CustomAssignmentBuilder — teacher creates homework. First pick ONE of the 4
 * skills, then a skill-specific form:
 *   - Reading / Listening → PDF (+ MP3) + answer key "1A 2B…" → auto-graded.
 *   - Writing             → đề bài (+ ảnh) → student writes, AI grades band.
 *   - Speaking            → danh sách câu hỏi → student records, AI grades band.
 * Every skill supports a deadline and a scheduled OPEN time (hẹn giờ mở bài).
 * Files are stored as base64 data URLs (no upload service).
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, BookOpen, CheckCircle2, Clock, Headphones, Loader2, Mic, PenLine, RefreshCw, Send, Sparkles, Trash2, Wand2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { aiToCustomQuestions, classifyAnswer, parseAnswerKey, readingAiToCustomQuestions, toCustomQuestions, typeLabel } from "@/lib/answer-key";
import type { ReadingExamQuestion, NumberedReadingPart } from "@/lib/groq";
import { PaperFileField } from "@/components/teacher/paper-file-field";
import { playPopSfx } from "@/lib/quiz-sfx";

const PDF_MAX = 8 * 1024 * 1024;
const AUDIO_MAX = 15 * 1024 * 1024;
const IMG_MAX = 5 * 1024 * 1024;

type Skill = "READING" | "LISTENING" | "WRITING" | "SPEAKING";

/** One AI-generated answer + solution (from POST /api/assignments/generate-key). */
interface AiItem {
  number: number;
  prompt: string;
  answer: string;
  explanation: string;
}

const SKILLS: { key: Skill; label: string; desc: string; Icon: typeof BookOpen; color: string }[] = [
  { key: "READING", label: "Reading", desc: "Đề PDF + đáp án — tự chấm", Icon: BookOpen, color: "text-leaf" },
  { key: "LISTENING", label: "Listening", desc: "Đề PDF + file nghe + đáp án — tự chấm", Icon: Headphones, color: "text-sky-600" },
  { key: "WRITING", label: "Writing", desc: "Đề bài — AI chấm band + nhận xét", Icon: PenLine, color: "text-honey-deep" },
  { key: "SPEAKING", label: "Speaking", desc: "Câu hỏi — học sinh ghi âm, AI chấm", Icon: Mic, color: "text-rose-500" },
];

export function CustomAssignmentBuilder({ classes }: { classes: { id: string; name: string }[] }) {
  const router = useRouter();

  const [skill, setSkill] = useState<Skill | null>(null);
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [openAt, setOpenAt] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [antiCheat, setAntiCheat] = useState(false);
  const [attemptsAllowed, setAttemptsAllowed] = useState("1"); // "0" = không giới hạn

  // Reading / Listening
  const [pdfUrl, setPdfUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [answerKey, setAnswerKey] = useState("");
  // AI-generated key + solutions (teacher just uploads → AI does the answers).
  const [aiQuestions, setAiQuestions] = useState<AiItem[] | null>(null);
  // READING → a native-shaped test SPLIT INTO PARTS (one per passage in the
  // file), rendered in the same ReadingShell (Part 1/2/3) the learner practice
  // uses. Questions are numbered continuously across parts.
  const [aiReading, setAiReading] = useState<{ parts: NumberedReadingPart[] } | null>(null);
  const [aiNotes, setAiNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [showManual, setShowManual] = useState(false);
  // Writing
  const [wTaskType, setWTaskType] = useState<1 | 2>(2);
  const [wPrompt, setWPrompt] = useState("");
  const [wImageUrl, setWImageUrl] = useState("");
  const [wMinWords, setWMinWords] = useState("250");
  // Speaking
  const [sPart, setSPart] = useState<1 | 2 | 3>(1);
  const [sTopic, setSTopic] = useState("");
  const [sQuestions, setSQuestions] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const parsed = useMemo(() => parseAnswerKey(answerKey), [answerKey]);

  if (classes.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-2">
          <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="text-lg font-bold">Bạn chưa có lớp nào</h2>
          <p className="text-sm text-muted-foreground">Hãy tạo một lớp học trước khi giao bài tập.</p>
        </CardContent>
      </Card>
    );
  }

  if (createdId) {
    return (
      <Card className="mx-auto max-w-lg bg-accent">
        <CardContent className="p-8 text-center space-y-3">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
          <h2 className="text-xl font-extrabold">Đã tạo &amp; giao bài!</h2>
          <p className="text-sm text-muted-foreground">
            {openAt ? "Bài sẽ tự mở cho học sinh vào giờ đã hẹn." : "Học sinh đã có thể làm bài."}
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <Button onClick={() => router.push(`/exam/${createdId}`)} variant="outline">Xem trước</Button>
            <Button variant="brand" onClick={() => { setCreatedId(null); setTitle(""); resetSkillFields(); }}>
              Tạo bài khác
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  function resetSkillFields() {
    setPdfUrl(""); setAudioUrl(""); setAnswerKey("");
    setAiQuestions(null); setAiReading(null); setAiNotes(""); setShowManual(false);
    setWPrompt(""); setWImageUrl("");
    setSTopic(""); setSQuestions("");
  }

  // ---- Skill picker ----
  if (!skill) {
    return (
      <div className="space-y-5">
        <header>
          <h1 className="text-2xl font-bold">Giao bài tập mới</h1>
          <p className="text-sm text-muted-foreground">Chọn kỹ năng để giao bài.</p>
        </header>
        <div className="grid gap-3 sm:grid-cols-2">
          {SKILLS.map(({ key, label, desc, Icon, color }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSkill(key)}
              className="flex items-center gap-3 rounded-2xl border-2 bg-card p-5 text-left transition-all hover:border-primary hover:shadow-md"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-muted">
                <Icon className={cn("h-6 w-6", color)} />
              </span>
              <span>
                <span className="block text-lg font-bold">{label}</span>
                <span className="block text-sm text-muted-foreground">{desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const meta = SKILLS.find((s) => s.key === skill)!;
  const isPaper = skill === "READING" || skill === "LISTENING";

  // Teacher uploads only the files → AI reads them and writes the answer key +
  // detailed solutions. No manual đáp án needed.
  const generateKey = async () => {
    if (!pdfUrl.trim()) return toast.error("Tải lên file PDF đề bài trước đã");
    if (skill === "LISTENING" && !audioUrl.trim()) return toast.error("Bài Listening cần file nghe để AI tạo đáp án");
    setGenerating(true);
    try {
      const res = await fetch("/api/assignments/generate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skill,
          pdfUrl: pdfUrl.trim(),
          audioUrl: skill === "LISTENING" ? audioUrl.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.scanned) setShowManual(true); // scanned PDF → nudge manual entry
        const msg = data.error || "AI không tạo được đáp án";
        throw new Error(data.detail ? `${msg} (${data.detail})` : msg);
      }
      if (data.mode === "reading") {
        // Native reading test SPLIT INTO PARTS (one per passage) → ReadingShell.
        const parts = Array.isArray(data.parts) ? (data.parts as NumberedReadingPart[]) : [];
        const total = parts.reduce((n, p) => n + p.questions.length, 0);
        setAiReading({ parts });
        setAiQuestions(null);
        setAiNotes(typeof data.notes === "string" ? data.notes : "");
        setShowManual(false);
        playPopSfx();
        toast.success(`AI đã tách ${parts.length} bài đọc · ${total} câu (giống Reading luyện tập)`);
      } else {
        setAiQuestions(data.questions as AiItem[]);
        setAiReading(null);
        setAiNotes(typeof data.notes === "string" ? data.notes : "");
        setShowManual(false);
        playPopSfx();
        toast.success(`AI đã tạo ${data.questions.length} câu — đáp án + lời giải chi tiết`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi khi tạo đáp án");
    } finally {
      setGenerating(false);
    }
  };

  // Teacher can fix the AI's answers/questions before saving (kể cả khi AI làm).
  const updateReadingQ = (pi: number, number: number, patch: Partial<ReadingExamQuestion>) =>
    setAiReading((r) =>
      r
        ? {
            parts: r.parts.map((part, i) =>
              i === pi
                ? { ...part, questions: part.questions.map((q) => (q.number === number ? { ...q, ...patch } : q)) }
                : part,
            ),
          }
        : r,
    );
  const updateReadingPassage = (pi: number, passage: string) =>
    setAiReading((r) => (r ? { parts: r.parts.map((part, i) => (i === pi ? { ...part, passage } : part)) } : r));
  const removeReadingPart = (pi: number) =>
    setAiReading((r) => {
      if (!r) return r;
      const parts = r.parts.filter((_, i) => i !== pi);
      return parts.length > 0 ? { parts } : null;
    });
  const updateListeningQ = (number: number, patch: Partial<AiItem>) =>
    setAiQuestions((qs) => (qs ? qs.map((q) => (q.number === number ? { ...q, ...patch } : q)) : qs));

  const submit = async () => {
    if (!classId) return toast.error("Chọn lớp");
    if (!title.trim()) return toast.error("Nhập tiêu đề bài tập");

    const dur = parseInt(durationMin, 10);
    const config: Record<string, unknown> = {};
    if (Number.isFinite(dur) && dur > 0) config.durationMin = dur;
    if (antiCheat) config.antiCheat = true;
    const att = parseInt(attemptsAllowed, 10);
    config.attemptsAllowed = Number.isFinite(att) && att >= 0 ? att : 1;

    const body: Record<string, unknown> = {
      classId,
      title: title.trim(),
      skill,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
      openAt: openAt ? new Date(openAt).toISOString() : undefined,
      config,
    };

    if (isPaper) {
      if (!pdfUrl.trim()) return toast.error("Tải lên file PDF đề bài");
      if (skill === "LISTENING" && !audioUrl.trim()) return toast.error("Bài Listening cần file âm thanh");

      if (skill === "READING" && aiReading && aiReading.parts.some((p) => p.questions.length > 0)) {
        // Never ship a reading part with zero questions — it renders as an empty
        // Part for the student. Force the teacher to regenerate/fix first.
        const emptyPart = aiReading.parts.findIndex((p) => p.questions.length === 0);
        if (emptyPart >= 0) {
          setSubmitting(false);
          return toast.error(`Part ${emptyPart + 1} chưa có câu hỏi — bấm "Tạo lại" hoặc xoá bài đọc trống trước khi giao.`);
        }
        // Native reading exam SPLIT INTO PARTS: each passage rides in
        // config.reading.parts (with its question count so the learner side can
        // slice the flat question list back into parts); questions carry
        // full-text options + a native correctAnswer. config.paper.skill lets
        // GradingService auto-grade them as READING (no readingId needed).
        config.reading = {
          parts: aiReading.parts.map((p) => ({
            title: p.title || title.trim(),
            passage: p.passage,
            figures: p.figures,
            count: p.questions.length,
          })),
        };
        config.paper = { skill: "READING" };
        // Flatten every part's questions in order — displayNumber already runs
        // continuously across parts, so the flat list slices back cleanly.
        body.custom_questions = aiReading.parts.flatMap((p) => readingAiToCustomQuestions(p.questions));
      } else {
        // Listening (PDF + audio) OR manual fallback → letter answer sheet.
        config.paper = { skill, pdfUrl: pdfUrl.trim(), audioUrl: skill === "LISTENING" ? audioUrl.trim() : undefined };
        if (aiQuestions && aiQuestions.length > 0) {
          body.custom_questions = aiToCustomQuestions(aiQuestions);
        } else if (parsed.answers.length > 0) {
          body.custom_questions = toCustomQuestions(parsed.answers);
        } else {
          return toast.error("Bấm “AI tạo đáp án & lời giải” hoặc tự nhập đáp án");
        }
      }
    } else if (skill === "WRITING") {
      if (!wPrompt.trim()) return toast.error("Nhập đề bài Writing");
      config.writing = {
        taskType: wTaskType,
        prompt: wPrompt.trim(),
        imageUrl: wImageUrl.trim() || undefined,
        minWords: parseInt(wMinWords, 10) || (wTaskType === 1 ? 150 : 250),
      };
    } else if (skill === "SPEAKING") {
      const questions = sQuestions.split("\n").map((q) => q.trim()).filter(Boolean);
      if (questions.length === 0) return toast.error("Nhập ít nhất 1 câu hỏi Speaking");
      config.speaking = { part: sPart, topic: sTopic.trim() || title.trim(), questions };
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tạo được bài tập");
      playPopSfx();
      setCreatedId(data.assignment.id);
      toast.success("Đã giao bài!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi khi tạo bài tập");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => setSkill(null)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Đổi kỹ năng
      </button>

      <header className="flex items-center gap-2">
        <meta.Icon className={cn("h-6 w-6", meta.color)} />
        <h1 className="text-2xl font-bold">Giao bài {meta.label}</h1>
      </header>

      {/* Common info */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cls">Lớp</Label>
              <select id="cls" value={classId} onChange={(e) => setClassId(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                {classes.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">Tiêu đề</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`VD: ${meta.label} Test 1`} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="openAt" className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Hẹn giờ mở bài (tuỳ chọn)</Label>
              <Input id="openAt" type="datetime-local" value={openAt} onChange={(e) => setOpenAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deadline">Hạn nộp (tuỳ chọn)</Label>
              <Input id="deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dur">Thời gian làm bài — phút (tuỳ chọn)</Label>
              <Input id="dur" type="number" min={1} value={durationMin} onChange={(e) => setDurationMin(e.target.value)} placeholder="VD: 60" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="att">Số lần làm bài</Label>
              <select id="att" value={attemptsAllowed} onChange={(e) => setAttemptsAllowed(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="1">1 lần (không cho làm lại)</option>
                <option value="2">2 lần</option>
                <option value="3">3 lần</option>
                <option value="5">5 lần</option>
                <option value="0">Không giới hạn</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={antiCheat} onChange={(e) => setAntiCheat(e.target.checked)} className="h-4 w-4" />
            Giám sát chống gian lận (ghi lại khi chuyển tab)
          </label>
        </CardContent>
      </Card>

      {/* Skill-specific form */}
      {isPaper && (
        <>
          <Card><CardContent className="space-y-4 p-5">
            <PaperFileField kind="pdf" label="File đề bài (PDF)" value={pdfUrl} onChange={setPdfUrl} maxBytes={PDF_MAX} />
            {skill === "LISTENING" && (
              <PaperFileField kind="audio" label="File nghe (MP3)" value={audioUrl} onChange={setAudioUrl} maxBytes={AUDIO_MAX} />
            )}
          </CardContent></Card>

          {/* AI answer key + solutions — teacher just uploads, AI does the rest */}
          {!aiQuestions && !aiReading ? (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="space-y-3 p-5 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10">
                  <Wand2 className="h-6 w-6 text-primary" />
                </span>
                <div>
                  <h3 className="text-lg font-bold">Để AI làm đề cho bạn</h3>
                  <p className="mx-auto max-w-md text-sm text-muted-foreground">
                    Chỉ cần tải {skill === "LISTENING" ? "đề PDF + file nghe" : "đề PDF"} lên — AI sẽ đọc,
                    {skill === "READING"
                      ? <> tách bài đọc + câu hỏi thành <strong>bài Reading giống hệt phần luyện tập</strong> (đọc bên trái, làm câu hỏi bên phải), kèm lời giải.</>
                      : <> chấm đáp án đúng và viết <strong>lời giải chi tiết</strong> cho từng câu.</>}
                    {" "}Bạn không phải gõ đáp án.
                  </p>
                </div>
                <Button
                  onClick={generateKey}
                  disabled={generating || !pdfUrl.trim()}
                  variant="brand"
                  className="rounded-full min-w-[220px]"
                >
                  {generating ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> AI đang đọc đề…</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> AI tạo đáp án &amp; lời giải</>
                  )}
                </Button>
                {generating && (
                  <p className="text-xs text-muted-foreground">
                    {skill === "LISTENING" ? "Đang nghe audio + đọc đề" : "Đang đọc đề"} — có thể mất 10–30 giây.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setShowManual((v) => !v)}
                  className="text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  {showManual ? "Ẩn nhập đáp án thủ công" : "Hoặc tự nhập đáp án thủ công"}
                </button>
              </CardContent>
            </Card>
          ) : aiQuestions ? (
            <Card className="border-leaf/40">
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-leaf" />
                    <h3 className="font-bold">AI đã tạo {aiQuestions.length} câu · đáp án &amp; lời giải</h3>
                  </div>
                  <div className="flex gap-1.5">
                    <Button onClick={generateKey} disabled={generating} variant="outline" size="sm" className="rounded-lg">
                      {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Tạo lại
                    </Button>
                    <Button onClick={() => { setAiQuestions(null); setAiNotes(""); }} variant="ghost" size="sm" className="rounded-lg text-muted-foreground">
                      <Trash2 className="h-3.5 w-3.5" /> Xoá
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sửa lại đáp án nếu AI chấm sai — gõ trực tiếp vào ô. Học sinh sẽ làm bài; giáo viên xem lời giải chi tiết ở trang chấm bài.
                </p>
                {aiNotes && (
                  <p className="rounded-lg border border-amber-300 bg-amber-50/70 p-2.5 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                    ⚠️ Lưu ý từ AI: {aiNotes}
                  </p>
                )}
                <ul className="space-y-2">
                  {aiQuestions.map((q) => {
                    const c = classifyAnswer(q.answer);
                    return (
                      <li key={q.number} className="rounded-lg border bg-muted/20 p-3">
                        <div className="flex items-start gap-2">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{q.number}</span>
                          <div className="min-w-0 flex-1 space-y-1.5">
                            {q.prompt && <p className="text-sm font-medium">{q.prompt}</p>}
                            <div className="flex flex-wrap items-center gap-2">
                              <Input
                                value={q.answer}
                                onChange={(e) => updateListeningQ(q.number, { answer: e.target.value })}
                                className="h-8 w-32 font-mono text-sm font-semibold"
                                placeholder="Đáp án"
                              />
                              <span className="text-xs text-muted-foreground">→ {c.correctAnswer} · {typeLabel(c.type)}</span>
                            </div>
                            {q.explanation && (
                              <p className="text-xs leading-relaxed text-muted-foreground">{q.explanation}</p>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {/* Native READING preview: SPLIT INTO PARTS (one card per passage) */}
          {aiReading && (
            <Card className="border-leaf/40">
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-leaf" />
                    <h3 className="font-bold">
                      AI đã tách {aiReading.parts.length} bài đọc ·{" "}
                      {aiReading.parts.reduce((n, p) => n + p.questions.length, 0)} câu
                    </h3>
                  </div>
                  <div className="flex gap-1.5">
                    <Button onClick={generateKey} disabled={generating} variant="outline" size="sm" className="rounded-lg">
                      {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Tạo lại
                    </Button>
                    <Button onClick={() => { setAiReading(null); setAiNotes(""); }} variant="ghost" size="sm" className="rounded-lg text-muted-foreground">
                      <Trash2 className="h-3.5 w-3.5" /> Xoá
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Mỗi bài đọc là một <strong>Part</strong> riêng — học sinh làm lần lượt trong giao diện Reading{" "}
                  <strong>giống hệt phần luyện tập</strong> (đọc trái, câu hỏi phải). Có thể{" "}
                  <strong>sửa lại bài đọc / câu hỏi / đáp án / lời giải</strong> nếu AI làm chưa chuẩn — gõ trực tiếp vào ô.
                </p>
                {aiNotes && (
                  <p className="rounded-lg border border-amber-300 bg-amber-50/70 p-2.5 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                    ⚠️ Lưu ý từ AI: {aiNotes}
                  </p>
                )}
                {aiReading.parts.some((p) => p.questions.length === 0) && (
                  <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-xs font-semibold text-destructive">
                    ⚠️ Có bài đọc chưa có câu hỏi. Bấm <strong>Tạo lại</strong> để AI làm lại, hoặc kiểm tra file — không giao được khi còn bài trống.
                  </p>
                )}

                {aiReading.parts.map((part, pi) => (
                  <div key={pi} className="space-y-3 rounded-xl border-2 border-leaf/30 bg-leaf/5 p-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-leaf px-2.5 py-0.5 text-xs font-extrabold text-white">Part {pi + 1}</span>
                      <Input
                        value={part.title}
                        onChange={(e) => setAiReading((r) => (r ? { parts: r.parts.map((p, i) => (i === pi ? { ...p, title: e.target.value } : p)) } : r))}
                        className="h-8 flex-1 text-sm font-bold"
                        placeholder="Tiêu đề bài đọc"
                      />
                      {part.questions.length > 0 ? (
                        <span className="shrink-0 text-xs text-muted-foreground">{part.questions.length} câu</span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">
                          ⚠ chưa có câu hỏi
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeReadingPart(pi)}
                        title="Xoá bài đọc này"
                        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <details className="rounded-lg border bg-muted/20 p-3">
                      <summary className="cursor-pointer text-sm font-semibold">Xem bài đọc ({part.passage.length.toLocaleString()} ký tự)</summary>
                      <Textarea
                        value={part.passage}
                        onChange={(e) => updateReadingPassage(pi, e.target.value)}
                        rows={8}
                        className="mt-2 text-sm"
                      />
                    </details>

                    {part.figures.length > 0 && (
                      <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                        <p className="text-sm font-semibold">AI đã vẽ lại {part.figures.length} sơ đồ/bản đồ (SVG) — kiểm tra xem có giống đề không:</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {part.figures.map((f, i) => (
                            <div key={i} className="rounded-lg border bg-card p-2">
                              {f.caption && <p className="mb-1 text-xs font-medium text-muted-foreground">{f.caption}</p>}
                              <div
                                className="overflow-x-auto text-foreground [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
                                dangerouslySetInnerHTML={{ __html: f.svg }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <ul className="space-y-2.5">
                      {part.questions.map((q) => (
                        <li key={q.number} className="rounded-lg border bg-muted/20 p-3">
                          <div className="flex items-start gap-2">
                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{q.number}</span>
                            <div className="min-w-0 flex-1 space-y-1.5">
                              <Input
                                value={q.prompt}
                                onChange={(e) => updateReadingQ(pi, q.number, { prompt: e.target.value })}
                                className="h-8 text-sm font-medium"
                                placeholder="Câu hỏi"
                              />
                              {q.options && q.options.length > 0 && (
                                <p className="text-xs text-muted-foreground">Lựa chọn: {q.options.join(" · ")}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold text-leaf">Đáp án:</span>
                                <Input
                                  value={q.answer}
                                  onChange={(e) => updateReadingQ(pi, q.number, { answer: e.target.value })}
                                  className="h-8 w-40 text-sm font-semibold"
                                  placeholder="Đáp án đúng"
                                />
                                <span className="text-xs text-muted-foreground">{q.type}</span>
                              </div>
                              <Textarea
                                value={q.explanation}
                                onChange={(e) => updateReadingQ(pi, q.number, { explanation: e.target.value })}
                                rows={2}
                                className="text-xs"
                                placeholder="Lời giải (tuỳ chọn)"
                              />
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Manual fallback — for scanned PDFs or fixing the AI's key */}
          {(showManual || (!aiQuestions && !aiReading && answerKey.trim().length > 0)) && (
            <Card><CardContent className="space-y-3 p-5">
              <div className="space-y-1.5">
                <Label htmlFor="key">Nhập đáp án thủ công</Label>
                <Textarea id="key" value={answerKey} onChange={(e) => setAnswerKey(e.target.value)} rows={5} placeholder="1A, 2B, 3C, 4 TRUE, 5 government…" className="font-mono text-sm" />
                <p className="text-xs text-muted-foreground">Ngăn cách bằng dấu phẩy hoặc xuống dòng. A–D = trắc nghiệm; TRUE/FALSE/NOT GIVEN; còn lại = điền từ (dùng “/” cho nhiều đáp án). Dùng khi PDF là ảnh scan hoặc muốn sửa đáp án AI.</p>
              </div>
              {answerKey.trim() && (
                <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                  <div className="text-sm font-semibold">Đã nhận diện {parsed.answers.length} câu</div>
                  <div className="flex flex-wrap gap-1.5">
                    {parsed.answers.map((a) => (
                      <Badge key={a.n} variant="outline" className="font-normal">
                        <span className="font-semibold">{a.n}.</span> {a.correctAnswer}
                        <span className="ml-1 text-muted-foreground">· {typeLabel(a.type)}</span>
                      </Badge>
                    ))}
                  </div>
                  {parsed.errors.length > 0 && (
                    <ul className="mt-1 list-disc pl-5 text-xs text-destructive">
                      {parsed.errors.map((err, i) => (<li key={i}>{err}</li>))}
                    </ul>
                  )}
                </div>
              )}
            </CardContent></Card>
          )}
        </>
      )}

      {skill === "WRITING" && (
        <Card><CardContent className="space-y-4 p-5">
          <div className="space-y-1.5">
            <Label>Loại bài</Label>
            <div className="flex gap-2">
              {[1, 2].map((t) => (
                <button key={t} type="button" onClick={() => setWTaskType(t as 1 | 2)}
                  className={cn("flex-1 rounded-lg border p-2.5 text-sm font-medium", wTaskType === t ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent")}>
                  Task {t} {t === 1 ? "(150 từ)" : "(250 từ)"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wprompt">Đề bài</Label>
            <Textarea id="wprompt" value={wPrompt} onChange={(e) => setWPrompt(e.target.value)} rows={5} placeholder="Dán đề Writing tại đây…" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="wmin">Số từ tối thiểu</Label>
              <Input id="wmin" type="number" min={50} value={wMinWords} onChange={(e) => setWMinWords(e.target.value)} />
            </div>
          </div>
          {wTaskType === 1 && (
            <PaperFileField kind="image" label="Ảnh biểu đồ (Task 1 — tuỳ chọn)" value={wImageUrl} onChange={setWImageUrl} maxBytes={IMG_MAX} />
          )}
        </CardContent></Card>
      )}

      {skill === "SPEAKING" && (
        <Card><CardContent className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Part</Label>
              <div className="flex gap-2">
                {[1, 2, 3].map((pt) => (
                  <button key={pt} type="button" onClick={() => setSPart(pt as 1 | 2 | 3)}
                    className={cn("flex-1 rounded-lg border p-2 text-sm font-medium", sPart === pt ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent")}>
                    Part {pt}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stopic">Chủ đề (tuỳ chọn)</Label>
              <Input id="stopic" value={sTopic} onChange={(e) => setSTopic(e.target.value)} placeholder="VD: Hometown" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="squestions">Câu hỏi (mỗi dòng 1 câu)</Label>
            <Textarea id="squestions" value={sQuestions} onChange={(e) => setSQuestions(e.target.value)} rows={5}
              placeholder={"Where are you from?\nDo you like your hometown?\nWhat is there to do in your area?"} />
            <p className="text-xs text-muted-foreground">Học sinh sẽ ghi âm trả lời từng câu; AI chấm 4 tiêu chí IELTS.</p>
          </div>
        </CardContent></Card>
      )}

      <div className="flex justify-end">
        <Button onClick={submit} disabled={submitting} variant="brand" className="rounded-full min-w-[180px]">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Lưu &amp; Giao bài</>}
        </Button>
      </div>
    </div>
  );
}
