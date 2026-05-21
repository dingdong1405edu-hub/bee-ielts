"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Music, X, Upload, Link2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

/** Max size for an uploaded audio file. Bigger files should use a public URL. */
const MAX_BYTES = 15 * 1024 * 1024;

/** Read a File as a data URL. */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
}

/**
 * Audio field for a listening test. The admin can paste a public URL or
 * upload a file from the computer. An uploaded file is stored as a data URL
 * directly in the DB so every learner can play it — unlike a `file:///`
 * path, which only exists on the admin's own machine.
 */
export function AudioUrlField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const url = value.trim();
  const isData = url.startsWith("data:audio");
  const playable = url.length > 0 && /^(https?:\/\/|\/|data:audio)/i.test(url);
  const isLocalFileLink = /^file:\/\//i.test(url);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      toast.error("Hãy chọn một file âm thanh (mp3, m4a, wav…)");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(
        `File quá lớn (${(file.size / 1024 / 1024).toFixed(1)} MB). Tối đa 15 MB — audio dài hãy dùng link công khai.`,
      );
      return;
    }
    setBusy(true);
    try {
      onChange(await readAsDataUrl(file));
      toast.success("Đã tải file âm thanh lên");
    } catch {
      toast.error("Không đọc được file âm thanh");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <Label>Audio bài nghe</Label>

      {isData ? (
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 h-10 text-sm">
          <Music className="h-4 w-4 text-primary" />
          <span className="font-medium">File âm thanh đã tải lên</span>
          <button
            type="button"
            onClick={() => onChange("")}
            className="ml-auto grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"
            aria-label="Xoá audio"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Dán URL công khai: https://… hoặc /audio/abc.mp3"
              className="pl-8"
            />
          </div>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted"
              aria-label="Xoá"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <div className="mt-2">
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Tải file âm thanh lên
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-1.5">
        Tải file mp3/m4a từ máy lên (tối đa 15 MB) để mọi người học đều nghe được. Đường dẫn
        dạng <span className="font-mono">file:///…</span> chỉ tồn tại trên máy bạn — người
        khác sẽ không mở được. Audio dài (đề thi đầy đủ) nên dùng link công khai.
      </p>

      {isLocalFileLink && (
        <p className="text-xs text-destructive mt-1">
          Đây là link file trên máy bạn — người học khác không nghe được. Hãy bấm “Tải file
          âm thanh lên”.
        </p>
      )}

      {playable && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio controls src={url} className="mt-2 w-full" />
      )}
    </div>
  );
}
