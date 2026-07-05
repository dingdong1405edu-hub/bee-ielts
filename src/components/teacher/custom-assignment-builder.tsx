"use client";

/**
 * CustomAssignmentBuilder — MVP "paper-based" assignment creator for teachers.
 *
 * The teacher uploads a PDF (đề bài) + optional MP3 (nghe) and types the answer
 * key as free text ("1A, 2B, 3C…"). We parse the key into custom_questions and
 * POST everything to /api/assignments, which inserts the questions (owned by
 * this teacher) and links them to a new assignment. Files are stored as base64
 * data URLs in assignment.config.paper — no upload service needed yet.
 *
 * (A richer per-question form builder comes later; this is the fast first cut.)
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookOpen, CheckCircle2, Headphones, Loader2, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { parseAnswerKey, toCustomQuestions, typeLabel } from "@/lib/answer-key";
import { PaperFileField } from "@/components/teacher/paper-file-field";

const PDF_MAX = 8 * 1024 * 1024;
const AUDIO_MAX = 15 * 1024 * 1024;

type Skill = "READING" | "LISTENING";

export function CustomAssignmentBuilder({
  classes,
}: {
  classes: { id: string; name: string }[];
}) {
  const router = useRouter();

  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [skill, setSkill] = useState<Skill>("READING");
  const [deadline, setDeadline] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [antiCheat, setAntiCheat] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [answerKey, setAnswerKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const parsed = useMemo(() => parseAnswerKey(answerKey), [answerKey]);

  if (classes.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-2">
          <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="text-lg font-bold">Bạn chưa có lớp nào</h2>
          <p className="text-sm text-muted-foreground">
            Hãy tạo một lớp học trước khi giao bài tập.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (createdId) {
    return (
      <Card className="mx-auto max-w-lg bg-accent">
        <CardContent className="p-8 text-center space-y-3">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
          <h2 className="text-xl font-extrabold">Đã tạo & giao bài!</h2>
          <p className="text-sm text-muted-foreground">
            Bài tập đã được giao cho lớp. Học sinh sẽ thấy nó trong danh sách bài tập.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <Button onClick={() => router.push(`/exam/${createdId}`)} variant="outline">
              Xem trước đề
            </Button>
            <Button
              variant="brand"
              onClick={() => {
                setCreatedId(null);
                setTitle("");
                setPdfUrl("");
                setAudioUrl("");
                setAnswerKey("");
              }}
            >
              Tạo bài khác
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const submit = async () => {
    if (!title.trim()) return toast.error("Nhập tiêu đề bài tập");
    if (!classId) return toast.error("Chọn lớp");
    if (!pdfUrl.trim()) return toast.error("Tải lên file PDF đề bài");
    if (skill === "LISTENING" && !audioUrl.trim())
      return toast.error("Bài Listening cần file âm thanh");
    if (parsed.answers.length === 0) return toast.error("Nhập đáp án (ví dụ: 1A, 2B, 3C)");

    const config: Record<string, unknown> = {
      paper: {
        skill,
        pdfUrl: pdfUrl.trim(),
        audioUrl: skill === "LISTENING" ? audioUrl.trim() : undefined,
      },
    };
    const dur = parseInt(durationMin, 10);
    if (Number.isFinite(dur) && dur > 0) config.durationMin = dur;
    if (antiCheat) config.antiCheat = true;

    const body = {
      classId,
      title: title.trim(),
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
      config,
      custom_questions: toCustomQuestions(parsed.answers),
    };

    setSubmitting(true);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tạo được bài tập");
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
      <header>
        <h1 className="text-2xl font-bold">Giao bài tập mới</h1>
        <p className="text-sm text-muted-foreground">
          Tải đề (PDF) + file nghe rồi gõ đáp án — hệ thống tự chấm cho học sinh.
        </p>
      </header>

      {/* Thông tin chung */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cls">Lớp</Label>
              <select
                id="cls"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">Tiêu đề</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Reading Test 1 — Unit 3"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Kỹ năng</Label>
            <div className="flex gap-2">
              {(["READING", "LISTENING"] as Skill[]).map((s) => {
                const Icon = s === "READING" ? BookOpen : Headphones;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSkill(s)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-lg border p-2.5 text-sm font-medium transition-colors",
                      skill === s ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {s === "READING" ? "Reading" : "Listening"}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="deadline">Hạn nộp (tuỳ chọn)</Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dur">Thời gian làm bài — phút (tuỳ chọn)</Label>
              <Input
                id="dur"
                type="number"
                min={1}
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                placeholder="VD: 60"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={antiCheat}
              onChange={(e) => setAntiCheat(e.target.checked)}
              className="h-4 w-4"
            />
            Bật giám sát chống gian lận (ghi lại khi học sinh chuyển tab)
          </label>
        </CardContent>
      </Card>

      {/* Tài liệu */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <PaperFileField
            kind="pdf"
            label="File đề bài (PDF)"
            value={pdfUrl}
            onChange={setPdfUrl}
            maxBytes={PDF_MAX}
          />
          {skill === "LISTENING" && (
            <PaperFileField
              kind="audio"
              label="File nghe (MP3)"
              value={audioUrl}
              onChange={setAudioUrl}
              maxBytes={AUDIO_MAX}
            />
          )}
        </CardContent>
      </Card>

      {/* Đáp án */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="key">Đáp án</Label>
            <Textarea
              id="key"
              value={answerKey}
              onChange={(e) => setAnswerKey(e.target.value)}
              rows={5}
              placeholder="1A, 2B, 3C, 4 TRUE, 5 government…"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Ngăn cách bằng dấu phẩy hoặc xuống dòng. Chữ cái A–D = trắc nghiệm;
              TRUE/FALSE/NOT GIVEN = đúng/sai; còn lại = điền từ (dùng “/” cho nhiều
              đáp án đúng, VD <span className="font-mono">6 car/automobile</span>).
            </p>
          </div>

          {/* Preview parse */}
          {answerKey.trim() && (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
              <div className="text-sm font-semibold">
                Đã nhận diện {parsed.answers.length} câu
              </div>
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
                  {parsed.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={submitting} variant="brand" className="rounded-full min-w-[180px]">
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Send className="h-4 w-4" /> Lưu &amp; Giao bài
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
