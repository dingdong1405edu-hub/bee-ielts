"use client";

/**
 * WeeklyDigestTrigger — không render gì. Khi người dùng mở dashboard (hoặc trang
 * giáo viên), nó "bắn rồi quên" một request để máy chủ sinh tin tổng kết tuần
 * nếu tuần này chưa có. Chạy nền nên không làm chậm trang; máy chủ tự chống
 * trùng, sessionStorage chỉ để khỏi gọi lại nhiều lần trong cùng một tab/ngày.
 */
import { useEffect } from "react";

const KEY = "bee_weekly_digest_pinged";

export function WeeklyDigestTrigger() {
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      if (sessionStorage.getItem(KEY) === today) return;
      sessionStorage.setItem(KEY, today);
    } catch {
      /* private mode — cứ gọi, máy chủ vẫn idempotent */
    }
    void fetch("/api/weekly-digest/ensure", { method: "POST", keepalive: true }).catch(() => {});
  }, []);

  return null;
}
