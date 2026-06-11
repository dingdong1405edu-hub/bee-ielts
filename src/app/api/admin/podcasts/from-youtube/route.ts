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
  fetchYouTubeCaptionsViaInvidious,
  fetchYouTubeCaptionsViaLibrary,
  getYouTubeBasicInfo,
  mergeCuesIntoSegments,
  refineSegmentsForShadowing,
  youtubeThumbnail,
} from "@/lib/youtube";

const bodySchema = z.object({
  youtubeUrl: z.string().min(1),
  title: z.string().max(200).optional().default(""),
  channel: z.string().max(80).optional().default(""),
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

  // Captions — required. Three parallel paths, each a different surface
  // to YouTube's bot detection:
  //   1) Invidious public proxies (residential IPs — most reliable when
  //      Railway IP is bot-flagged)
  //   2) youtubei.js library (manages own session, cookies, signature_ts)
  //   3) Raw InnerTube POST (last resort — usually hits LOGIN_REQUIRED)
  let cues;
  let availableLangs: string[] = [];
  let invidiousErr: string | null = null;
  let libraryErr: string | null = null;

  try {
    const result = await fetchYouTubeCaptionsViaInvidious(ytId);
    availableLangs = result.availableLangs;
    if (result.cues.length > 0) cues = result.cues;
  } catch (e) {
    invidiousErr = e instanceof Error ? e.message : String(e);
    console.warn(`[podcasts] invidious fail ytId=${ytId}: ${invidiousErr}`);
  }

  if (!cues) {
    try {
      const result = await fetchYouTubeCaptionsViaLibrary(ytId);
      if (availableLangs.length === 0) availableLangs = result.availableLangs;
      if (result.cues.length > 0) cues = result.cues;
    } catch (e) {
      libraryErr = e instanceof Error ? e.message : String(e);
      console.warn(`[podcasts] library captions fail ytId=${ytId}: ${libraryErr}`);
    }
  }

  if (!cues) {
    try {
      const result = await fetchYouTubeCaptionsViaInnertube(ytId);
      if (availableLangs.length === 0) availableLangs = result.availableLangs;
      if (result.cues.length > 0) cues = result.cues;
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      console.error(`[podcasts] InnerTube captions fail ytId=${ytId}:`, raw);
      return NextResponse.json(
        {
          error:
            `Lấy phụ đề thất bại qua cả 3 path. Invidious: ${invidiousErr ?? "n/a"} | Library: ${libraryErr ?? "n/a"} | InnerTube: ${raw}`,
        },
        { status: 422 },
      );
    }
  }

  if (!cues) {
    const langs = availableLangs.length > 0
      ? ` (Phụ đề có: ${availableLangs.join(", ")})`
      : "";
    return NextResponse.json(
      {
        error:
          `Video không có phụ đề tiếng Anh.${langs} Podcast cần transcript EN — chọn video khác.`,
      },
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
