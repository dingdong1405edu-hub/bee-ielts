"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Play, Trash2, Loader2, Star, Eye, EyeOff, Volume2 } from "lucide-react";
import { primeAudioPlayback } from "@/lib/tts";

interface Voice {
  id: string;
  voiceId: string;
  name: string;
  accent: string;
  gender: string;
  enabled: boolean;
  isDefault: boolean;
  order: number;
}

const ACCENTS = ["Anh - Mỹ", "Anh - Anh", "Anh - Ireland", "Anh - Úc"] as const;

export function VoicesAdminClient({ initialVoices }: { initialVoices: Voice[] }) {
  const router = useRouter();
  const [voices, setVoices] = useState<Voice[]>(initialVoices);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  // New voice form state
  const [newVoiceId, setNewVoiceId] = useState("");
  const [newName, setNewName] = useState("");
  const [newAccent, setNewAccent] = useState<string>(ACCENTS[0]);
  const [newGender, setNewGender] = useState<"Nữ" | "Nam">("Nữ");

  const refresh = () => router.refresh();

  const addVoice = async () => {
    if (!newVoiceId.trim() || !newName.trim()) {
      toast.error("Cần điền voice ID và tên hiển thị.");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/voices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceId: newVoiceId.trim(),
          name: newName.trim(),
          accent: newAccent,
          gender: newGender,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tạo thất bại");
      setVoices((prev) => [...prev, data.voice]);
      setNewVoiceId("");
      setNewName("");
      toast.success("Đã thêm giọng mới.");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tạo voice thất bại");
    } finally {
      setAdding(false);
    }
  };

  const patchVoice = async (id: string, patch: Partial<Voice>) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/voices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cập nhật thất bại");
      setVoices((prev) =>
        prev.map((v) => {
          // If this row is the new default, demote every other row in UI too.
          if (patch.isDefault === true && v.id !== id) return { ...v, isDefault: false };
          return v.id === id ? data.voice : v;
        }),
      );
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cập nhật thất bại");
    } finally {
      setBusyId(null);
    }
  };

  const deleteVoice = async (id: string) => {
    if (!confirm("Xóa giọng này? Người dùng đang chọn nó sẽ rơi về giọng mặc định.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/voices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Xóa thất bại");
      setVoices((prev) => prev.filter((v) => v.id !== id));
      toast.success("Đã xóa.");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xóa thất bại");
    } finally {
      setBusyId(null);
    }
  };

  // Use a single HTMLAudioElement that's been "unlocked" via a sync play()
  // on mount-equivalent gesture. The element gets reused for every test, so
  // the autoplay-policy state persists between calls.
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const ensureAudioEl = () => {
    if (typeof window === "undefined") return null;
    if (!audioElRef.current) {
      audioElRef.current = new Audio();
      audioElRef.current.preload = "auto";
    }
    return audioElRef.current;
  };

  // Strategy: do EVERYTHING with the HTMLAudioElement, primed inside the
  // click handler. We assign the blob URL after fetch and call play() —
  // the prior muted play() inside the same gesture handler keeps the
  // element flagged as "user-initiated audio" for the swap-and-play later.
  const testVoice = async (voice: Voice) => {
    if (testingId) return;
    console.log("[test-voice] click for voice", voice.voiceId);
    setTestingId(voice.id);

    // SYNC, inside gesture: prime both the global AudioContext (for any
    // other code that uses it) AND a local element with a 1-frame silent
    // WAV so this element gets the "user-initiated" flag.
    primeAudioPlayback();
    const audio = ensureAudioEl();
    if (!audio) {
      toast.error("Không khởi tạo được phát thanh.");
      setTestingId(null);
      return;
    }
    try {
      audio.muted = true;
      audio.src =
        "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
      // Fire and forget — start the play during gesture; we'll swap src next.
      void audio.play().catch((e) => console.warn("[test-voice] silent prime warned:", e));
    } catch (e) {
      console.warn("[test-voice] prime threw:", e);
    }

    let blobUrl: string | null = null;
    try {
      console.log("[test-voice] fetching /api/speaking/tts");
      const res = await fetch("/api/speaking/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `Hi, this is ${voice.name}. Today I want to ask you some questions.`,
          voice: voice.voiceId,
        }),
      });
      console.log("[test-voice] tts response", res.status, res.headers.get("X-Tts-Voice"));
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`${res.status}: ${detail.slice(0, 150)}`);
      }
      const usedVoice = res.headers.get("X-Tts-Voice");
      if (usedVoice && usedVoice !== voice.voiceId) {
        toast.warning(
          `Voice ID "${voice.voiceId}" không hợp lệ — Deepgram đã thay bằng ${usedVoice}. Sửa lại voiceId nhé.`,
        );
      }
      const blob = await res.blob();
      console.log(`[test-voice] got MP3 blob size=${blob.size} type=${blob.type}`);
      blobUrl = URL.createObjectURL(blob);

      try {
        audio.pause();
      } catch {
        /* ignore */
      }
      audio.muted = false;
      audio.volume = 1;
      audio.src = blobUrl;
      audio.currentTime = 0;

      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = (reason: string) => {
          if (settled) return;
          settled = true;
          console.log("[test-voice] playback finished:", reason);
          resolve();
        };
        audio.onended = () => finish("ended");
        audio.onerror = () => {
          console.error("[test-voice] audio error event");
          finish("error");
        };
        audio
          .play()
          .then(() => {
            console.log(
              `[test-voice] audio.play() resolved — duration=${audio.duration}s`,
            );
          })
          .catch((e) => {
            console.error("[test-voice] audio.play() rejected:", e);
            toast.error(
              "Trình duyệt chặn phát âm thanh — thử bấm vào trang trước khi nhấn Phát thử.",
            );
            finish("rejected");
          });
      });
    } catch (e) {
      console.error("[test-voice]", e);
      toast.error(e instanceof Error ? e.message : "Phát thử thất bại");
    } finally {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      audio.onended = null;
      audio.onerror = null;
      setTestingId(null);
    }
  };

  const currentlyTesting = voices.find((v) => v.id === testingId);

  return (
    <div className="space-y-4">
      {/* Live playback indicator — confirms audio is actually flowing */}
      {currentlyTesting && (
        <div className="sticky top-2 z-10 rounded-2xl border-2 border-primary bg-primary/10 px-4 py-3 flex items-center gap-3 shadow-md">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
          </span>
          <Volume2 className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-extrabold">Đang phát {currentlyTesting.name}</span>
            <span className="text-muted-foreground ml-1.5">
              ({currentlyTesting.voiceId})
            </span>
          </div>
          <span className="text-xs text-muted-foreground">Nếu không nghe: kiểm tra loa/volume</span>
        </div>
      )}

      {/* Add new voice form */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            <h2 className="font-bold">Thêm giọng mới</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div>
              <label className="text-xs font-bold mb-1 block">Voice ID</label>
              <Input
                placeholder="aura-2-aurora-en"
                value={newVoiceId}
                onChange={(e) => setNewVoiceId(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block">Tên hiển thị</label>
              <Input placeholder="Aurora" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block">Accent</label>
              <select
                value={newAccent}
                onChange={(e) => setNewAccent(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {ACCENTS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block">Giới tính</label>
              <select
                value={newGender}
                onChange={(e) => setNewGender(e.target.value as "Nữ" | "Nam")}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="Nữ">Nữ</option>
                <option value="Nam">Nam</option>
              </select>
            </div>
          </div>
          <Button onClick={addVoice} disabled={adding} variant="brand" className="w-full sm:w-auto">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Thêm giọng
          </Button>
          <p className="text-xs text-muted-foreground">
            Voice ID phải khớp với một Deepgram Aura voice (xem{" "}
            <a
              href="https://developers.deepgram.com/docs/tts-models"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              danh sách của Deepgram
            </a>
            ). Nhấn nút Play sau khi thêm để kiểm tra voice ID có hợp lệ không.
          </p>
        </CardContent>
      </Card>

      {/* Voices list */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr className="text-left">
                <th className="px-3 py-2 font-bold">Voice ID</th>
                <th className="px-3 py-2 font-bold">Tên</th>
                <th className="px-3 py-2 font-bold">Accent</th>
                <th className="px-3 py-2 font-bold">Giới tính</th>
                <th className="px-3 py-2 font-bold">Default</th>
                <th className="px-3 py-2 font-bold">Hiện</th>
                <th className="px-3 py-2 font-bold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {voices.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                    Chưa có giọng nào. Thêm Aurora ở trên để bắt đầu.
                  </td>
                </tr>
              )}
              {voices.map((v) => (
                <tr key={v.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-3 py-2 font-mono text-xs">{v.voiceId}</td>
                  <td className="px-3 py-2 font-semibold">{v.name}</td>
                  <td className="px-3 py-2">{v.accent}</td>
                  <td className="px-3 py-2">{v.gender}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => patchVoice(v.id, { isDefault: !v.isDefault })}
                      disabled={busyId === v.id}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold transition-all ${
                        v.isDefault
                          ? "bg-amber-100 text-amber-700"
                          : "bg-muted text-muted-foreground hover:bg-muted/70"
                      }`}
                      title={v.isDefault ? "Đang là default" : "Đặt làm default"}
                    >
                      <Star className={`h-3 w-3 ${v.isDefault ? "fill-amber-500" : ""}`} />
                      {v.isDefault ? "Default" : "Đặt default"}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => patchVoice(v.id, { enabled: !v.enabled })}
                      disabled={busyId === v.id}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold transition-all ${
                        v.enabled
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {v.enabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {v.enabled ? "Hiện" : "Ẩn"}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testVoice(v)}
                        disabled={testingId === v.id}
                        className="rounded-full"
                      >
                        {testingId === v.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                        Phát thử
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteVoice(v.id)}
                        disabled={busyId === v.id || v.isDefault}
                        className="rounded-full text-rose-600 hover:bg-rose-50"
                        title={v.isDefault ? "Không xóa được giọng default" : "Xóa giọng này"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
