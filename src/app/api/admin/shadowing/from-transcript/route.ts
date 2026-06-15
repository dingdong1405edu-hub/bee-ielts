/**
 * POST /api/admin/shadowing/from-transcript
 *
 * The YouTube-block escape hatch. When YouTube blocks the server's IP (the
 * datacenter bot-check that breaks /from-youtube), the admin copies the
 * transcript themselves — from YouTube's "Show transcript" panel, or a .vtt /
 * .srt file — and pastes it here. The server NEVER calls YouTube's player /
 * captions API, so this path always works regardless of IP reputation.
 *
 * The pasted transcript is parsed into timed cues, then run through the exact
 * same pipeline as the auto path:
 *   parseTranscript → mergeCuesIntoSegments → refineSegmentsForShadowing →
 *   Claude enrich (IPA + Vietnamese) → DB write.
 *
 * Only the YouTube *id* is read from the URL (a local regex) so the lesson can
 * embed the player + show its thumbnail.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminOrOwner } from "@/lib/premium";
import {
  extractYoutubeId,
  mergeCuesIntoSegments,
  refineSegmentsForShadowing,
  youtubeThumbnail,
} from "@/lib/youtube";
import { parseTranscript } from "@/lib/transcript-parse";
import { enrichShadowingSegments, estimateCefrLevel } from "@/lib/claude";
import { toCefrLevel } from "@/lib/cefr";

const bodySchema = z.object({
  youtubeUrl: z.string().min(1),
  transcript: z.string().min(1),
  title: z.string().max(200).optional().default(""),
  source: z.string().max(80).optional().default(""),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
});

// Claude enrichment of a long transcript can run 1-3 min; allow headroom.
export const maxDuration = 600;

/** Ratio of A-Z characters — guards against a pasted non-English transcript. */
function latinRatio(text: string): number {
  const stripped = text.replace(/\s+/g, "");
  if (stripped.length === 0) return 0;
  return (stripped.match(/[A-Za-z]/g)?.length ?? 0) / stripped.length;
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

  // 1. Parse the pasted transcript into timed cues.
  const cues = parseTranscript(parsed.data.transcript);
  if (cues.length === 0) {
    return NextResponse.json(
      {
        error:
          "Không tìm thấy dòng nào có mốc thời gian. Dán transcript từ YouTube (nút " +
          '"Show transcript / Hiện bản chép lời" dưới video) — gồm mốc thời gian + câu, ' +
          "hoặc dán file .vtt / .srt.",
      },
      { status: 422 },
    );
  }

  // 2. Same merge + refine pass as the caption/audio paths.
  const merged = refineSegmentsForShadowing(mergeCuesIntoSegments(cues));
  if (merged.length === 0) {
    return NextResponse.json(
      { error: "Transcript hợp lệ nhưng gộp ra 0 đoạn — kiểm tra lại nội dung." },
      { status: 422 },
    );
  }

  // 3. English sanity check (pasted Vietnamese / other-language transcript).
  const sample = merged.slice(0, 12).map((s) => s.textEn).join(" ");
  if (latinRatio(sample) < 0.6) {
    return NextResponse.json(
      { error: "Transcript có vẻ không phải tiếng Anh — module Shadowing cần nội dung tiếng Anh." },
      { status: 422 },
    );
  }

  // 4. Claude IPA + Vietnamese for every segment (batched like /from-youtube).
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
        `[from-transcript] enrich batch ${i}..${i + slice.length} failed ytId=${ytId}:`,
        e instanceof Error ? e.message : e,
      );
    }
  }

  // 5. CEFR level: admin's choice, else AI estimate from a transcript sample.
  let level = toCefrLevel(parsed.data.level);
  if (!level) {
    level = await estimateCefrLevel(merged.slice(0, 25).map((s) => s.textEn).join(" "));
  }

  // 6. Persist. Title/source can't be auto-pulled from YouTube here (no
  //    metadata fetch), so fall back to sensible defaults when blank.
  const finalTitle = (parsed.data.title?.trim() || `Shadowing ${ytId}`).slice(0, 200);
  const finalSource = (parsed.data.source?.trim() || "YouTube").slice(0, 80);

  let lesson;
  try {
    lesson = await prisma.shadowingLesson.create({
      data: {
        title: finalTitle,
        source: finalSource,
        level,
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
    console.error(
      `[from-transcript] DB write failed ytId=${ytId} segments=${merged.length}:`,
      e instanceof Error ? e.message : e,
    );
    return NextResponse.json(
      { error: "Đã xử lý xong nhưng lưu DB lỗi. Thử lại — nếu lặp lại, kiểm tra log Railway." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: lesson.id,
    segmentCount: merged.length,
    enriched: enriched.size,
    method: "transcript",
  });
}
