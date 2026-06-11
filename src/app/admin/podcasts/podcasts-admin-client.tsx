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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type PodcastRow = {
  id: string;
  title: string;
  channel: string;
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
  const [busy, setBusy] = useState(false);
  const [delId, setDelId] = useState<string | null>(null);

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
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Tạo podcast thất bại");
      toast.success(`Đã tạo podcast (${data.segmentCount} đoạn transcript)`);
      setUrl("");
      setTitle("");
      setChannel("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setBusy(false);
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
          <h2 className="font-extrabold mb-3">Episodes ({rows.length})</h2>
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
                    <p className="font-bold truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.channel} · {formatDur(r.durationSec)} · {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                    </p>
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
