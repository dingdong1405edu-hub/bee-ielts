/**
 * POST /api/admin/podcasts/classify-levels
 *
 * Auto-assign a CEFR difficulty to every podcast episode that doesn't have
 * one yet, using its STORED transcript (transcriptJson) — no YouTube fetch.
 * Mirrors /api/admin/shadowing/classify-levels: only fills level = null rows,
 * bounded per call, returns `remaining` so the admin can finish a big backlog
 * with repeated clicks.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminOrOwner } from "@/lib/premium";
import { estimateCefrLevel } from "@/lib/claude";

const BATCH_CAP = 40;
export const maxDuration = 300;

/** transcriptJson is [{ startSec, endSec, textEn }] — pull a text sample. */
function transcriptSample(json: unknown): string {
  if (!Array.isArray(json)) return "";
  return json
    .slice(0, 25)
    .map((s) => (s && typeof s === "object" && "textEn" in s ? String((s as { textEn?: unknown }).textEn ?? "") : ""))
    .join(" ");
}

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

  const totalNull = await prisma.podcastEpisode.count({ where: { level: null } });
  const episodes = await prisma.podcastEpisode.findMany({
    where: { level: null },
    orderBy: { createdAt: "desc" },
    take: BATCH_CAP,
    select: { id: true, transcriptJson: true },
  });

  let classified = 0;
  const CONCURRENCY = 5;
  for (let i = 0; i < episodes.length; i += CONCURRENCY) {
    const slice = episodes.slice(i, i + CONCURRENCY);
    await Promise.all(
      slice.map(async (ep) => {
        const sample = transcriptSample(ep.transcriptJson);
        const level = await estimateCefrLevel(sample);
        if (!level) return;
        await prisma.podcastEpisode.update({ where: { id: ep.id }, data: { level } });
        classified += 1;
      }),
    );
  }

  return NextResponse.json({
    classified,
    scanned: episodes.length,
    remaining: Math.max(0, totalNull - classified),
  });
}
