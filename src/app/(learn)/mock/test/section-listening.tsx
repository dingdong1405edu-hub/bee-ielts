"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Headphones, Play, Lock, CheckCircle2 } from "lucide-react";
import { formatDuration, cn } from "@/lib/utils";
import { speakText, stopSpeaking, isTTSSupported } from "@/lib/tts";
import { FormBlanks, TableBlanks, groupQuestions } from "@/components/learn/form-blanks";

const REVIEW_SECONDS = 10 * 60;

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
 * Mock Listening — real IELTS flow:
 *   1. Sections 1→4 are played ONE AT A TIME. Each section's audio can only
 *      be played a single time (no rewind, no replay). The candidate writes
 *      answers while listening; clicks "Sang Section X →" to advance.
 *   2. After Section 4, the candidate enters a 10-minute REVIEW phase. All
 *      4 sections' questions are visible in one scroll for final touches.
 *      Audio is permanently locked. A 10-minute countdown auto-submits.
 * `timeLimit` from the caller is ignored — the real flow drives timing.
 */
export function MockListening({
  sections,
  onDone,
}: {
  sections: Section[];
  /** Kept for backward compat with MockRunner; not used. */
  timeLimit?: number;
  onDone: (answers: Record<string, string>) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeIdx, setActiveIdx] = useState(0);
  const [phase, setPhase] = useState<"playing" | "reviewing">("playing");
  const [playedIds, setPlayedIds] = useState<Set<string>>(new Set());
  const [reviewLeft, setReviewLeft] = useState(REVIEW_SECONDS);

  // 10-min review countdown only — no global timer during playback.
  useEffect(() => {
    if (phase !== "reviewing") return;
    const t = setInterval(() => {
      setReviewLeft((r) => {
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
  }, [phase]);

  // Continuous numbering across the 4 sections (Q1–40 in a real IELTS).
  const sectionOffsets: number[] = [];
  {
    let off = 1;
    for (const s of sections) {
      sectionOffsets.push(off);
      off += s.questions.length;
    }
  }

  const totalQuestions = sections.reduce((n, s) => n + s.questions.length, 0);
  const onChange = (qId: string, value: string) =>
    setAnswers((a) => ({ ...a, [qId]: value }));
  const markPlayed = (id: string) =>
    setPlayedIds((s) => {
      if (s.has(id)) return s;
      const next = new Set(s);
      next.add(id);
      return next;
    });

  if (phase === "reviewing") {
    const totalAnswered = sections
      .flatMap((s) => s.questions)
      .filter((q) => (answers[q.id] || "").trim()).length;
    return (
      <div data-mock-pane className="max-w-3xl mx-auto space-y-4">
        <div className="rounded-2xl border bg-emerald-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6" />
            <div>
              <div className="text-xs uppercase tracking-wider opacity-80">Kiểm tra đáp án · Listening</div>
              <div className="font-extrabold">10 phút cuối — không thể nghe lại audio</div>
            </div>
          </div>
          <Badge variant="outline" className="bg-white/15 border-white/30 text-white text-base px-3 py-1">
            <Clock className="h-4 w-4 mr-1" /> {formatDuration(reviewLeft)}
          </Badge>
        </div>

        {sections.map((s, i) => (
          <SectionBlock
            key={s.id}
            section={s}
            startNum={sectionOffsets[i]}
            answers={answers}
            onChange={onChange}
            played
            onPlayed={() => {}}
            reviewing
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

  // —— Section playback phase ——
  const currentSection = sections[activeIdx];
  const currentAnswered = currentSection.questions.filter(
    (q) => (answers[q.id] || "").trim(),
  ).length;
  const isLast = activeIdx === sections.length - 1;
  const currentPlayed = playedIds.has(currentSection.id);

  const goNext = () => {
    if (isLast) {
      setPhase("reviewing");
    } else {
      setActiveIdx((i) => i + 1);
    }
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div data-mock-pane className="max-w-3xl mx-auto space-y-4">
      <div className="rounded-2xl border bg-amber-500 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Headphones className="h-6 w-6" />
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">
              Section {activeIdx + 1}/{sections.length} · Listening
            </div>
            <div className="font-extrabold">
              {totalQuestions} câu · Câu {sectionOffsets[activeIdx]}–
              {sectionOffsets[activeIdx] + currentSection.questions.length - 1}
            </div>
          </div>
        </div>
        <Badge variant="outline" className="bg-white/15 border-white/30 text-white text-xs px-3 py-1">
          <Lock className="h-3.5 w-3.5 mr-1" /> Audio 1 lần duy nhất
        </Badge>
      </div>

      {/* Section progress dots — visible only, not clickable (forward-only). */}
      <div className="flex items-center justify-center gap-1.5">
        {sections.map((s, i) => (
          <div
            key={s.id}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i < activeIdx ? "w-6 bg-amber-500" : i === activeIdx ? "w-10 bg-amber-600" : "w-6 bg-muted",
            )}
            aria-label={`Section ${i + 1}`}
          />
        ))}
      </div>

      <SectionBlock
        key={currentSection.id}
        section={currentSection}
        startNum={sectionOffsets[activeIdx]}
        answers={answers}
        onChange={onChange}
        played={currentPlayed}
        onPlayed={() => markPlayed(currentSection.id)}
        reviewing={false}
      />

      <div className="rounded-2xl border bg-card p-4 flex items-center justify-between gap-3 sticky bottom-3 shadow-lg">
        <div className="text-sm">
          Section này: <strong>{currentAnswered}/{currentSection.questions.length}</strong>
        </div>
        <Button onClick={goNext} variant="brand" size="lg" className="rounded-full">
          {isLast ? "Sang kiểm tra (10:00) →" : `Sang Section ${activeIdx + 2} →`}
        </Button>
      </div>
    </div>
  );
}

/**
 * One of the 4 listening sections — own audio + own question list.
 * `played` is owned by the parent so the lock survives any local re-render
 * (e.g. when entering review). `reviewing` hides the audio control entirely.
 */
function SectionBlock({
  section,
  startNum,
  answers,
  onChange,
  played,
  onPlayed,
  reviewing,
}: {
  section: Section;
  startNum: number;
  answers: Record<string, string>;
  onChange: (qId: string, value: string) => void;
  played: boolean;
  onPlayed: () => void;
  reviewing: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasRealAudio = section.audioUrl && !section.audioUrl.startsWith("/audio/sample");
  const locked = played; // already played → no replay

  const startRealAudio = async () => {
    if (!audioRef.current || locked || playing) return;
    try {
      setPlaying(true);
      await audioRef.current.play();
    } catch {
      setPlaying(false);
    }
  };

  const startTts = async () => {
    if (!section.transcript || locked || playing) return;
    if (!isTTSSupported()) {
      alert("Browser không hỗ trợ TTS. Dùng Chrome desktop nhé.");
      return;
    }
    setPlaying(true);
    try {
      await speakText(section.transcript, { rate: 0.9 });
    } finally {
      setPlaying(false);
      onPlayed();
    }
  };

  // If we unmount mid-playback (e.g. user navigates away), stop TTS cleanly.
  useEffect(() => () => stopSpeaking(), []);

  // Auto-play the moment this section mounts so the candidate doesn't have to
  // click "Phát audio" every time they advance to the next section. The user
  // gesture from "Sang Section X →" carries through, so browsers allow it.
  // Skips when already played (review phase remount) or in review mode.
  useEffect(() => {
    if (reviewing || locked) return;
    if (hasRealAudio) {
      // Defer so the <audio> element is mounted before we ask it to play.
      const t = setTimeout(() => {
        if (!audioRef.current) return;
        audioRef.current.play().then(() => setPlaying(true)).catch(() => {
          // Autoplay blocked — leave the "Phát audio" button visible so user can click.
        });
      }, 50);
      return () => clearTimeout(t);
    }
    // TTS fallback: only start if browser supports it; ignore errors.
    if (section.transcript && isTTSSupported()) {
      const t = setTimeout(() => {
        setPlaying(true);
        speakText(section.transcript ?? "", { rate: 0.9 })
          .catch(() => {})
          .finally(() => {
            setPlaying(false);
            onPlayed();
          });
      }, 50);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          {/* Audio control — strictly play-once. Hidden during review. */}
          {!reviewing && (
            <div className="rounded-xl border p-4 bg-muted/30">
              {hasRealAudio && (
                <audio
                  ref={audioRef}
                  src={section.audioUrl}
                  onEnded={() => {
                    setPlaying(false);
                    onPlayed();
                  }}
                  // No `controls` — candidate cannot seek back, pause, or replay.
                  className="hidden"
                />
              )}
              {locked ? (
                <div className="flex items-center justify-center gap-2 text-sm font-bold text-muted-foreground py-2">
                  <Lock className="h-4 w-4" /> Đã nghe xong — không thể nghe lại
                </div>
              ) : playing ? (
                <Button disabled variant="outline" size="lg" className="w-full">
                  <Play className="h-4 w-4" /> Đang phát… (không thể dừng)
                </Button>
              ) : (
                <Button
                  onClick={hasRealAudio ? startRealAudio : startTts}
                  variant="brand"
                  size="lg"
                  className="w-full"
                >
                  <Play className="h-4 w-4" /> Phát audio (1 lần duy nhất)
                </Button>
              )}
              {!hasRealAudio && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  ⚠️ Mock test — Audio dùng giọng AI.
                </p>
              )}
            </div>
          )}
          {reviewing && (
            <div className="rounded-xl border bg-muted/40 p-3 flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground">
              <Lock className="h-3.5 w-3.5" /> Đã khoá audio — đang trong 10 phút kiểm tra
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
                {q.type === "MATCHING_HEADINGS" || q.type === "MATCHING" ? (
                  <MockHeadingPicker
                    options={q.options ?? []}
                    value={userAns}
                    onChange={(v) => onChange(q.id, v)}
                    label={q.type === "MATCHING" ? "Danh sách câu nối" : "Danh sách Heading"}
                    placeholder={q.type === "MATCHING" ? "— Chọn A/B/C/… —" : "— Chọn heading —"}
                  />
                ) : q.options ? (
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

/**
 * Mock-listening Matching Headings answer UI: reference list of headings + a
 * dropdown whose value is the roman numeral (matches the admin's stored key).
 */
function MockHeadingPicker({
  options,
  value,
  onChange,
  label = "Danh sách Heading",
  placeholder = "— Chọn heading —",
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
}) {
  // Accept both roman ("i. text") and letter ("A. text") prefixes.
  const items = options.map((opt) => {
    const m = opt.match(/^([A-Z]|[ivxIVX]+)\.\s*(.*)$/);
    if (!m) return { key: opt, label: opt };
    const raw = m[1];
    const isLetter = /^[A-Z]$/.test(raw);
    return { key: isLetter ? raw : raw.toLowerCase(), label: m[2] };
  });
  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-muted/30 px-3 py-2">
        <div className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1">
          {label}
        </div>
        <ul className="space-y-0.5 text-sm leading-relaxed">
          {items.map((it) => (
            <li key={it.key}>
              <span className="font-bold mr-1">{it.key}.</span> {it.label}
            </li>
          ))}
        </ul>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border-2 bg-background px-3 text-sm font-bold"
      >
        <option value="">{placeholder}</option>
        {items.map((it) => (
          <option key={it.key} value={it.key}>
            {it.key}. {it.label}
          </option>
        ))}
      </select>
    </div>
  );
}
