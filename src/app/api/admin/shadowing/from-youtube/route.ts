/**
 * POST /api/admin/shadowing/from-youtube
 *
 * Admin pastes a YouTube URL → we fetch the video's English caption track,
 * merge the 2-3-word cues into shadowing-sized sentences, send the batch to
 * Claude for IPA + Vietnamese translation, and write the full ShadowingLesson
 * + ShadowingSegments to the DB. Admin can then open it and edit further.
 *
 * Fallback path: if the video has no English captions YouTube exposes a
 * specific error — we surface that so the admin form can show "fall back to
 * manual paste" guidance.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { YoutubeTranscript } from "youtube-transcript";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminOrOwner } from "@/lib/premium";
import { extractYoutubeId, mergeCuesIntoSegments, youtubeThumbnail } from "@/lib/youtube";
import { enrichShadowingSegments } from "@/lib/claude";

const bodySchema = z.object({
  title: z.string().min(1).max(200),
  source: z.string().min(1).max(80),
  youtubeUrl: z.string().min(1),
});

// Caption fetch + multi-batch Claude enrich can run 30-120s for a long
// video. Railway respects this; Vercel hobby caps at 60s.
export const maxDuration = 300;

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

  // 1. Fetch caption track. Prefer English variants; fall back to whatever
  //    YouTube returns (some channels only have auto-generated tracks).
  type RawTr = { text: string; offset: number; duration: number };
  let cuesRaw: RawTr[] = [];
  const tries = ["en", "en-US", "en-GB"];
  for (const lang of tries) {
    try {
      const cues = await YoutubeTranscript.fetchTranscript(ytId, { lang });
      if (cues.length > 0) {
        cuesRaw = cues;
        break;
      }
    } catch {
      // try next language
    }
  }
  if (cuesRaw.length === 0) {
    try {
      cuesRaw = await YoutubeTranscript.fetchTranscript(ytId);
    } catch (e) {
      return NextResponse.json(
        {
          error:
            "Video này không có phụ đề tiếng Anh. Vui lòng dán transcript thủ công ở chế độ nâng cao.",
          detail: e instanceof Error ? e.message : String(e),
        },
        { status: 422 },
      );
    }
  }
  if (cuesRaw.length === 0) {
    return NextResponse.json(
      { error: "Không lấy được phụ đề cho video này." },
      { status: 422 },
    );
  }

  // youtube-transcript returns either srv3 (ms) or classic (seconds) units.
  // Heuristic: if max duration is way above what a typical cue can be
  // (60s), treat the whole batch as milliseconds and divide by 1000.
  const maxDur = Math.max(...cuesRaw.map((c) => c.duration));
  const inMs = maxDur > 120;
  const scale = inMs ? 1000 : 1;
  const rawCues = cuesRaw.map((c) => ({
    text: c.text,
    offsetSec: c.offset / scale,
    durationSec: c.duration / scale,
  }));

  // 2. Merge into shadowing-sized chunks.
  const merged = mergeCuesIntoSegments(rawCues);
  if (merged.length === 0) {
    return NextResponse.json(
      { error: "Phụ đề trống sau khi gộp — video có thể không có lời thoại." },
      { status: 422 },
    );
  }

  // 3. Ask Claude for IPA + Vietnamese for every merged segment. Batch in
  //    chunks of 40 to keep each Claude call within max_tokens.
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
      // If Claude fails partway through, persist what we have without IPA/Vi
      // for the missing range — admin can fill them in by hand.
      console.error("enrichShadowingSegments failed", e);
    }
  }

  // 4. Persist.
  const lesson = await prisma.shadowingLesson.create({
    data: {
      title: parsed.data.title.trim(),
      source: parsed.data.source.trim(),
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

  return NextResponse.json({
    id: lesson.id,
    segmentCount: merged.length,
    enriched: enriched.size,
  });
}
