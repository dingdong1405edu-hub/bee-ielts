"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Video, Plus, Loader2, Trash2, Youtube, ExternalLink, Sparkles, ChevronDown, Wand2, Pencil, Scissors, Crown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MAX_AUDIO_FALLBACK_SEC } from "@/lib/shadowing-constants";
import { PRACTICE_LEVELS, LEVEL_DESC, LEVEL_BADGE_CLASS } from "@/lib/cefr";

export interface LessonRow {
  id: string;
  title: string;
  source: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | null;
  premium: boolean;
  youtubeId: string;
  thumbnailUrl: string | null;
  segmentCount: number;
  createdAt: string;
}

interface SegmentDraft {
  startSec: string;
  endSec: string;
  textEn: string;
  textVi: string;
  ipa: string;
}

function blank(): SegmentDraft {
  return { startSec: "", endSec: "", textEn: "", textVi: "", ipa: "" };
}

/** Try to parse "1:23.4" or "83.4" formats into seconds. */
function parseTime(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  if (s.includes(":")) {
    const [m, sec] = s.split(":");
    const mm = parseInt(m, 10);
    const ss = parseFloat(sec);
    if (!Number.isFinite(mm) || !Number.isFinite(ss)) return null;
    return mm * 60 + ss;
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export function ShadowingAdminClient({ initial }: { initial: LessonRow[] }) {
  const router = useRouter();
  const [lessons, setLessons] = useState<LessonRow[]>(initial);

  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [segments, setSegments] = useState<SegmentDraft[]>([blank()]);
  const [bulkPaste, setBulkPaste] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [classifying, setClassifying] = useState(false);
  // AI auto-create
  const [aiTitle, setAiTitle] = useState("");
  const [aiSource, setAiSource] = useState("");
  const [aiUrl, setAiUrl] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiStep, setAiStep] = useState<string>("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // CEFR difficulty for the lesson being created. "" = để AI tự đoán.
  const [level, setLevel] = useState<"" | "B1" | "B2" | "C1" | "C2">("");
  // Allow the route to fall back to audio transcription (Deepgram + Groq
  // Whisper) when YouTube has no English captions. Default ON because
  // most admins want it; toggle off if they only want free caption-based
  // lessons for cost control.
  const [allowAudioFallback, setAllowAudioFallback] = useState(true);
  // Hard double-click guard: aiBusy state is reactive (re-renders after a
  // tick) so a fast double-click can fire the second click before the
  // disabled prop wins. A ref read inside the handler is synchronous and
  // blocks the second request before it ever leaves the browser.
  const aiInFlightRef = useRef(false);

  // "Paste transcript" path — the reliable fallback when YouTube blocks the
  // server IP. Admin copies the transcript from YouTube's own "Show
  // transcript" panel (works in their logged-in browser) and the server adds
  // segmentation + Vietnamese + IPA without ever fetching YouTube content.
  const [tsUrl, setTsUrl] = useState("");
  const [tsTitle, setTsTitle] = useState("");
  const [tsSource, setTsSource] = useState("");
  const [tsText, setTsText] = useState("");
  const [tsBusy, setTsBusy] = useState(false);
  const tsInFlightRef = useRef(false);

  const createFromTranscript = async () => {
    if (tsInFlightRef.current) return;
    if (!tsUrl.trim()) return toast.error("Dán URL YouTube");
    if (tsText.trim().length < 20)
      return toast.error("Dán transcript (mốc thời gian + câu) vào ô bên dưới");
    tsInFlightRef.current = true;
    setTsBusy(true);
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), 600_000);
    try {
      const res = await fetch("/api/admin/shadowing/from-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtubeUrl: tsUrl.trim(),
          transcript: tsText,
          title: tsTitle.trim(),
          source: tsSource.trim(),
          level: level || undefined,
        }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Tạo bài thất bại");
        return;
      }
      toast.success(
        `Đã tạo bài (${data.segmentCount} đoạn · AI dịch ${data.enriched}). Đang mở...`,
      );
      setTsUrl("");
      setTsTitle("");
      setTsSource("");
      setTsText("");
      window.location.href = `/shadowing/${data.id}`;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        toast.error("Quá 10 phút không phản hồi — mở /admin/shadowing để kiểm tra bài mới.");
      } else {
        toast.error(e instanceof Error ? e.message : "Lỗi");
      }
    } finally {
      clearTimeout(abortTimer);
      tsInFlightRef.current = false;
      setTsBusy(false);
    }
  };

  const createWithAI = async () => {
    if (aiInFlightRef.current) return; // hard guard against double-click
    // title + source are optional — the server auto-fills them from the
    // YouTube metadata if blank. Only the URL is strictly required.
    if (!aiUrl.trim()) return toast.error("Dán URL YouTube");
    aiInFlightRef.current = true;
    setAiBusy(true);
    setAiStep("Đang lấy phụ đề từ YouTube...");
    // 10-minute browser-side abort. Matches the server route's
    // maxDuration=600 so the user gets a clear error instead of a
    // browser-default "no response" hang on very long videos.
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), 600_000);
    try {
      // We can't truly stream backend progress without SSE, but flip the
      // step message based on elapsed time so admin sees the phase shift.
      const stepTimers = [
        setTimeout(() => {
          if (allowAudioFallback)
            setAiStep(
              "Phụ đề không có → AI nghe video... (chỉ chạy nếu cần, ~30-60s)",
            );
          else
            setAiStep("Đang dịch + tạo IPA bằng AI... (có thể mất 1-2 phút)");
        }, 8000),
        setTimeout(() => {
          setAiStep("Đang dịch + tạo IPA bằng AI... (có thể mất 1-2 phút)");
        }, 45000),
      ];
      const res = await fetch("/api/admin/shadowing/from-youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: aiTitle.trim(),
          source: aiSource.trim(),
          youtubeUrl: aiUrl.trim(),
          allowAudioFallback,
          level: level || undefined,
        }),
        signal: controller.signal,
      });
      stepTimers.forEach(clearTimeout);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Tạo bài thất bại");
        if (res.status === 422) setAdvancedOpen(true);
        return;
      }
      const methodLabel =
        data.method === "audio"
          ? `AI nghe (${data.sttSource ?? "?"})`
          : "phụ đề YT";
      toast.success(
        `Đã tạo bài (${data.segmentCount} đoạn · nguồn: ${methodLabel} · AI dịch ${data.enriched}). Đang mở...`,
      );
      setAiTitle("");
      setAiSource("");
      setAiUrl("");
      window.location.href = `/shadowing/${data.id}`;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        toast.error(
          "Quá 10 phút không có phản hồi — server có thể đang xử lý. Mở /admin/shadowing để kiểm tra bài mới.",
        );
      } else {
        toast.error(e instanceof Error ? e.message : "Lỗi");
      }
    } finally {
      clearTimeout(abortTimer);
      aiInFlightRef.current = false;
      setAiBusy(false);
      setAiStep("");
    }
  };

  /** Quick parse for VTT-style or "start end text" lines.
   *  Accepted: "0:00 0:05 Hello world" / "0 5 Hello world" / VTT cues. */
  const importBulk = () => {
    const text = bulkPaste.trim();
    if (!text) return;
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const drafts: SegmentDraft[] = [];

    // Detect VTT-style: "MM:SS.mmm --> MM:SS.mmm" followed by text lines.
    if (/-->/m.test(text)) {
      let i = 0;
      while (i < lines.length) {
        const cue = lines[i].match(/(\d+:\d+(?:\.\d+)?)\s*-->\s*(\d+:\d+(?:\.\d+)?)/);
        if (cue) {
          const start = parseTime(cue[1]);
          const end = parseTime(cue[2]);
          i++;
          const textParts: string[] = [];
          while (i < lines.length && !/-->/.test(lines[i])) {
            textParts.push(lines[i]);
            i++;
          }
          if (start != null && end != null && textParts.join(" ").trim()) {
            drafts.push({
              startSec: String(start),
              endSec: String(end),
              textEn: textParts.join(" ").trim(),
              textVi: "",
              ipa: "",
            });
          }
        } else {
          i++;
        }
      }
    } else {
      // Space-separated quick form per line.
      for (const ln of lines) {
        const m = ln.match(/^(\S+)\s+(\S+)\s+(.+)$/);
        if (!m) continue;
        const start = parseTime(m[1]);
        const end = parseTime(m[2]);
        if (start == null || end == null) continue;
        drafts.push({
          startSec: String(start),
          endSec: String(end),
          textEn: m[3].trim(),
          textVi: "",
          ipa: "",
        });
      }
    }
    if (drafts.length === 0) {
      toast.error("Không parse được — kiểm tra format");
      return;
    }
    setSegments(drafts);
    setBulkPaste("");
    toast.success(`Đã import ${drafts.length} đoạn`);
  };

  const create = async () => {
    if (!title.trim()) return toast.error("Nhập tiêu đề");
    if (!source.trim()) return toast.error("Nhập nguồn (VD: TED-Ed)");
    if (!youtubeUrl.trim()) return toast.error("Dán URL YouTube");
    const payload = segments
      .map((s) => ({
        startSec: parseTime(s.startSec),
        endSec: parseTime(s.endSec),
        textEn: s.textEn.trim(),
        textVi: s.textVi.trim() || null,
        ipa: s.ipa.trim() || null,
      }))
      .filter((s): s is { startSec: number; endSec: number; textEn: string; textVi: string | null; ipa: string | null } =>
        s.startSec != null && s.endSec != null && !!s.textEn,
      );
    if (payload.length === 0) {
      return toast.error("Cần ít nhất 1 đoạn hợp lệ (start, end, text)");
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/shadowing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          source: source.trim(),
          youtubeUrl: youtubeUrl.trim(),
          level: level || undefined,
          segments: payload,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Tạo bài thất bại");
      toast.success(`Đã tạo bài shadowing (${payload.length} đoạn)`);
      setTitle("");
      setSource("");
      setYoutubeUrl("");
      setSegments([blank()]);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setCreating(false);
    }
  };

  const remove = async (l: LessonRow) => {
    if (!confirm(`Xoá bài "${l.title}"?`)) return;
    setBusyId(l.id);
    try {
      const res = await fetch(`/api/admin/shadowing/${l.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Xoá thất bại");
      setLessons((prev) => prev.filter((x) => x.id !== l.id));
      toast.success("Đã xoá");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setBusyId(null);
    }
  };

  /** Set / clear the CEFR difficulty of an existing lesson inline. */
  const setLevelFor = async (
    l: LessonRow,
    next: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | null,
  ) => {
    // Optimistic update so the dropdown reflects the choice instantly.
    setLessons((prev) =>
      prev.map((x) => (x.id === l.id ? { ...x, level: next } : x)),
    );
    try {
      const res = await fetch(`/api/admin/shadowing/${l.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: next }),
      });
      if (!res.ok) throw new Error("Lưu độ khó thất bại");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
      setLessons((prev) =>
        prev.map((x) => (x.id === l.id ? { ...x, level: l.level } : x)),
      );
    }
  };

  /** Toggle premium-gate on a lesson — only Premium accounts can open it. */
  const setPremiumFor = async (l: LessonRow, next: boolean) => {
    setLessons((prev) => prev.map((x) => (x.id === l.id ? { ...x, premium: next } : x)));
    try {
      const res = await fetch(`/api/admin/shadowing/${l.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ premium: next }),
      });
      if (!res.ok) throw new Error();
      toast.success(next ? "Đã đặt chỉ Premium mới xem 👑" : "Đã mở cho tất cả");
    } catch {
      toast.error("Lưu thất bại");
      setLessons((prev) => prev.map((x) => (x.id === l.id ? { ...x, premium: l.premium } : x)));
    }
  };

  /** Re-divide an existing lesson's segments with the dialogue-aware
   *  splitter — fixes lessons where two characters' lines got glued into one
   *  segment. No YouTube fetch involved (works even while YT is blocking the
   *  server); IPA + Vietnamese are kept for any line that doesn't change. */
  const resegment = async (l: LessonRow) => {
    if (
      !confirm(
        `Chia lại câu cho "${l.title}" theo từng nhân vật?\n\nCâu của 2 người đang bị dính sẽ được tách ra. IPA + tiếng Việt của câu không đổi vẫn được giữ nguyên.`,
      )
    )
      return;
    setBusyId(l.id);
    try {
      const res = await fetch(`/api/admin/shadowing/${l.id}/resegment`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Chia lại thất bại");
      setLessons((prev) =>
        prev.map((x) => (x.id === l.id ? { ...x, segmentCount: data.after } : x)),
      );
      toast.success(
        `Đã chia lại: ${data.before} → ${data.after} đoạn` +
          (data.enriched ? ` (dịch mới ${data.enriched} đoạn)` : ""),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setBusyId(null);
    }
  };

  /** AI auto-classify CEFR level for every lesson that has none yet. Uses the
   *  stored segment text on the server — no YouTube fetch — so it works even
   *  while YouTube blocks the server. */
  const classifyLevels = async () => {
    setClassifying(true);
    try {
      const res = await fetch("/api/admin/shadowing/classify-levels", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Xếp loại thất bại");
      toast.success(
        `Đã tự xếp loại ${data.classified} bài` +
          (data.remaining ? ` · còn ${data.remaining} bài, bấm lại để tiếp` : ""),
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setClassifying(false);
    }
  };
  const noLevelCount = lessons.filter((l) => !l.level).length;

  const segmentDuration = useMemo(() => {
    return segments.reduce((sum, s) => {
      const a = parseTime(s.startSec);
      const b = parseTime(s.endSec);
      if (a == null || b == null) return sum;
      return sum + Math.max(0, b - a);
    }, 0);
  }, [segments]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <Video className="h-6 w-6 text-primary" /> Shadowing
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dán URL YouTube — AI tự lấy phụ đề, dịch tiếng Việt và sinh IPA cho từng câu.
        </p>
      </div>

      {/* AI auto-create — primary path */}
      <Card className="border-2 border-gold-400/60 bg-gradient-to-br from-gold-100 via-gold-50 to-rose-50 dark:from-gold-950/30 dark:via-gold-900/20 dark:to-rose-950/20">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-gold-500 to-rose-500 text-white shadow-md shrink-0">
              <Wand2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-extrabold flex items-center gap-2 text-lg">
                AI tạo bài tự động
                <span className="text-[10px] uppercase tracking-wider font-extrabold rounded-full bg-gold-500 text-gold-950 px-2 py-0.5">Mới</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Chỉ cần URL — AI lo phần phụ đề, dịch nghĩa và IPA cho mọi câu.
              </p>
            </div>
          </div>

          <div>
            <Label className="text-sm font-bold">
              URL YouTube <span className="text-rose-600">*</span>
            </Label>
            <Input
              value={aiUrl}
              onChange={(e) => setAiUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={aiBusy}
              className="text-base"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Dán URL là đủ — tiêu đề + nguồn tự lấy từ YouTube. Ưu tiên phụ đề
              EN có sẵn (miễn phí); nếu không có, AI tự nghe (xem checkbox dưới).
            </p>
          </div>

          <div>
            <Label className="text-sm font-bold">Độ khó (CEFR)</Label>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <button
                type="button"
                onClick={() => setLevel("")}
                disabled={aiBusy}
                className={`rounded-full px-3 py-1 text-xs font-extrabold border-2 transition-colors ${
                  level === ""
                    ? "border-foreground bg-foreground text-background"
                    : "border-muted bg-muted/40 text-muted-foreground hover:border-primary/40"
                }`}
              >
                Để AI tự đoán
              </button>
              {PRACTICE_LEVELS.map((lv) => (
                <button
                  key={lv}
                  type="button"
                  onClick={() => setLevel(lv)}
                  disabled={aiBusy}
                  title={LEVEL_DESC[lv]}
                  className={`rounded-full px-3 py-1 text-xs font-extrabold border-2 transition-colors ${
                    level === lv
                      ? `${LEVEL_BADGE_CLASS[lv]} border-transparent text-white`
                      : "border-muted bg-muted/40 text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {lv}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Chọn độ khó hoặc để AI tự xếp loại dựa trên transcript.
            </p>
          </div>

          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-bold">
              Tùy chọn: ghi đè tiêu đề / nguồn
            </summary>
            <div className="grid gap-3 sm:grid-cols-2 mt-2">
              <div>
                <Label className="text-xs">Tiêu đề (tự lấy nếu trống)</Label>
                <Input
                  value={aiTitle}
                  onChange={(e) => setAiTitle(e.target.value)}
                  placeholder="VD: TED-Ed — When I was a kid..."
                  disabled={aiBusy}
                />
              </div>
              <div>
                <Label className="text-xs">Nguồn / kênh (tự lấy nếu trống)</Label>
                <Input
                  value={aiSource}
                  onChange={(e) => setAiSource(e.target.value)}
                  placeholder="TED-Ed / BBC / Netflix..."
                  disabled={aiBusy}
                />
              </div>
            </div>
          </details>

          {/* Audio fallback toggle — when ON the route downloads the audio
              via youtubei.js and Deepgram transcribes it. Costs ~$0.05 per
              video so we surface it explicitly. */}
          <label
            className="flex items-start gap-3 rounded-xl border-2 border-gold-300 bg-white/60 dark:bg-card/40 p-3 cursor-pointer select-none"
          >
            <input
              type="checkbox"
              checked={allowAudioFallback}
              onChange={(e) => setAllowAudioFallback(e.target.checked)}
              disabled={aiBusy}
              className="mt-0.5 h-4 w-4 accent-gold-500"
            />
            <div className="flex-1">
              <p className="text-sm font-bold">
                Nếu không có phụ đề EN → AI tự nghe video & tạo transcript
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tải audio bằng youtubei.js → Deepgram nova-2 transcribe →
                gộp thành câu shadowing. Tốn thêm ~$0.05/video, video tối đa{" "}
                {Math.round(MAX_AUDIO_FALLBACK_SEC / 60)} phút. Chỉ kích hoạt nếu phụ đề YT không có.
              </p>
            </div>
          </label>

          <Button
            onClick={createWithAI}
            disabled={aiBusy}
            className="rounded-xl gradient-brand hover:brightness-110 text-white shadow-md"
          >
            {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {aiBusy ? aiStep || "Đang xử lý..." : "AI tạo bài tự động"}
          </Button>
          {aiBusy && (
            <p className="text-xs text-gold-700 dark:text-gold-300 italic">
              Đừng đóng tab — quá trình này chạy nền và lấy 30s tới vài phút
              cho video dài. Audio fallback có thể mất tới 3-5 phút cho video 20+ phút.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Paste-transcript path — reliable when YouTube blocks the server IP.
          Always visible (not collapsed) because it's the go-to fix when the
          auto path errors with "bot detection / video không khả dụng". */}
      <Card className="border-2 border-sage-400/60 bg-gradient-to-br from-sage-50 to-emerald-50 dark:from-sage-950/30 dark:to-emerald-950/20">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sage-500 to-emerald-500 text-white shadow-md shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-extrabold text-lg">Dán transcript → AI dịch &amp; tạo bài</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dùng khi cách trên báo lỗi “YouTube chặn server / video không khả dụng”. Cách này{" "}
                <strong>không cần server tải video</strong> nên luôn chạy được — AI vẫn tự chia câu,
                dịch tiếng Việt và sinh IPA.
              </p>
            </div>
          </div>

          <details className="rounded-lg bg-white/60 dark:bg-card/40 border border-sage-300/60 p-3 text-xs">
            <summary className="cursor-pointer font-bold text-sage-800 dark:text-sage-200">
              Lấy transcript ở đâu? (2 bước)
            </summary>
            <ol className="list-decimal pl-5 mt-2 space-y-1 text-muted-foreground">
              <li>
                Mở video trên YouTube (đã đăng nhập) → bấm “...thêm / more” dưới video →{" "}
                <strong>“Hiện bản chép lời / Show transcript”</strong>.
              </li>
              <li>
                Bôi đen toàn bộ khung transcript (gồm mốc thời gian) → copy → dán vào ô dưới đây.
                Cũng nhận file <strong>.vtt / .srt</strong>.
              </li>
            </ol>
          </details>

          <div>
            <Label className="text-sm font-bold">
              URL YouTube <span className="text-rose-600">*</span>
            </Label>
            <Input
              value={tsUrl}
              onChange={(e) => setTsUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={tsBusy}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Tiêu đề (tuỳ chọn)</Label>
              <Input
                value={tsTitle}
                onChange={(e) => setTsTitle(e.target.value)}
                placeholder="VD: TED-Ed — How memory works"
                disabled={tsBusy}
              />
            </div>
            <div>
              <Label className="text-xs">Nguồn / kênh (tuỳ chọn)</Label>
              <Input
                value={tsSource}
                onChange={(e) => setTsSource(e.target.value)}
                placeholder="TED-Ed / BBC / Netflix..."
                disabled={tsBusy}
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-bold">
              Transcript <span className="text-rose-600">*</span>
            </Label>
            <Textarea
              value={tsText}
              onChange={(e) => setTsText(e.target.value)}
              disabled={tsBusy}
              className="min-h-[180px] font-mono text-[13px]"
              placeholder={
                "0:00 Hello and welcome to today's lesson.\n0:04 We're going to talk about...\n\nHoặc dán VTT/SRT:\n00:00:00.000 --> 00:00:04.000\nHello and welcome to today's lesson."
              }
            />
            <p className="text-xs text-muted-foreground mt-1">
              Mỗi dòng cần có mốc thời gian (vd <span className="font-mono">0:04</span>) để cắt đúng
              đoạn cho người học nghe lại. Độ khó dùng chung lựa chọn CEFR ở khung trên.
            </p>
          </div>

          <Button
            onClick={createFromTranscript}
            disabled={tsBusy}
            className="rounded-xl bg-gradient-to-r from-sage-600 to-emerald-600 hover:brightness-110 text-white shadow-md"
          >
            {tsBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {tsBusy ? "Đang dịch + tạo bài..." : "Tạo bài từ transcript"}
          </Button>
          {tsBusy && (
            <p className="text-xs text-sage-700 dark:text-sage-300 italic">
              Đừng đóng tab — AI đang chia câu, dịch nghĩa và sinh IPA (~30s tới vài phút).
            </p>
          )}
        </CardContent>
      </Card>

      {/* Manual fallback — collapsible */}
      <button
        type="button"
        onClick={() => setAdvancedOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ChevronDown
          className={`h-4 w-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`}
        />
        Chế độ nâng cao — dán transcript thủ công
      </button>

      {advancedOpen && (
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="font-extrabold flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> Tạo bài mới (thủ công)
          </h2>
          <p className="text-xs text-muted-foreground -mt-2">
            Dùng khi video không có phụ đề EN trên YouTube, hoặc khi bạn đã có sẵn VTT/SRT.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Tiêu đề</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: TED-Ed — When I was a kid..."
              />
            </div>
            <div>
              <Label>Nguồn (badge trên card)</Label>
              <Input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="TED-Ed / BBC / Netflix..."
              />
            </div>
          </div>

          <div>
            <Label>URL YouTube</Label>
            <Input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Chấp nhận youtube.com/watch?v=, youtu.be/, /embed/, /shorts/. Hệ thống tự lấy
              thumbnail.
            </p>
          </div>

          <div>
            <Label>Import nhanh từ VTT/SRT hoặc dòng "start end text"</Label>
            <Textarea
              value={bulkPaste}
              onChange={(e) => setBulkPaste(e.target.value)}
              className="min-h-[140px] font-mono text-[13px]"
              placeholder={
                "0:00 0:05 Hello, my name is Alex.\n0:05 0:11 Today we are talking about...\n\nHoặc dán VTT:\n00:00:00.000 --> 00:00:05.000\nHello, my name is Alex."
              }
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={importBulk}
              disabled={!bulkPaste.trim()}
            >
              Import {segments.length > 0 ? "(ghi đè)" : ""}
            </Button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>Danh sách đoạn ({segments.length}) · ~{segmentDuration.toFixed(1)}s</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSegments((s) => [...s, blank()])}
              >
                <Plus className="h-3.5 w-3.5" /> Thêm đoạn
              </Button>
            </div>
            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
              {segments.map((s, i) => (
                <div key={i} className="rounded-lg border bg-muted/20 p-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-bold text-primary">#{i + 1}</span>
                    <Input
                      value={s.startSec}
                      onChange={(e) =>
                        setSegments((arr) =>
                          arr.map((x, j) => (j === i ? { ...x, startSec: e.target.value } : x)),
                        )
                      }
                      placeholder="start (0:05 hoặc 5)"
                      className="h-7 text-xs"
                    />
                    <Input
                      value={s.endSec}
                      onChange={(e) =>
                        setSegments((arr) =>
                          arr.map((x, j) => (j === i ? { ...x, endSec: e.target.value } : x)),
                        )
                      }
                      placeholder="end (0:11 hoặc 11)"
                      className="h-7 text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-7 w-7 p-0"
                      onClick={() =>
                        setSegments((arr) => arr.filter((_, j) => j !== i))
                      }
                      disabled={segments.length === 1}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                    </Button>
                  </div>
                  <Input
                    value={s.textEn}
                    onChange={(e) =>
                      setSegments((arr) =>
                        arr.map((x, j) => (j === i ? { ...x, textEn: e.target.value } : x)),
                      )
                    }
                    placeholder="Câu tiếng Anh"
                    className="h-8 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <Input
                      value={s.textVi}
                      onChange={(e) =>
                        setSegments((arr) =>
                          arr.map((x, j) => (j === i ? { ...x, textVi: e.target.value } : x)),
                        )
                      }
                      placeholder="Dịch nghĩa (tuỳ chọn)"
                      className="h-7 text-xs"
                    />
                    <Input
                      value={s.ipa}
                      onChange={(e) =>
                        setSegments((arr) =>
                          arr.map((x, j) => (j === i ? { ...x, ipa: e.target.value } : x)),
                        )
                      }
                      placeholder="IPA (tuỳ chọn)"
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={create} disabled={creating} className="rounded-xl">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Lưu bài shadowing
          </Button>
        </CardContent>
      </Card>
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="font-extrabold">Tất cả bài ({lessons.length})</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={classifyLevels}
            disabled={classifying || noLevelCount === 0}
            className="h-8 text-xs border-sage-300 text-sage-700 hover:bg-sage-50"
            title="Để AI tự xếp loại trình độ cho các bài chưa có (dựa trên transcript đã lưu)"
          >
            {classifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            {noLevelCount > 0
              ? `AI tự xếp loại trình độ (${noLevelCount} bài chưa có)`
              : "Mọi bài đã có trình độ"}
          </Button>
        </div>
        {lessons.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground text-center">
              Chưa có bài nào.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {lessons.map((l) => (
              <Card key={l.id}>
                <CardContent className="p-3 flex gap-3">
                  {l.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={l.thumbnailUrl}
                      alt=""
                      className="h-20 w-32 shrink-0 rounded-lg object-cover bg-muted"
                    />
                  ) : (
                    <div className="h-20 w-32 shrink-0 rounded-lg bg-muted grid place-items-center">
                      <Youtube className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-1.5">
                      <p className="font-bold leading-tight line-clamp-2 flex-1">{l.title}</p>
                      {l.premium && (
                        <span className="shrink-0 inline-flex items-center gap-0.5 rounded-md bg-gold-500 px-1.5 py-0.5 text-[10px] font-extrabold text-gold-950">
                          <Crown className="h-2.5 w-2.5" /> PRO
                        </span>
                      )}
                      {l.level && (
                        <span
                          className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold text-white ${LEVEL_BADGE_CLASS[l.level]}`}
                        >
                          {l.level}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {l.source} · {l.segmentCount} đoạn
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <select
                        value={l.level ?? ""}
                        onChange={(e) =>
                          setLevelFor(
                            l,
                            (e.target.value || null) as
                              | "B1"
                              | "B2"
                              | "C1"
                              | "C2"
                              | null,
                          )
                        }
                        className="h-7 rounded-md border-2 border-muted bg-card px-1.5 text-xs font-bold"
                        title="Đặt độ khó CEFR"
                      >
                        <option value="">Độ khó —</option>
                        {PRACTICE_LEVELS.map((lv) => (
                          <option key={lv} value={lv}>
                            {lv} · {LEVEL_DESC[lv]}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`h-7 text-xs ${l.premium ? "border-gold-400 bg-gold-100 text-gold-700 dark:bg-gold-500/15 dark:text-gold-300" : ""}`}
                        onClick={() => setPremiumFor(l, !l.premium)}
                        title="Chỉ tài khoản Premium mới xem được video này"
                      >
                        <Crown className="h-3 w-3" /> {l.premium ? "Premium ✓" : "Premium"}
                      </Button>
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                        <a href={`/admin/shadowing/${l.id}/edit`}>
                          <Pencil className="h-3 w-3" /> Sửa
                        </a>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                        <a href={`/shadowing/${l.id}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3 w-3" /> Xem
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-sage-300 text-sage-700 hover:bg-sage-50"
                        onClick={() => resegment(l)}
                        disabled={busyId === l.id}
                        title="Chia lại câu theo từng nhân vật (sửa lời 2 người bị dính vào nhau)"
                      >
                        {busyId === l.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Scissors className="h-3 w-3" />
                        )}{" "}
                        Re-chia câu
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
                        onClick={() => remove(l)}
                        disabled={busyId === l.id}
                      >
                        {busyId === l.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
