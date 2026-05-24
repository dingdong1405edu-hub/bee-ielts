"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Loader2, Upload, X, FileText, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
const MAX_PDF_BYTES = 12 * 1024 * 1024;

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
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [camLink, setCamLink] = useState("");
  const [busy, setBusy] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

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
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const addPdf = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Chỉ nhận file .pdf");
      return;
    }
    if (f.size > MAX_PDF_BYTES) {
      toast.error("File PDF quá lớn (>12MB) — chia nhỏ hoặc xuất ảnh từng trang");
      return;
    }
    try {
      const data = await readAsDataUrl(f);
      setPdfDataUrl(data);
      setPdfName(f.name);
      toast.success(`Đã chọn ${f.name}`);
    } catch {
      toast.error("Không đọc được file PDF");
    }
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  };

  const generate = async () => {
    if (!text.trim() && images.length === 0 && !pdfDataUrl && !camLink.trim()) {
      toast.error("Dán nội dung, tải ảnh/PDF, hoặc dán link CamScanner trước");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/reading/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: text.trim() || undefined,
          images,
          pdfDataUrl: pdfDataUrl ?? undefined,
          camScannerUrl: !pdfDataUrl && camLink.trim() ? camLink.trim() : undefined,
          bank,
        }),
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
          Có thể (1) dán nguyên đề chữ, (2) tải ảnh chụp/scan từng trang, (3) tải file PDF từ
          CamScanner, hoặc (4) dán link CamScanner. AI đọc tất cả, tự nhận dạng loại câu hỏi,
          tự giải và tạo bài Reading hoàn chỉnh — bạn chỉ cần kiểm tra lại.
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

        <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-primary">
            <FileText className="h-4 w-4" /> Tải file PDF từ CamScanner
          </div>
          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => addPdf(e.target.files)}
          />
          {pdfDataUrl ? (
            <div className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate font-medium">{pdfName}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setPdfDataUrl(null);
                  setPdfName(null);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              disabled={busy}
              onClick={() => pdfInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" /> Chọn file PDF
            </Button>
          )}
          <div>
            <Label className="text-xs">Hoặc dán link CamScanner</Label>
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                value={camLink}
                onChange={(e) => setCamLink(e.target.value)}
                disabled={busy || !!pdfDataUrl}
                placeholder="https://v3.camscanner.com/... hoặc Google Drive direct link"
                className="text-[13px]"
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              ⚠️ Link CamScanner thường cần đăng nhập — nếu lỗi, vào app CamScanner → Share →
              <strong> Save PDF</strong> rồi tải file lên ở nút trên. Google Drive nhớ đổi sang
              link “Anyone with the link” + dạng <span className="font-mono">uc?export=download&id=…</span>.
            </p>
          </div>
        </div>

        <div>
          <input
            ref={imageInputRef}
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
            onClick={() => imageInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" /> Tải ảnh đề lên (chụp / scan)
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            Dùng khi chỉ có ảnh — không cần gõ lại. Tối đa {MAX_IMAGES} ảnh.
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
