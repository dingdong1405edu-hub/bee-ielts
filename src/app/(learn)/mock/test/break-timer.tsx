"use client";
import { useEffect, useState } from "react";
import { Coffee, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";

export function BreakTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          onDone();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [onDone]);

  const pct = (1 - remaining / seconds) * 100;

  return (
    <div className="min-h-[70vh] grid place-items-center">
      <div className="w-full max-w-xl text-center space-y-8">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl gradient-brand text-white shadow-2xl shadow-primary/30 animate-float">
          <Coffee className="h-9 w-9" />
        </div>
        <div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Giờ giải lao</h2>
          <p className="text-muted-foreground mt-2">Đứng dậy, vươn vai, uống nước nhé 💧</p>
        </div>

        <div className="relative mx-auto h-48 w-48">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" stroke="hsl(var(--muted))" strokeWidth="6" fill="none" />
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke="url(#g)"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              style={{
                strokeDasharray: 2 * Math.PI * 44,
                strokeDashoffset: 2 * Math.PI * 44 * (1 - pct / 100),
                transition: "stroke-dashoffset 1s linear",
              }}
            />
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="hsl(263 86% 60%)" />
                <stop offset="100%" stopColor="hsl(320 90% 60%)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl font-extrabold tracking-tight tabular-nums">{formatDuration(remaining)}</span>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">Tự động chuyển sang phần tiếp theo khi hết giờ</div>

        <Button onClick={onDone} variant="outline" size="lg" className="rounded-full">
          <SkipForward className="h-4 w-4" /> Skip break
        </Button>
      </div>
    </div>
  );
}
