/**
 * POST /api/admin/shadowing/from-cues
 *
 * Companion to /from-youtube — accepts caption cues that the BROWSER
 * already fetched (via browser-side CORS-proxied transcript services).
 * This bypasses YouTube's bot detection on Railway IPs entirely: the
 * browser's home IP is residential, so it can fetch what the server
 * cannot.
 *
 * Server side just does what it's good at: merge cues → Claude enrichment
 * (IPA + Vietnamese) → DB write. Zero YouTube fetching, so no LOGIN_REQUIRED
 * surface at all.
 *
 * Body shape:
 *   {
 *     youtubeUrl: "https://www.youtube.com/watch?v=...",
 *     title?: "...",
 *     source?: "...",
 *     cues: [{ text, offsetSec, durationSec }, ...]
 *   }
 *
 * Validates cues are well-formed, English (Latin ratio), non-empty.
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
import { enrichShadowingSegments } from "@/lib/claude";

const cueSchema = z.object({
  text: z.string().min(1),
  offsetSec: z.number().min(0),
  durationSec: z.number().min(0),
});

const bodySchema = z.object({
  youtubeUrl: z.string().min(1),
  title: z.string().max(200).optional().default(""),
  source: z.string().max(80).optional().default(""),
  cues: z.array(cueSchema).min(1).max(5000),
});

export const maxDuration = 300;

function latinRatio(text: string): number {
  const stripped = text.replace(/\s+/g, "");
  if (stripped.length === 0) return 0;
  const latin = stripped.match(/[A-Za-z]/g)?.length ?? 0;
  return latin / stripped.length;
}

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

  // Sanity-check the cues are English. The browser path might pull a
  // non-English caption track if the auto-detection picked wrong.
  const sampleText = parsed.data.cues
    .slice(0, 20)
    .map((c) => c.text)
    .join(" ");
  if (latinRatio(sampleText) < 0.6) {
    return NextResponse.json(
      {
        error:
          "Transcript browser-side gửi lên không phải tiếng Anh — Shadowing yêu cầu nội dung EN.",
      },
      { status: 422 },
    );
  }

  // Try to enrich title/channel from YouTube metadata. Non-fatal — if YT
  // basic info also fails (uncommon but possible), use fallback strings.
  let ytTitle = "";
  let ytChannel = "";
  try {
    const info = await getYouTubeBasicInfo(ytId);
    ytTitle = info.title;
    ytChannel = info.channelTitle ?? "";
  } catch (e) {
    console.warn(`[from-cues] getBasicInfo soft-fail ytId=${ytId}:`, e);
  }
  const finalTitle = (parsed.data.title?.trim() || ytTitle || `Video ${ytId}`).slice(0, 200);
  const finalSource = (parsed.data.source?.trim() || ytChannel || "YouTube").slice(0, 80);

  const merged = refineSegmentsForShadowing(
    mergeCuesIntoSegments(parsed.data.cues),
  );
  if (merged.length === 0) {
    return NextResponse.json(
      { error: "Cues từ browser parse ra 0 segment — kiểm tra format." },
      { status: 422 },
    );
  }

  // Claude enrichment — same shape as /from-youtube.
  const enriched = new Map<number, { ipa: string; textVi: string }>();
  const BATCH = 40;
  for (let i = 0; i < merged.length; i += BATCH) {
    const slice = merged.slice(i, i + BATCH);
    try {
      const items = await enrichShadowingSegments({
        segments: slice.map((s) => ({ textEn: s.textEn })),
      });
      for (const it of items) {
        const globalIdx = i + (it.index - 1);
        if (globalIdx >= 0 && globalIdx < merged.length) {
          enriched.set(globalIdx, { ipa: it.ipa || "", textVi: it.textVi || "" });
        }
      }
    } catch (e) {
      console.error(
        `[from-cues] enrich batch ${i}..${i + slice.length} failed:`,
        e instanceof Error ? e.message : e,
      );
    }
  }

  const sourceBadge = `${finalSource.slice(0, 70)} · trình duyệt`.slice(0, 80);
  let lesson;
  try {
    lesson = await prisma.shadowingLesson.create({
      data: {
        title: finalTitle,
        source: sourceBadge,
        youtubeId: ytId,
        thumbnailUrl: youtubeThumbnail(ytId),
        createdBy: null,
        published: true,
        segments: {
          create: merged.map((s, i) => {
            const en = enriched.get(i);
            return {
              order: i + 1,
              startSec: s.startSec,
              endSec: s.endSec,
              textEn: s.textEn,
              textVi: en?.textVi || null,
              ipa: en?.ipa || null,
            };
          }),
        },
      },
    });
  } catch (e) {
    console.error(`[from-cues] DB write failed ytId=${ytId}:`, e);
    return NextResponse.json(
      { error: "Đã enrich xong nhưng lưu DB lỗi. Thử lại — nếu lặp lại, kiểm tra log." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: lesson.id,
    segmentCount: merged.length,
    enriched: enriched.size,
    method: "browser",
  });
}
