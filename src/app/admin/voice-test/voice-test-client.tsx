"use client";

import { useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Play, Pause, Speaker, Check } from "lucide-react";
import { toast } from "sonner";
import { ALL_AURA2_VOICES, type AuraVoicePreview } from "@/lib/tts-voices";

const DEFAULT_SAMPLE_TEXT =
  "Hi, good afternoon. Today I want to ask you some questions. Let's begin with Part one. What do you like to do in your free time?";

type GenderFilter = "all" | "Nữ" | "Nam";
type AccentFilter = "all" | "Mỹ" | "Anh" | "Úc" | "Filipino";

/** Standalone admin page that previews EVERY Aura 2 voice with the same sample
 *  text so admin can A/B them side-by-side and identify which voice matches a
 *  reference recording. Once identified, admin tells us the voice ID and we
 *  pin it in SPEAKING_EXAMINER_VOICES. */
export function VoiceTestClient() {
  const [sampleText, setSampleText] = useState(DEFAULT_SAMPLE_TEXT);
  const [gender, setGender] = useState<GenderFilter>("Nữ");
  const [accent, setAccent] = useState<AccentFilter>("Mỹ");

  const filtered = useMemo(() => {
    return ALL_AURA2_VOICES.filter(
      (v) => (gender === "all" || v.gender === gender) && (accent === "all" || v.accent === accent),
    );
  }, [gender, accent]);

  return (
    <div className="max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Thử giọng đọc Deepgram</h1>
        <p className="text-muted-foreground">
          Nghe thử tất cả {ALL_AURA2_VOICES.length} giọng Aura 2 với cùng 1 đoạn mẫu — tìm ra giọng
          khớp với bản ghi tham chiếu của bạn, rồi báo lại tên giọng để mình pin vào Speaking.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Nội dung đọc thử
            </label>
            <Textarea
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              className="min-h-[80px] text-sm mt-1"
              placeholder="Gõ câu mẫu — mọi giọng sẽ đọc đúng câu này..."
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                Giới tính
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {(["all", "Nữ", "Nam"] as GenderFilter[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`rounded-full border-2 px-3 py-1 text-xs font-bold transition-all ${
                      gender === g
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {g === "all" ? "Tất cả" : g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                Giọng vùng
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {(["all", "Mỹ", "Anh", "Úc", "Filipino"] as AccentFilter[]).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAccent(a)}
                    className={`rounded-full border-2 px-3 py-1 text-xs font-bold transition-all ${
                      accent === a
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {a === "all" ? "Tất cả" : a}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        Hiển thị {filtered.length} / {ALL_AURA2_VOICES.length} giọng
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((v) => (
          <VoiceCard key={v.id} voice={v} sampleText={sampleText} />
        ))}
      </div>
    </div>
  );
}

function VoiceCard({ voice, sampleText }: { voice: AuraVoicePreview; sampleText: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchAudio = async () => {
    if (!sampleText.trim()) {
      toast.error("Hãy gõ câu mẫu trước");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/speaking/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sampleText, voice: voice.id }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${res.status}: ${txt.slice(0, 120)}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      // Auto-play once loaded.
      setTimeout(() => {
        audioRef.current?.play().catch(() => undefined);
      }, 50);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  };

  const copyVoiceId = async () => {
    try {
      await navigator.clipboard.writeText(voice.id);
      toast.success(`Đã copy ${voice.id}`);
    } catch {
      toast.error("Không copy được — hãy chọn thủ công");
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-extrabold text-base truncate">{voice.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {voice.gender} · {voice.accent}
            </div>
            <div className="text-[11px] text-muted-foreground italic mt-0.5 line-clamp-2">
              {voice.blurb}
            </div>
          </div>
          <Speaker className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>

        <button
          type="button"
          onClick={copyVoiceId}
          className="w-full text-[10px] font-mono text-left text-muted-foreground hover:text-foreground rounded bg-muted/40 px-2 py-1 truncate"
          title="Bấm để copy voice ID"
        >
          {voice.id}
        </button>

        <div className="flex gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={fetchAudio}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang gọi...
              </>
            ) : audioUrl ? (
              <>
                <Play className="h-3.5 w-3.5" /> Phát lại
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" /> Phát thử
              </>
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={copyVoiceId}
            title="Copy voice ID để báo lại cho dev"
          >
            <Check className="h-3.5 w-3.5" /> Copy ID
          </Button>
        </div>

        {error && (
          <div className="rounded-md bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 p-2 text-[11px] text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            className="w-full h-8"
            preload="metadata"
          />
        )}

        {playing && (
          <div className="text-[10px] text-primary font-semibold inline-flex items-center gap-1">
            <Pause className="h-3 w-3" /> Đang phát
          </div>
        )}
      </CardContent>
    </Card>
  );
}
