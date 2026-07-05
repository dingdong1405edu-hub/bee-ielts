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
import { ArrowLeft, BookOpen, CheckCircle2, Clock, Headphones, Loader2, Mic, PenLine, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { parseAnswerKey, toCustomQuestions, typeLabel } from "@/lib/answer-key";
import { PaperFileField } from "@/components/teacher/paper-file-field";
import { playPopSfx } from "@/lib/quiz-sfx";

const PDF_MAX = 8 * 1024 * 1024;
const AUDIO_MAX = 15 * 1024 * 1024;
const IMG_MAX = 5 * 1024 * 1024;

type Skill = "READING" | "LISTENING" | "WRITING" | "SPEAKING";

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

  // Reading / Listening
  const [pdfUrl, setPdfUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [answerKey, setAnswerKey] = useState("");
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

  const submit = async () => {
    if (!classId) return toast.error("Chọn lớp");
    if (!title.trim()) return toast.error("Nhập tiêu đề bài tập");

    const dur = parseInt(durationMin, 10);
    const config: Record<string, unknown> = {};
    if (Number.isFinite(dur) && dur > 0) config.durationMin = dur;
    if (antiCheat) config.antiCheat = true;

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
      if (parsed.answers.length === 0) return toast.error("Nhập đáp án (ví dụ: 1A, 2B, 3C)");
      config.paper = { skill, pdfUrl: pdfUrl.trim(), audioUrl: skill === "LISTENING" ? audioUrl.trim() : undefined };
      body.custom_questions = toCustomQuestions(parsed.answers);
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
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" checked={antiCheat} onChange={(e) => setAntiCheat(e.target.checked)} className="h-4 w-4" />
              Giám sát chống gian lận (ghi lại khi chuyển tab)
            </label>
          </div>
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

          <Card><CardContent className="space-y-3 p-5">
            <div className="space-y-1.5">
              <Label htmlFor="key">Đáp án</Label>
              <Textarea id="key" value={answerKey} onChange={(e) => setAnswerKey(e.target.value)} rows={5} placeholder="1A, 2B, 3C, 4 TRUE, 5 government…" className="font-mono text-sm" />
              <p className="text-xs text-muted-foreground">Ngăn cách bằng dấu phẩy hoặc xuống dòng. A–D = trắc nghiệm; TRUE/FALSE/NOT GIVEN; còn lại = điền từ (dùng “/” cho nhiều đáp án).</p>
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
