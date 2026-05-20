"use client";
import { useState } from "react";
import { ImageIcon, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** URL-paste image field with live preview. Paired with the existing Writing.imageUrl pattern. */
export function ImageUrlField({
  value,
  onChange,
  hint,
  label = "URL ảnh (tuỳ chọn)",
}: {
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  label?: string;
}) {
  const [broken, setBroken] = useState(false);
  const url = value.trim();
  const looksLikeUrl = url.length > 0 && /^(https?:\/\/|\/)/i.test(url);

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => {
            setBroken(false);
            onChange(e.target.value);
          }}
          placeholder="https://… hoặc /images/abc.jpg"
        />
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
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      {looksLikeUrl && !broken && (
        <div className="mt-2 relative overflow-hidden rounded-xl border bg-muted/30 max-h-72">
          {/* Use plain <img> to avoid Next/Image domain config requirements for arbitrary URLs. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Ảnh xem trước"
            className="block w-full max-h-72 object-contain"
            onError={() => setBroken(true)}
          />
        </div>
      )}
      {looksLikeUrl && broken && (
        <p className="text-xs text-destructive mt-1 inline-flex items-center gap-1">
          <ImageIcon className="h-3 w-3" /> Không tải được ảnh — kiểm tra URL.
        </p>
      )}
    </div>
  );
}
