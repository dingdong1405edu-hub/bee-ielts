"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Read a File as a data URL. */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
}

/** Downscale a scanned page to a JPEG data URL — still sharp enough for OCR. */
function compressImage(src: string, maxW = 2000): Promise<string> {
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
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("load failed"));
    img.src = src;
  });
}

const MAX_IMAGES = 8;

/**
 * AI-powered reading-test creator: the admin pastes a whole exam (passage +
 * questions) or uploads scanned page images, and Claude detects the question
 * types, solves them, and builds a complete test. The admin is sent to the
 * edit page afterwards to review before it goes live.
 */
export function ReadingAiImport({ bank }: { bank: "PRACTICE" | "MOCK" }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      toast.error(`Tối đa ${MAX_IMAGES} ảnh`);
      return;
    }
    const out: string[] = [];
    for (const f of Array.from(files).slice(0, room)) {
      if (!f.type.startsWith("image/")) continue;
      try {
        out.push(await compressImage(await readAsDataUrl(f)));
      } catch {
        toast.error(`Không xử lý được ảnh "${f.name}"`);
      }
    }
    if (out.length) setImages((prev) => [...prev, ...out]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const generate = async () => {
    if (!text.trim() && images.length === 0) {
      toast.error("Dán nội dung đề hoặc tải ảnh đề lên trước");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/reading/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: text.trim() || undefined, images, bank }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Tạo đề thất bại");
      toast.success("AI đã tạo xong đề — kiểm tra lại rồi bấm Lưu");
      router.push(`/admin/reading/${data.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tạo đề thất bại");
      setBusy(false);
    }
  };

  return (
    <Card className="max-w-3xl border-primary/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> Tạo đề bằng AI
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Dán nguyên cả đề (đoạn văn + câu hỏi) hoặc tải ảnh chụp/scan đề lên. AI sẽ tự nhận
          dạng loại câu hỏi, tự giải và tạo bài Reading hoàn chỉnh — bạn chỉ cần kiểm tra lại.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Dán toàn bộ đề thi</Label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
            className="min-h-[200px] font-mono text-[13px]"
            placeholder={"Dán cả phần hướng dẫn, List of Headings, câu hỏi và đoạn văn vào đây…"}
          />
        </div>

        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            disabled={busy || images.length >= MAX_IMAGES}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" /> Tải ảnh đề lên (chụp / scan)
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            Dùng được cả khi chỉ có ảnh, không cần gõ lại. File PDF: hãy xuất/chụp từng trang
            thành ảnh. Tối đa {MAX_IMAGES} ảnh.
          </p>
          {images.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {images.map((src, i) => (
                <div key={i} className="relative h-20 w-16 overflow-hidden rounded-md border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Trang ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((_, j) => j !== i))}
                    disabled={busy}
                    className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded bg-black/60 text-white"
                    aria-label="Xoá ảnh"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={generate} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "AI đang đọc & tạo đề…" : "Tạo đề bằng AI"}
          </Button>
          {busy && (
            <span className="text-xs text-muted-foreground">
              Có thể mất ~30–60 giây cho một đề đầy đủ.
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
