"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  ExternalLink,
  Wand2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface EditorSegment {
  /** Existing DB id; undefined for newly-added segments. */
  id?: string;
  order: number;
  startSec: number;
  endSec: number;
  textEn: string;
  textVi: string | null;
  ipa: string | null;
}

export interface EditorLesson {
  id: string;
  title: string;
  source: string;
  youtubeId: string;
  thumbnailUrl: string | null;
  published: boolean;
  createdByName: string | null;
  segments: EditorSegment[];
}

interface DraftSegment {
  id?: string;
  startSec: string;
  endSec: string;
  textEn: string;
  textVi: string;
  ipa: string;
  /** Local-only key so React row keys stay stable when reordering. */
  uiKey: string;
  /** True while the AI re-fill request for this row is in flight. */
  aiBusy?: boolean;
}

function fmtTime(sec: number): string {
  if (!Number.isFinite(sec)) return "";
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  const ss = s.toFixed(2).padStart(5, "0");
  return `${m}:${ss}`;
}

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

let uiKeyCounter = 0;
function nextKey(): string {
  uiKeyCounter += 1;
  return `s${uiKeyCounter}`;
}

function toDraft(s: EditorSegment): DraftSegment {
  return {
    id: s.id,
    startSec: fmtTime(s.startSec),
    endSec: fmtTime(s.endSec),
    textEn: s.textEn,
    textVi: s.textVi ?? "",
    ipa: s.ipa ?? "",
    uiKey: nextKey(),
  };
}

export function ShadowingEditor({ lesson }: { lesson: EditorLesson }) {
  const router = useRouter();
  const [title, setTitle] = useState(lesson.title);
  const [source, setSource] = useState(lesson.source);
  const [youtubeUrl, setYoutubeUrl] = useState(
    `https://www.youtube.com/watch?v=${lesson.youtubeId}`,
  );
  const [published, setPublished] = useState(lesson.published);
  const [drafts, setDrafts] = useState<DraftSegment[]>(
    lesson.segments.map(toDraft),
  );
  const [saving, setSaving] = useState(false);
  const [bulkAiBusy, setBulkAiBusy] = useState<"fill" | "fix" | null>(null);
  const savingRef = useRef(false);

  const updateRow = (i: number, patch: Partial<DraftSegment>) => {
    setDrafts((arr) => arr.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  };

  const move = (i: number, dir: -1 | 1) => {
    setDrafts((arr) => {
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      const next = arr.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const addRow = (afterIdx?: number) => {
    setDrafts((arr) => {
      const blank: DraftSegment = {
        startSec: "",
        endSec: "",
        textEn: "",
        textVi: "",
        ipa: "",
        uiKey: nextKey(),
      };
      if (afterIdx == null) return [...arr, blank];
      const next = arr.slice();
      next.splice(afterIdx + 1, 0, blank);
      return next;
    });
  };

  const removeRow = (i: number) => {
    setDrafts((arr) => arr.filter((_, j) => j !== i));
  };

  /** Build the PATCH payload from current drafts; null on validation error. */
  const buildPayload = ():
    | {
        title: string;
        source: string;
        youtubeUrl: string;
        published: boolean;
        segments: {
          id?: string;
          startSec: number;
          endSec: number;
          textEn: string;
          textVi: string | null;
          ipa: string | null;
        }[];
      }
    | null => {
    if (!title.trim()) {
      toast.error("Tiêu đề không được trống");
      return null;
    }
    if (!source.trim()) {
      toast.error("Nguồn không được trống");
      return null;
    }
    if (!youtubeUrl.trim()) {
      toast.error("URL YouTube không được trống");
      return null;
    }
    if (drafts.length === 0) {
      toast.error("Cần ít nhất 1 đoạn");
      return null;
    }
    const segments: NonNullable<ReturnType<typeof buildPayload>>["segments"] = [];
    for (const [i, d] of drafts.entries()) {
      const start = parseTime(d.startSec);
      const end = parseTime(d.endSec);
      if (start == null || end == null) {
        toast.error(`Đoạn #${i + 1}: thời gian không hợp lệ`);
        return null;
      }
      if (end <= start) {
        toast.error(`Đoạn #${i + 1}: end phải > start`);
        return null;
      }
      if (!d.textEn.trim()) {
        toast.error(`Đoạn #${i + 1}: thiếu câu tiếng Anh`);
        return null;
      }
      segments.push({
        id: d.id,
        startSec: start,
        endSec: end,
        textEn: d.textEn.trim(),
        textVi: d.textVi.trim() || null,
        ipa: d.ipa.trim() || null,
      });
    }
    return {
      title: title.trim(),
      source: source.trim(),
      youtubeUrl: youtubeUrl.trim(),
      published,
      segments,
    };
  };

  const save = async () => {
    if (savingRef.current) return;
    const payload = buildPayload();
    if (!payload) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/shadowing/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Lưu thất bại");
      toast.success(`Đã lưu (${payload.segments.length} đoạn)`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  /** Re-run Claude on a single row. mode="fill" keeps textEn, fills IPA + vi.
   *  mode="fix" lets Claude clean textEn (capitalization, punctuation, obvious
   *  homophones) then fills IPA + vi for the cleaned version. */
  const aiRowAction = async (i: number, mode: "fill" | "fix") => {
    const row = drafts[i];
    if (!row.textEn.trim()) {
      toast.error("Cần có câu tiếng Anh trước");
      return;
    }
    updateRow(i, { aiBusy: true });
    try {
      const res = await fetch(`/api/admin/shadowing/${lesson.id}/ai-fill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          items: [{ key: row.uiKey, textEn: row.textEn.trim() }],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "AI lỗi");
      const item = (
        data.items as { key: string; textEn: string; ipa: string; textVi: string }[]
      ).find((x) => x.key === row.uiKey);
      if (!item) throw new Error("AI không trả về dữ liệu");
      setDrafts((arr) =>
        arr.map((x) =>
          x.uiKey === row.uiKey
            ? {
                ...x,
                textEn: mode === "fix" ? item.textEn : x.textEn,
                ipa: item.ipa,
                textVi: item.textVi,
                aiBusy: false,
              }
            : x,
        ),
      );
      toast.success(mode === "fix" ? "AI đã sửa cả câu" : "AI đã cập nhật IPA + dịch");
    } catch (e) {
      updateRow(i, { aiBusy: false });
      toast.error(e instanceof Error ? e.message : "Lỗi");
    }
  };

  /** Re-run Claude on every row missing IPA OR textVi (bulk fill-up). */
  const aiFillMissing = async () => {
    const needs = drafts
      .map((d, idx) => ({ d, idx }))
      .filter(({ d }) => d.textEn.trim() && (!d.ipa.trim() || !d.textVi.trim()));
    if (needs.length === 0) {
      toast("Không có đoạn nào cần fill");
      return;
    }
    setBulkAiBusy("fill");
    try {
      const res = await fetch(`/api/admin/shadowing/${lesson.id}/ai-fill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "fill",
          items: needs.map(({ d }) => ({ key: d.uiKey, textEn: d.textEn.trim() })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "AI lỗi");
      const byKey = new Map<string, { ipa: string; textVi: string }>(
        (data.items as { key: string; textEn: string; ipa: string; textVi: string }[]).map(
          (x) => [x.key, { ipa: x.ipa, textVi: x.textVi }],
        ),
      );
      setDrafts((arr) =>
        arr.map((x) => {
          const got = byKey.get(x.uiKey);
          if (!got) return x;
          return {
            ...x,
            ipa: x.ipa.trim() ? x.ipa : got.ipa,
            textVi: x.textVi.trim() ? x.textVi : got.textVi,
          };
        }),
      );
      toast.success(`AI đã fill ${needs.length} đoạn`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setBulkAiBusy(null);
    }
  };

  /** Run Claude in "fix" mode on EVERY row with textEn. Cleans English,
   *  re-translates Vietnamese, regenerates IPA. Overwrites manual edits —
   *  hence the confirm prompt. Use after pulling rough text from STT. */
  const aiFixAll = async () => {
    const targets = drafts
      .map((d, idx) => ({ d, idx }))
      .filter(({ d }) => d.textEn.trim());
    if (targets.length === 0) {
      toast.error("Chưa có đoạn nào có câu tiếng Anh");
      return;
    }
    if (
      !confirm(
        `AI sẽ làm sạch English + dịch + IPA cho ${targets.length} đoạn. Mọi chỉnh sửa thủ công sẽ bị thay thế. Tiếp tục?`,
      )
    ) {
      return;
    }
    setBulkAiBusy("fix");
    try {
      const res = await fetch(`/api/admin/shadowing/${lesson.id}/ai-fill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "fix",
          items: targets.map(({ d }) => ({ key: d.uiKey, textEn: d.textEn.trim() })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "AI lỗi");
      const byKey = new Map<
        string,
        { textEn: string; ipa: string; textVi: string }
      >(
        (
          data.items as { key: string; textEn: string; ipa: string; textVi: string }[]
        ).map((x) => [x.key, { textEn: x.textEn, ipa: x.ipa, textVi: x.textVi }]),
      );
      setDrafts((arr) =>
        arr.map((x) => {
          const got = byKey.get(x.uiKey);
          if (!got) return x;
          return {
            ...x,
            textEn: got.textEn || x.textEn,
            ipa: got.ipa,
            textVi: got.textVi,
          };
        }),
      );
      toast.success(`AI đã làm sạch ${targets.length} đoạn — nhớ kiểm tra rồi lưu`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setBulkAiBusy(null);
    }
  };

  const totalDuration = useMemo(() => {
    return drafts.reduce((sum, d) => {
      const a = parseTime(d.startSec);
      const b = parseTime(d.endSec);
      if (a == null || b == null) return sum;
      return sum + Math.max(0, b - a);
    }, 0);
  }, [drafts]);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start gap-3 flex-wrap">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/admin/shadowing">
            <ArrowLeft className="h-4 w-4" /> Danh sách
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight">Sửa bài shadowing</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {lesson.createdByName ? (
              <>Người tạo: <span className="font-bold">{lesson.createdByName}</span> · </>
            ) : (
              <>Bài cộng đồng · </>
            )}
            {drafts.length} đoạn · ~{totalDuration.toFixed(1)}s
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={`/shadowing/${lesson.id}`} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" /> Mở bài
          </a>
        </Button>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="font-extrabold">Thông tin bài</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Tiêu đề</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Nguồn (badge)</Label>
              <Input value={source} onChange={(e) => setSource(e.target.value)} />
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
              Đổi URL ở đây sẽ đổi luôn video + thumbnail. Khi đổi nhớ kiểm
              tra start/end của từng đoạn còn khớp không.
            </p>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="h-4 w-4 accent-gold-500"
            />
            <span className="text-sm font-bold">
              Đã publish (hiển thị trên trang luyện cho học viên)
            </span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-extrabold">Danh sách đoạn ({drafts.length})</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={aiFixAll}
                disabled={bulkAiBusy !== null}
                className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                title="AI làm sạch English + dịch + IPA cho toàn bộ bài. Ghi đè lên chỉnh sửa thủ công."
              >
                {bulkAiBusy === "fix" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}
                AI làm sạch toàn bài
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={aiFillMissing}
                disabled={bulkAiBusy !== null}
                title="AI tự fill IPA + dịch cho các đoạn còn trống. Không đụng English."
              >
                {bulkAiBusy === "fill" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                AI fill thiếu
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addRow()}
              >
                <Plus className="h-3.5 w-3.5" /> Thêm đoạn
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            <strong>AI làm sạch</strong>: sửa English (viết hoa, dấu câu, từ
            đồng âm) + dịch lại + IPA. <strong>AI fill</strong>: chỉ thêm IPA
            + dịch khi đang trống. Trong từng đoạn, nút <Wand2 className="inline h-3 w-3" /> sửa cả câu,
            nút <Sparkles className="inline h-3 w-3" /> chỉ refresh IPA + dịch.
          </p>

          <div className="space-y-2">
            {drafts.map((d, i) => (
              <div
                key={d.uiKey}
                className="rounded-lg border-2 bg-muted/20 p-2.5 space-y-2"
              >
                <div className="flex items-center gap-1.5 text-xs flex-wrap">
                  <span className="font-extrabold text-primary shrink-0 w-7">
                    #{i + 1}
                  </span>
                  <Input
                    value={d.startSec}
                    onChange={(e) => updateRow(i, { startSec: e.target.value })}
                    placeholder="start (0:05)"
                    className="h-7 text-xs w-24"
                  />
                  <Input
                    value={d.endSec}
                    onChange={(e) => updateRow(i, { endSec: e.target.value })}
                    placeholder="end (0:11)"
                    className="h-7 text-xs w-24"
                  />
                  <div className="ml-auto flex items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      title="Lên"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => move(i, 1)}
                      disabled={i === drafts.length - 1}
                      title="Xuống"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-rose-700"
                      onClick={() => aiRowAction(i, "fix")}
                      disabled={!!d.aiBusy}
                      title="AI sửa cả câu: làm sạch English + dịch + IPA"
                    >
                      {d.aiBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => aiRowAction(i, "fill")}
                      disabled={!!d.aiBusy}
                      title="AI tạo lại IPA + dịch (giữ nguyên English)"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => removeRow(i)}
                      title="Xoá đoạn"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                    </Button>
                  </div>
                </div>
                <Input
                  value={d.textEn}
                  onChange={(e) => updateRow(i, { textEn: e.target.value })}
                  placeholder="Câu tiếng Anh"
                  className="h-8 text-sm"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  <Input
                    value={d.textVi}
                    onChange={(e) => updateRow(i, { textVi: e.target.value })}
                    placeholder="Dịch tiếng Việt"
                    className="h-7 text-xs"
                  />
                  <Input
                    value={d.ipa}
                    onChange={(e) => updateRow(i, { ipa: e.target.value })}
                    placeholder="IPA"
                    className="h-7 text-xs font-mono"
                  />
                </div>
              </div>
            ))}
          </div>

          {drafts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Chưa có đoạn nào. Bấm "Thêm đoạn" để bắt đầu.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="sticky bottom-3 z-10 flex gap-2 justify-end">
        <Button asChild variant="outline">
          <Link href="/admin/shadowing">Huỷ</Link>
        </Button>
        <Button onClick={save} disabled={saving} className="rounded-xl shadow-lg">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Lưu thay đổi
        </Button>
      </div>
    </div>
  );
}
