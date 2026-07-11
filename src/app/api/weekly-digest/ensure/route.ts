/**
 * POST /api/weekly-digest/ensure — sinh tin tổng kết tuần cho người đang đăng
 * nhập nếu tuần này chưa có. Được gọi "bắn rồi quên" từ WeeklyDigestTrigger khi
 * người dùng mở dashboard / trang giáo viên, nên KHÔNG chặn render trang.
 * Idempotent + tự khoá — gọi bao nhiêu lần cũng chỉ sinh 1 tin/tuần.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ensureWeeklyDigest } from "@/lib/weekly-digest";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // AI viết tin mất vài giây

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  try {
    const result = await ensureWeeklyDigest(session.user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    // Không phải lỗi chặn người dùng — chỉ là tuần này chưa có tin, sẽ thử lại.
    console.error("[weekly-digest] failed:", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Lỗi tạo tin" }, { status: 500 });
  }
}
