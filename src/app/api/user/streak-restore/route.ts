import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { currentMonthKey, STREAK_RESTORE_MAX_PER_MONTH } from "@/lib/streak";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const monthKey = currentMonthKey();
  const usedThisMonth = user.streakRestoreMonth === monthKey ? user.streakRestoresUsed : 0;
  if (usedThisMonth >= STREAK_RESTORE_MAX_PER_MONTH) {
    return NextResponse.json({ error: "Đã dùng hết 5 lượt restore tháng này" }, { status: 400 });
  }

  // Restore: set lastActiveAt to today so streak continues; ensure streak >= 1
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastActiveAt: yesterday,
      streakDays: user.streakDays > 0 ? user.streakDays : 1,
      streakRestoresUsed: usedThisMonth + 1,
      streakRestoreMonth: monthKey,
    },
  });

  return NextResponse.json({ ok: true, remaining: STREAK_RESTORE_MAX_PER_MONTH - usedThisMonth - 1 });
}
