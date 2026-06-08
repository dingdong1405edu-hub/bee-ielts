"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, ImageIcon, Loader2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BeeLogo, LeafField, Leaf } from "@/components/brand";
import { cn } from "@/lib/utils";

interface Props {
  name: string;
  email: string;
  bio: string;
  avatarUrl: string | null;
  coverUrl: string | null;
}

/** Load a File into an HTMLImageElement. */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không đọc được ảnh"));
    };
    img.src = url;
  });
}

/** Resize an image file to fit within maxW×maxH and return a JPEG data URL. */
async function resizeToDataUrl(file: File, maxW: number, maxH: number, quality = 0.85): Promise<string> {
  const img = await loadImage(file);
  let { width, height } = img;
  const ratio = Math.min(maxW / width, maxH / height, 1);
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas không khả dụng");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

export function ProfileHeader({ name, email, bio, avatarUrl, coverUrl }: Props) {
  const router = useRouter();
  const [avatar, setAvatar] = useState(avatarUrl);
  const [cover, setCover] = useState(coverUrl);
  const [busy, setBusy] = useState<"avatar" | "cover" | "info" | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(name);
  const [bioVal, setBioVal] = useState(bio);

  const save = async (payload: Record<string, string>, kind: "avatar" | "cover" | "info") => {
    setBusy(kind);
    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi");
      toast.success("Đã lưu");
      router.refresh();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu thất bại");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const onPickAvatar = async (file: File) => {
    try {
      const dataUrl = await resizeToDataUrl(file, 320, 320, 0.85);
      const ok = await save({ avatarUrl: dataUrl }, "avatar");
      if (ok) setAvatar(dataUrl);
    } catch {
      toast.error("Không xử lý được ảnh");
    }
  };

  const onPickCover = async (file: File) => {
    try {
      const dataUrl = await resizeToDataUrl(file, 1280, 480, 0.82);
      const ok = await save({ coverUrl: dataUrl }, "cover");
      if (ok) setCover(dataUrl);
    } catch {
      toast.error("Không xử lý được ảnh");
    }
  };

  const saveInfo = async () => {
    if (!nameVal.trim()) {
      toast.error("Tên không được để trống");
      return;
    }
    const ok = await save({ name: nameVal.trim(), bio: bioVal.trim() }, "info");
    if (ok) setEditing(false);
  };

  const initials = (nameVal || email).slice(0, 2).toUpperCase();

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      {/* COVER */}
      <div className="relative h-40 md:h-56">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="cover" className="h-full w-full object-cover" />
        ) : (
          <div className="relative h-full w-full gradient-brand overflow-hidden">
            
            <LeafField className="absolute inset-0 text-white" />
            <BeeLogo
              variant="full"
              title="Bee IELTS"
              className="absolute -bottom-6 -right-4 h-40 w-40 text-white/25 rotate-[8deg]"
            />
            <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
              <BeeLogo variant="bare" className="h-4 w-4 text-white" />
              Bee IELTS
            </div>
          </div>
        )}
        <button
          onClick={() => coverInput.current?.click()}
          disabled={busy === "cover"}
          className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-white hover:bg-black/70 transition-colors"
        >
          {busy === "cover" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
          Đổi ảnh bìa
        </button>
        <input
          ref={coverInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPickCover(f);
            e.target.value = "";
          }}
        />
      </div>

      {/* AVATAR + INFO */}
      <div className="px-4 md:px-6 pb-5">
        <div className="flex items-end gap-4 -mt-12 md:-mt-14">
          <div className="relative shrink-0">
            <div className="h-24 w-24 md:h-28 md:w-28 rounded-full ring-4 ring-card bg-muted overflow-hidden grid place-items-center">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-extrabold text-muted-foreground">{initials}</span>
              )}
            </div>
            <button
              onClick={() => avatarInput.current?.click()}
              disabled={busy === "avatar"}
              className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full gradient-brand text-white ring-2 ring-card hover:opacity-90 transition-opacity"
              aria-label="Đổi ảnh đại diện"
            >
              {busy === "avatar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input
              ref={avatarInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickAvatar(f);
                e.target.value = "";
              }}
            />
          </div>

          <div className="flex-1 min-w-0 pb-1">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="float-right flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" /> Sửa
              </button>
            )}
            {editing ? (
              <input
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                maxLength={60}
                className="w-full max-w-xs rounded-lg border-2 px-2 py-1 text-lg font-extrabold bg-background"
              />
            ) : (
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight truncate flex items-center gap-1.5">
                {nameVal || "Học viên"}
                <Leaf className="h-4 w-4 shrink-0 text-leaf" />
              </h1>
            )}
            <p className="text-sm text-muted-foreground truncate">{email}</p>
          </div>
        </div>

        {/* BIO */}
        <div className="mt-3">
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={bioVal}
                onChange={(e) => setBioVal(e.target.value)}
                maxLength={200}
                rows={2}
                placeholder="Viết vài dòng giới thiệu về bạn..."
                className="w-full rounded-lg border-2 px-3 py-2 text-sm bg-background resize-none"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="brand" className="rounded-full" onClick={saveInfo} disabled={busy === "info"}>
                  {busy === "info" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Lưu
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    setEditing(false);
                    setNameVal(name);
                    setBioVal(bio);
                  }}
                >
                  <X className="h-4 w-4" /> Huỷ
                </Button>
              </div>
            </div>
          ) : (
            <p className={cn("text-sm", bioVal ? "text-foreground" : "text-muted-foreground italic")}>
              {bioVal || "Chưa có giới thiệu. Nhấn 'Sửa' để thêm."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
