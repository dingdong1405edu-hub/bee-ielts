"use client";

/**
 * PaperFileField — upload a PDF or audio file (stored as a base64 data URL, the
 * same pattern as the admin AudioUrlField) OR paste a public URL. Shows a live
 * preview and a remove button. Used by CustomAssignmentBuilder for the đề-bài
 * PDF and the listening MP3.
 */
import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Headphones, ImageIcon, Link2, Loader2, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type FileKind = "pdf" | "audio" | "image";

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
}

export function PaperFileField({
  kind,
  label,
  value,
  onChange,
  maxBytes,
}: {
  kind: FileKind;
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxBytes: number;
}) {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const url = value.trim();
  const isData = url.startsWith("data:");
  const accept = kind === "pdf" ? "application/pdf" : kind === "image" ? "image/*" : "audio/*";
  const typeOk = (f: File) =>
    kind === "pdf" ? f.type === "application/pdf" : kind === "image" ? f.type.startsWith("image/") : f.type.startsWith("audio/");
  const maxMb = Math.round(maxBytes / 1024 / 1024);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!typeOk(file)) {
      toast.error(
        kind === "pdf" ? "Hãy chọn một file PDF" : kind === "image" ? "Hãy chọn một ảnh" : "Hãy chọn một file âm thanh (mp3, m4a…)",
      );
      return;
    }
    if (file.size > maxBytes) {
      toast.error(
        `File quá lớn (${(file.size / 1024 / 1024).toFixed(1)} MB). Tối đa ${maxMb} MB — file lớn hãy dùng link công khai.`,
      );
      return;
    }
    setBusy(true);
    try {
      onChange(await readAsDataUrl(file));
      toast.success("Đã tải file lên");
    } catch {
      toast.error("Không đọc được file");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const Icon = kind === "pdf" ? FileText : kind === "image" ? ImageIcon : Headphones;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {url ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 h-10 text-sm">
            <Icon className="h-4 w-4 text-primary" />
            <span className="truncate font-medium">
              {isData ? "File đã tải lên" : url}
            </span>
            <button
              type="button"
              onClick={() => onChange("")}
              className="ml-auto grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted"
              aria-label="Xoá file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {kind === "audio" ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <audio controls src={url} className="w-full" />
          ) : kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={label} className="max-h-64 w-full rounded-md border bg-white object-contain" />
          ) : (
            <iframe src={url} title={label} className="h-64 w-full rounded-md border bg-white" />
          )}
        </div>
      ) : (
        <div className="relative">
          <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Dán URL công khai: https://…"
            className="pl-8"
          />
        </div>
      )}

      <div>
        <input
          ref={fileRef}
          type="file"
          accept={accept}
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
          Tải file lên (tối đa {maxMb} MB)
        </Button>
      </div>
    </div>
  );
}
