"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  Headphones,
  Loader2,
  Sparkles,
  Trash2,
  ExternalLink,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRACTICE_LEVELS, LEVEL_DESC, LEVEL_BADGE_CLASS } from "@/lib/cefr";

export type PodcastRow = {
  id: string;
  title: string;
  channel: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | null;
  youtubeId: string;
  thumbnailUrl: string;
  durationSec: number;
  published: boolean;
  createdAt: string;
};

function formatDur(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `0:${s.toString().padStart(2, "0")}`;
}

export function PodcastsAdminClient({ initial }: { initial: PodcastRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState("");
  const [level, setLevel] = useState<"" | "B1" | "B2" | "C1" | "C2">("");
  const [busy, setBusy] = useState(false);
  const [delId, setDelId] = useState<string | null>(null);
  const [classifying, setClassifying] = useState(false);

  /** AI auto-classify CEFR level for every episode missing one. Runs off the
   *  stored transcript on the server — no YouTube fetch needed. */
  const classifyLevels = async () => {
    setClassifying(true);
    try {
      const res = await fetch("/api/admin/podcasts/classify-levels", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Xếp loại thất bại");
      toast.success(
        `Đã tự xếp loại ${data.classified} podcast` +
          (data.remaining ? ` · còn ${data.remaining}, bấm lại để tiếp` : ""),
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setClassifying(false);
    }
  };
  const noLevelCount = rows.filter((r) => !r.level).length;

  const create = async () => {
    if (!url.trim()) return toast.error("Dán URL YouTube");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/podcasts/from-youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtubeUrl: url.trim(),
          title: title.trim() || undefined,
          channel: channel.trim() || undefined,
          level: level || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Tạo podcast thất bại");
      toast.success(`Đã tạo podcast (${data.segmentCount} đoạn transcript)`);
      setUrl("");
      setTitle("");
      setChannel("");
      setLevel("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  };

  const setLevelFor = async (
    r: PodcastRow,
    next: "B1" | "B2" | "C1" | "C2" | null,
  ) => {
    setRows((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, level: next } : x)),
    );
    try {
      const res = await fetch(`/api/admin/podcasts/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: next }),
      });
      if (!res.ok) throw new Error("Lưu độ khó thất bại");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
      setRows((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, level: r.level } : x)),
      );
    }
  };

  const remove = async (r: PodcastRow) => {
    if (!confirm(`Xoá podcast "${r.title}"?`)) return;
    setDelId(r.id);
    try {
      const res = await fetch(`/api/admin/podcasts/${r.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Xoá thất bại");
      setRows((prev) => prev.filter((x) => x.id !== r.id));
      toast.success("Đã xoá");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setDelId(null);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <Headphones className="h-6 w-6 text-primary" /> Podcasts
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dán URL YouTube — AI lấy transcript tiếng Anh. Users sẽ nghe full-screen với transcript cuộn theo.
        </p>
      </div>

      {/* Create form */}
      <Card className="border-2 border-honey/40 bg-gradient-to-br from-honey-tint via-cream to-leaf-tint/30">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-honey to-honey-deep text-ink shadow-md shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-extrabold text-lg">Thêm podcast mới</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                URL YouTube là đủ — title/channel tự lấy nếu để trống.
              </p>
            </div>
          </div>

          <div>
            <Label className="text-sm font-bold">
              URL YouTube <span className="text-rose-600">*</span>
            </Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={busy}
              className="text-base"
            />
          </div>

          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-bold">
              Tùy chọn: ghi đè tiêu đề / kênh
            </summary>
            <div className="grid gap-3 sm:grid-cols-2 mt-2">
              <div>
                <Label className="text-xs">Tiêu đề</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} />
              </div>
              <div>
                <Label className="text-xs">Kênh / nguồn</Label>
                <Input value={channel} onChange={(e) => setChannel(e.target.value)} disabled={busy} />
              </div>
            </div>
          </details>

          <div>
            <Label className="text-sm font-bold">Độ khó (CEFR)</Label>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <button
                type="button"
                onClick={() => setLevel("")}
                disabled={busy}
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
                  disabled={busy}
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
          </div>

          <Button
            onClick={create}
            disabled={busy}
            className="rounded-xl gradient-brand hover:brightness-110 text-white font-bold shadow-md"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "Đang xử lý..." : "Tạo podcast"}
          </Button>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <h2 className="font-extrabold">Episodes ({rows.length})</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={classifyLevels}
              disabled={classifying || noLevelCount === 0}
              className="h-8 text-xs"
              title="Để AI tự xếp loại trình độ cho các podcast chưa có (dựa trên transcript đã lưu)"
            >
              {classifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              {noLevelCount > 0
                ? `AI tự xếp loại trình độ (${noLevelCount} chưa có)`
                : "Mọi podcast đã có trình độ"}
            </Button>
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Chưa có podcast nào — dán URL ở trên để bắt đầu.
            </p>
          ) : (
            <ul className="divide-y">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-3">
                  <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={r.thumbnailUrl}
                      alt=""
                      fill
                      sizes="96px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold truncate flex-1">{r.title}</p>
                      {r.level && (
                        <span
                          className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold text-white ${LEVEL_BADGE_CLASS[r.level]}`}
                        >
                          {r.level}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.channel} · {formatDur(r.durationSec)} · {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                    </p>
                    <select
                      value={r.level ?? ""}
                      onChange={(e) =>
                        setLevelFor(
                          r,
                          (e.target.value || null) as
                            | "B1"
                            | "B2"
                            | "C1"
                            | "C2"
                            | null,
                        )
                      }
                      className="mt-1 h-7 rounded-md border-2 border-muted bg-card px-1.5 text-xs font-bold"
                      title="Đặt độ khó CEFR"
                    >
                      <option value="">Độ khó —</option>
                      {PRACTICE_LEVELS.map((lv) => (
                        <option key={lv} value={lv}>
                          {lv} · {LEVEL_DESC[lv]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Link
                    href={`/podcasts/${r.id}`}
                    target="_blank"
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(r)}
                    disabled={delId === r.id}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  >
                    {delId === r.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
