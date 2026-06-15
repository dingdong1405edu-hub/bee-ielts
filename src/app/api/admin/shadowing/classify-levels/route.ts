/**
 * POST /api/admin/shadowing/classify-levels
 *
 * Auto-assign a CEFR difficulty to every shadowing lesson that doesn't have
 * one yet. Works entirely off each lesson's STORED segment text — no YouTube
 * fetch — so it runs fine even while YouTube blocks the server IP.
 *
 * Only touches lessons with level = null (never overwrites a level an admin
 * set by hand). Bounded to BATCH_CAP lessons per call so the request can't
 * time out on a huge backlog; returns `remaining` so the admin can click
 * again to finish.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminOrOwner } from "@/lib/premium";
import { estimateCefrLevel } from "@/lib/claude";

// One estimateCefrLevel call per lesson (~0.5-1s). 40 keeps us well under the
// limit even when the model is slow; the admin re-clicks for the next batch.
const BATCH_CAP = 40;
export const maxDuration = 300;

export async function POST() {
  const session = await auth();
  const me = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, role: true },
      })
    : null;
  if (!me || !isAdminOrOwner(me)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const totalNull = await prisma.shadowingLesson.count({ where: { level: null } });
  const lessons = await prisma.shadowingLesson.findMany({
    where: { level: null },
    orderBy: { createdAt: "desc" },
    take: BATCH_CAP,
    select: {
      id: true,
      segments: { orderBy: { order: "asc" }, take: 30, select: { textEn: true } },
    },
  });

  let classified = 0;
  // Small concurrency so a backlog finishes fast without hammering the API.
  const CONCURRENCY = 5;
  for (let i = 0; i < lessons.length; i += CONCURRENCY) {
    const slice = lessons.slice(i, i + CONCURRENCY);
    await Promise.all(
      slice.map(async (l) => {
        const sample = l.segments.map((s) => s.textEn).join(" ");
        const level = await estimateCefrLevel(sample);
        if (!level) return;
        await prisma.shadowingLesson.update({ where: { id: l.id }, data: { level } });
        classified += 1;
      }),
    );
  }

  return NextResponse.json({
    classified,
    scanned: lessons.length,
    remaining: Math.max(0, totalNull - classified),
  });
}
