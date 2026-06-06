"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Video, Plus, Loader2, Trash2, Youtube, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export interface LessonRow {
  id: string;
  title: string;
  source: string;
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
          Tạo bài Shadowing từ video YouTube. Mỗi bài cần URL + danh sách đoạn (start, end,
          text). Dán VTT/SRT thẳng vào ô “Import nhanh” bên dưới để auto-split.
        </p>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="font-extrabold flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> Tạo bài mới
          </h2>

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

      <section className="space-y-2">
        <h2 className="font-extrabold">Tất cả bài ({lessons.length})</h2>
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
                    <p className="font-bold leading-tight line-clamp-2">{l.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {l.source} · {l.segmentCount} đoạn
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                        <a href={`/shadowing/${l.id}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3 w-3" /> Xem
                        </a>
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
