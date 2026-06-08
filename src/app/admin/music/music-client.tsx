"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Plus, Trash2, Loader2, Eye, EyeOff, Volume2, Music, ChevronDown, ChevronUp,
} from "lucide-react";
import { MUSIC_SCOPES, type MusicScope } from "@/lib/music-scopes";

interface Track {
  id: string;
  name: string;
  audioUrl: string;
  scopes: string[];
  volume: number;
  enabled: boolean;
  order: number;
}

export function MusicAdminClient({ initial }: { initial: Track[] }) {
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[]>(initial);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New track form
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newScopes, setNewScopes] = useState<MusicScope[]>(["HOME"]);
  const [newVolume, setNewVolume] = useState(0.4);

  const refresh = () => router.refresh();

  const toggleNewScope = (s: MusicScope) => {
    setNewScopes((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const addTrack = async () => {
    if (!newName.trim() || !newUrl.trim()) {
      toast.error("Cần nhập tên và URL nhạc.");
      return;
    }
    if (newScopes.length === 0) {
      toast.error("Chọn ít nhất 1 phần để bật nhạc.");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          audioUrl: newUrl.trim(),
          scopes: newScopes,
          volume: newVolume,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tạo thất bại");
      setTracks((prev) => [...prev, data.track]);
      setNewName("");
      setNewUrl("");
      setNewScopes(["HOME"]);
      setNewVolume(0.4);
      toast.success("Đã thêm nhạc mới.");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tạo nhạc thất bại");
    } finally {
      setAdding(false);
    }
  };

  const patchTrack = async (id: string, patch: Partial<Track>) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/music/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cập nhật thất bại");
      setTracks((prev) => prev.map((t) => (t.id === id ? data.track : t)));
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cập nhật thất bại");
    } finally {
      setBusyId(null);
    }
  };

  const deleteTrack = async (id: string) => {
    if (!confirm("Xóa bản nhạc này?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/music/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Xóa thất bại");
      setTracks((prev) => prev.filter((t) => t.id !== id));
      toast.success("Đã xóa.");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xóa thất bại");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Add new track */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            <h2 className="font-bold">Thêm nhạc mới</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-bold mb-1 block uppercase text-muted-foreground">
                Tên hiển thị
              </span>
              <Input
                placeholder="VD: Lofi chill"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold mb-1 block uppercase text-muted-foreground">
                URL nhạc (mp3 / ogg)
              </span>
              <Input
                placeholder="https://.../track.mp3"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
              />
            </label>
          </div>

          <div>
            <span className="text-xs font-bold mb-2 block uppercase text-muted-foreground">
              Phát ở các phần (chọn nhiều)
            </span>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
              {MUSIC_SCOPES.map((s) => {
                const on = newScopes.includes(s.value);
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => toggleNewScope(s.value)}
                    className={`text-left rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition-all ${
                      on
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input bg-card hover:border-border"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-xs font-bold mb-1 block uppercase text-muted-foreground">
              Âm lượng mặc định: {Math.round(newVolume * 100)}%
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={newVolume}
              onChange={(e) => setNewVolume(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <Button onClick={addTrack} disabled={adding} variant="brand" className="w-full sm:w-auto">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Thêm nhạc
          </Button>
        </CardContent>
      </Card>

      {/* Tracks list */}
      <Card>
        <CardContent className="p-0">
          <div className="px-5 py-3 border-b flex items-center gap-2">
            <Music className="h-4 w-4 text-primary" />
            <h2 className="font-bold">Danh sách nhạc ({tracks.length})</h2>
          </div>
          {tracks.length === 0 ? (
            <div className="px-5 py-10 text-center text-muted-foreground">
              Chưa có bản nhạc nào. Thêm một bản ở trên để bắt đầu.
            </div>
          ) : (
            <ul className="divide-y">
              {tracks.map((t) => {
                const isExpanded = expandedId === t.id;
                return (
                  <Fragment key={t.id}>
                    <li className="px-5 py-3 flex items-center gap-3 flex-wrap">
                      <div className={`grid h-10 w-10 place-items-center rounded-lg ${
                        t.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        <Music className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate">{t.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {t.scopes.length === 0
                            ? "Chưa gán phần nào"
                            : t.scopes
                                .map((s) => MUSIC_SCOPES.find((x) => x.value === s)?.label ?? s)
                                .join(" · ")}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Volume2 className="h-3.5 w-3.5" />
                        {Math.round(t.volume * 100)}%
                      </div>
                      <button
                        type="button"
                        onClick={() => patchTrack(t.id, { enabled: !t.enabled })}
                        disabled={busyId === t.id}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold transition-all ${
                          t.enabled
                            ? "bg-sage-100 text-sage-700"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {t.enabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        {t.enabled ? "Đang bật" : "Tắt"}
                      </button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => setExpandedId(isExpanded ? null : t.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        {isExpanded ? "Đóng" : "Sửa"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteTrack(t.id)}
                        disabled={busyId === t.id}
                        className="rounded-full text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>

                    {isExpanded && (
                      <li className="px-5 py-4 bg-muted/30 space-y-4">
                        <TrackEditor
                          track={t}
                          onPatch={(patch) => patchTrack(t.id, patch)}
                          busy={busyId === t.id}
                        />
                        <div>
                          <span className="text-xs font-bold mb-1 block uppercase text-muted-foreground">
                            Nghe thử
                          </span>
                          <audio controls src={t.audioUrl} className="w-full h-10" />
                        </div>
                      </li>
                    )}
                  </Fragment>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Inline editor for an existing track — name, URL, scopes, volume. */
function TrackEditor({
  track,
  onPatch,
  busy,
}: {
  track: Track;
  onPatch: (patch: Partial<Track>) => Promise<void> | void;
  busy: boolean;
}) {
  const [name, setName] = useState(track.name);
  const [url, setUrl] = useState(track.audioUrl);
  const [scopes, setScopes] = useState<string[]>(track.scopes);
  const [volume, setVolume] = useState(track.volume);

  const toggleScope = (s: MusicScope) => {
    setScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const dirty =
    name !== track.name ||
    url !== track.audioUrl ||
    volume !== track.volume ||
    scopes.length !== track.scopes.length ||
    scopes.some((s) => !track.scopes.includes(s));

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-bold mb-1 block uppercase text-muted-foreground">Tên</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs font-bold mb-1 block uppercase text-muted-foreground">URL nhạc</span>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} />
        </label>
      </div>

      <div>
        <span className="text-xs font-bold mb-2 block uppercase text-muted-foreground">Phát ở</span>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
          {MUSIC_SCOPES.map((s) => {
            const on = scopes.includes(s.value);
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => toggleScope(s.value)}
                className={`text-left rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition-all ${
                  on
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input bg-card hover:border-border"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <span className="text-xs font-bold mb-1 block uppercase text-muted-foreground">
          Âm lượng: {Math.round(volume * 100)}%
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <Button
        size="sm"
        variant="brand"
        disabled={!dirty || busy}
        onClick={() => onPatch({ name, audioUrl: url, scopes, volume })}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Lưu thay đổi
      </Button>
    </div>
  );
}
