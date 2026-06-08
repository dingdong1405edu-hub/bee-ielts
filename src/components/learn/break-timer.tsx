"use client";
import { useEffect, useState } from "react";
import { Coffee, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";

export function BreakTimer({ seconds = 900, onDone }: { seconds?: number; onDone: () => void }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      onDone();
      return;
    }
    const t = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(t);
  }, [remaining, onDone]);

  return (
    <div className="min-h-[70vh] grid place-items-center px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-gold-400 to-gold-500 text-white shadow-2xl shadow-gold-500/40 mb-6 animate-float">
          <Coffee className="h-12 w-12" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight">Giờ nghỉ ☕</h2>
        <p className="text-muted-foreground mt-2">Đứng dậy giãn cơ, uống nước, hít thở sâu một chút nào.</p>

        <div className="my-10">
          <div className="text-7xl md:text-8xl font-extrabold tracking-tighter gradient-brand-text">
            {formatDuration(remaining)}
          </div>
          <div className="text-sm text-muted-foreground mt-2">phút : giây còn lại</div>
        </div>

        <Button onClick={onDone} variant="outline" size="lg" className="rounded-full">
          <SkipForward className="h-4 w-4" /> Bỏ qua, vào phần tiếp theo
        </Button>
      </div>
    </div>
  );
}
