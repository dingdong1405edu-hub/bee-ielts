"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImageIcon, X, Upload, Sparkles, Loader2, Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

/** Read a File as a data URL. */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
}

/** Downscale + re-encode an image to a compact JPEG data URL (keeps DB rows small). */
function compressImage(src: string, maxW = 1000): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => reject(new Error("load failed"));
    img.src = src;
  });
}

/**
 * Cover-image field with three ways to set an image: paste a URL, upload a
 * file from the computer, or generate one with AI. Uploaded/AI images are
 * compressed to a small JPEG data URL stored directly in the DB.
 */
export function ImageUrlField({
  value,
  onChange,
  hint,
  label = "Ảnh bìa (tuỳ chọn)",
  aiContext,
}: {
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  label?: string;
  aiContext?: string;
}) {
  const [broken, setBroken] = useState(false);
  const [busy, setBusy] = useState<"upload" | "ai" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const url = value.trim();
  const isData = url.startsWith("data:image/");
  const looksLikeUrl = url.length > 0 && /^(https?:\/\/|\/|data:image\/)/i.test(url);

  const setImage = (v: string) => {
    setBroken(false);
    onChange(v);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Hãy chọn một file ảnh");
      return;
    }
    setBusy("upload");
    try {
      const raw = await readAsDataUrl(file);
      setImage(await compressImage(raw));
      toast.success("Đã tải ảnh lên");
    } catch {
      toast.error("Không xử lý được ảnh");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const generateAI = async () => {
    const prompt = aiContext?.trim();
    if (!prompt) {
      toast.error("Nhập tiêu đề/chủ đề của đề trước khi để AI tạo ảnh");
      return;
    }
    setBusy("ai");
    try {
      const res = await fetch("/api/admin/cover-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Tạo ảnh thất bại");
      setImage(await compressImage(data.dataUrl));
      toast.success("AI đã tạo ảnh bìa");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tạo ảnh thất bại");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <Label>{label}</Label>

      {isData ? (
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 h-10 text-sm">
          <ImageIcon className="h-4 w-4 text-primary" />
          <span className="font-medium">Ảnh đã sẵn sàng (tải lên / AI tạo)</span>
          <button
            type="button"
            onClick={() => onChange("")}
            className="ml-auto grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"
            aria-label="Xoá ảnh"
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
              onChange={(e) => setImage(e.target.value)}
              placeholder="Dán URL ảnh: https://… hoặc /images/abc.jpg"
              className="pl-8"
            />
          </div>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted"
              aria-label="Xoá ảnh"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg"
          disabled={busy !== null}
          onClick={() => fileRef.current?.click()}
        >
          {busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Tải ảnh lên
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg"
          disabled={busy !== null}
          onClick={generateAI}
        >
          {busy === "ai" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy === "ai" ? "AI đang vẽ ảnh…" : "AI tạo ảnh bìa"}
        </Button>
      </div>

      {hint && <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>}

      {looksLikeUrl && !broken && (
        <div className="mt-2 overflow-hidden rounded-xl border bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Ảnh bìa xem trước"
            className="block w-full max-h-72 object-contain"
            onError={() => setBroken(true)}
          />
        </div>
      )}
      {looksLikeUrl && broken && (
        <p className="text-xs text-destructive mt-1 inline-flex items-center gap-1">
          <ImageIcon className="h-3 w-3" /> Không tải được ảnh — kiểm tra lại URL.
        </p>
      )}
    </div>
  );
}
