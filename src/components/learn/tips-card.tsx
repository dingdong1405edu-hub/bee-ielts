"use client";
import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

type Skill = "READING" | "LISTENING" | "WRITING" | "SPEAKING" | "VOCAB" | "GRAMMAR";

interface TipResponse {
  tips: { title: string; detail: string }[];
  encouragement: string;
}

export function TipsCard({ skill, score, context }: { skill: Skill; score?: number; context?: string }) {
  const [data, setData] = useState<TipResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch("/api/tips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skill, score, context }),
        });
        const j = await res.json();
        if (!cancel) setData(j);
      } catch (e) {
        if (!cancel) setErr("Không tải được tips");
        console.error(e);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [skill, score, context]);

  if (loading) {
    return (
      <div className="rounded-2xl border bg-card p-5 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> AI đang chuẩn bị tips cho bạn...
      </div>
    );
  }
  if (err || !data) return null;

  return (
    <div className="rounded-3xl border bg-gradient-to-br from-honey-tint via-card to-amber-50 p-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl gradient-brand text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <h3 className="text-lg font-extrabold tracking-tight">Tips để tốt hơn lần sau</h3>
      </div>
      <p className="text-sm text-muted-foreground italic">{data.encouragement}</p>
      <ul className="mt-4 space-y-3">
        {data.tips.map((t, i) => (
          <li key={i} className="rounded-2xl bg-card p-4 border">
            <div className="font-bold text-sm">{t.title}</div>
            <div className="text-sm text-muted-foreground mt-0.5">{t.detail}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
