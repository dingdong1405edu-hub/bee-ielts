"use client";
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";

export interface BandStageOption {
  id: string;
  fromBand: number;
  toBand: number;
  title: string;
}

/**
 * Shared admin form control: pick a Vượt band stage to attach this
 * exercise to. Loads the stage list on mount via /api/admin/band-climber.
 * Pass a `value` (current bandStageId or null) and an `onChange` setter.
 */
export function BandStageSelect({
  value,
  onChange,
  label = "Gắn vào chặng Vượt band",
  help = "Đề gắn vào chặng sẽ bị ẩn khỏi trang luyện tập công khai và chỉ hiển thị trong /band-climber.",
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  label?: string;
  help?: string;
}) {
  const [stages, setStages] = useState<BandStageOption[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/band-climber")
      .then((r) => (r.ok ? r.json() : { stages: [] }))
      .then((d: { stages?: BandStageOption[] }) => {
        if (!cancelled) setStages(d.stages ?? []);
      })
      .catch(() => {
        if (!cancelled) setStages([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">— Không gắn (đề công khai) —</option>
        {(stages ?? []).map((s) => (
          <option key={s.id} value={s.id}>
            {s.fromBand.toFixed(1)} → {s.toBand.toFixed(1)} — {s.title}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">{help}</p>
    </div>
  );
}
