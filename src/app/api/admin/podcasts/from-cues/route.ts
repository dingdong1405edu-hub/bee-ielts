/**
 * POST /api/admin/podcasts/from-cues
 *
 * Companion to /from-youtube — accepts pre-fetched caption cues from
 * the browser so we sidestep YouTube's bot detection on Railway IPs.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminOrOwner } from "@/lib/premium";
import {
  extractYoutubeId,
  getYouTubeBasicInfo,
  mergeCuesIntoSegments,
  refineSegmentsForShadowing,
  youtubeThumbnail,
} from "@/lib/youtube";

const cueSchema = z.object({
  text: z.string().min(1),
  offsetSec: z.number().min(0),
  durationSec: z.number().min(0),
});

const bodySchema = z.object({
  youtubeUrl: z.string().min(1),
  title: z.string().max(200).optional().default(""),
  channel: z.string().max(80).optional().default(""),
  cues: z.array(cueSchema).min(1).max(5000),
});

export const maxDuration = 90;

export async function POST(req: Request) {
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

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const ytId = extractYoutubeId(parsed.data.youtubeUrl);
  if (!ytId) {
    return NextResponse.json({ error: "URL YouTube không hợp lệ" }, { status: 400 });
  }

  const existing = await prisma.podcastEpisode.findUnique({ where: { youtubeId: ytId } });
  if (existing) {
    return NextResponse.json(
      { error: "Video này đã có trong podcast — không tạo trùng.", id: existing.id },
      { status: 409 },
    );
  }

  let ytTitle = "";
  let ytChannel = "";
  let durationSec = 0;
  try {
    const info = await getYouTubeBasicInfo(ytId);
    ytTitle = info.title;
    ytChannel = info.channelTitle ?? "";
    durationSec = Math.round(info.durationSec);
  } catch (e) {
    console.warn(`[podcasts/from-cues] getBasicInfo soft-fail ytId=${ytId}:`, e);
  }
  // Fallback duration from cues themselves if metadata fetch failed.
  if (durationSec === 0 && parsed.data.cues.length > 0) {
    const last = parsed.data.cues[parsed.data.cues.length - 1];
    durationSec = Math.round(last.offsetSec + last.durationSec);
  }

  const finalTitle = (parsed.data.title?.trim() || ytTitle || `Podcast ${ytId}`).slice(0, 200);
  const finalChannel = (parsed.data.channel?.trim() || ytChannel || "YouTube").slice(0, 80);

  const merged = refineSegmentsForShadowing(
    mergeCuesIntoSegments(parsed.data.cues, { targetSec: 8, maxSec: 15, gapSec: 1.5 }),
  );
  if (merged.length === 0) {
    return NextResponse.json(
      { error: "Cues parse ra 0 segment — kiểm tra format." },
      { status: 422 },
    );
  }

  const episode = await prisma.podcastEpisode.create({
    data: {
      title: finalTitle,
      channel: finalChannel,
      youtubeId: ytId,
      thumbnailUrl: youtubeThumbnail(ytId),
      durationSec,
      transcriptJson: merged.map((s) => ({
        startSec: s.startSec,
        endSec: s.endSec,
        textEn: s.textEn,
      })),
      published: true,
    },
  });

  return NextResponse.json({
    id: episode.id,
    segmentCount: merged.length,
    durationSec,
  });
}
