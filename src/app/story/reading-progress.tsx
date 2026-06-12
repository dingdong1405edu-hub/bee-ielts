"use client";
import { useEffect, useState } from "react";

/** Thanh tiến độ đọc mảnh ở đỉnh trang — đầy dần theo lượng cuộn. */
export function ReadingProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setPct(max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-1.5" aria-hidden="true">
      <div
        className="h-full rounded-r-full bg-gradient-to-r from-honey via-gold-300 to-leaf shadow-[0_1px_6px_rgba(224,165,43,0.5)] transition-[width] duration-150 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
