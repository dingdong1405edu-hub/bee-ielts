/**
 * POST /api/admin/podcasts/from-youtube
 *
 * Admin pastes a YouTube link → we pull captions via the same proven
 * Innertube path that the shadowing module uses (commit f64ec68), then
 * persist a PodcastEpisode row. No audio download — podcasts are pure
 * passive listening, so if a video has no English captions we tell admin
 * to pick another one rather than burning Deepgram credits.
 *
 * Returns `{ id }` on success so the admin client can navigate the
 * learner straight into the new episode.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminOrOwner } from "@/lib/premium";
import {
  extractYoutubeId,
  fetchYouTubeCaptionsViaInnertube,
  getYouTubeBasicInfo,
  mergeCuesIntoSegments,
  refineSegmentsForShadowing,
  youtubeThumbnail,
} from "@/lib/youtube";
import { estimateCefrLevel } from "@/lib/claude";
import { toCefrLevel } from "@/lib/cefr";
import { logAdminActivity } from "@/lib/admin-activity";

const bodySchema = z.object({
  youtubeUrl: z.string().min(1),
  title: z.string().max(200).optional().default(""),
  channel: z.string().max(80).optional().default(""),
  /** CEFR difficulty. If omitted, AI estimates it from the transcript. */
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
});

// Caption fetch is the only network-bound work — bound at 60s.
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

  // Reject duplicates upfront so admins get a clearer error than "unique
  // constraint failed" coming out of Prisma.
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
    if (info.isLive) {
      return NextResponse.json(
        { error: "Video đang livestream — chọn video đã phát xong." },
        { status: 422 },
      );
    }
    ytTitle = info.title;
    ytChannel = info.channelTitle ?? "";
    durationSec = Math.round(info.durationSec);
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    console.error(`[podcasts] getBasicInfo failed ytId=${ytId}:`, raw);
    return NextResponse.json(
      { error: `Không lấy được thông tin video: ${raw}` },
      { status: 422 },
    );
  }

  // Captions — required. If the video has no EN track, podcast won't be
  // useful (no transcript = pure audio, but our player banks on the
  // transcript scrolling). Surface a clear error instead of saving a
  // half-broken episode.
  let cues;
  try {
    const result = await fetchYouTubeCaptionsViaInnertube(ytId);
    if (result.cues.length === 0) {
      const langs = result.availableLangs.length > 0
        ? ` (Phụ đề có: ${result.availableLangs.join(", ")})`
        : "";
      return NextResponse.json(
        {
          error:
            `Video không có phụ đề tiếng Anh.${langs} Podcast cần transcript EN — chọn video khác.`,
        },
        { status: 422 },
      );
    }
    cues = result.cues;
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    console.error(`[podcasts] captions failed ytId=${ytId}:`, raw);
    return NextResponse.json(
      { error: `Lấy phụ đề thất bại: ${raw}` },
      { status: 422 },
    );
  }

  // Podcast segments don't need to be as bite-size as shadowing — users
  // are listening passively, not drilling rhythm. 8s/15s target/max is
  // comfortable reading rhythm for transcript scrolling.
  const merged = refineSegmentsForShadowing(
    mergeCuesIntoSegments(cues, { targetSec: 8, maxSec: 15, gapSec: 1.5 }),
  );
  if (merged.length === 0) {
    return NextResponse.json(
      { error: "Không tạo ra được transcript hợp lệ — kiểm tra video." },
      { status: 422 },
    );
  }

  const finalTitle = (parsed.data.title?.trim() || ytTitle || `Podcast ${ytId}`).slice(0, 200);
  const finalChannel = (parsed.data.channel?.trim() || ytChannel || "YouTube").slice(0, 80);

  // Difficulty: admin's pick, else AI estimates from a transcript sample.
  let level = toCefrLevel(parsed.data.level);
  if (!level) {
    const sample = merged.slice(0, 20).map((s) => s.textEn).join(" ");
    level = await estimateCefrLevel(sample);
  }

  const episode = await prisma.podcastEpisode.create({
    data: {
      title: finalTitle,
      channel: finalChannel,
      level,
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

  await logAdminActivity({
    action: "CREATE",
    entityType: "PODCAST_EPISODE",
    entityId: episode.id,
    entityTitle: finalTitle,
  });

  return NextResponse.json({
    id: episode.id,
    segmentCount: merged.length,
    durationSec,
  });
}
