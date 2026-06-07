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
import {
  YoutubeTranscript,
  YoutubeTranscriptNotAvailableLanguageError,
} from "youtube-transcript";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminOrOwner } from "@/lib/premium";
import { extractYoutubeId, mergeCuesIntoSegments, youtubeThumbnail } from "@/lib/youtube";
import { enrichShadowingSegments } from "@/lib/claude";

/** Ratio of A-Z/a-z characters out of all non-space chars. Used to detect
 *  when YouTube returned a non-English track (e.g. Chinese) by mistake. */
function latinRatio(text: string): number {
  const stripped = text.replace(/\s+/g, "");
  if (stripped.length === 0) return 0;
  const latin = stripped.match(/[A-Za-z]/g)?.length ?? 0;
  return latin / stripped.length;
}

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

  // 1. Fetch caption track. STRICTLY English-only. We never fall back to
  //    `fetchTranscript(ytId)` without a lang because the library defaults
  //    to `captionTracks[0]`, which for non-English channels (Netflix Anime,
  //    K-content, etc.) is whatever the channel publishes first — often
  //    Chinese / Japanese / Korean — and we'd silently store CJK as the
  //    "English" shadowing source.
  type RawTr = { text: string; offset: number; duration: number };
  let cuesRaw: RawTr[] = [];
  let availableLangs: string[] = [];
  const triedLangs = new Set<string>();
  const tryLang = async (lang: string): Promise<RawTr[]> => {
    if (triedLangs.has(lang)) return [];
    triedLangs.add(lang);
    try {
      return await YoutubeTranscript.fetchTranscript(ytId, { lang });
    } catch (e) {
      if (e instanceof YoutubeTranscriptNotAvailableLanguageError) {
        // Library exposes available langs through the message; pull them out.
        const m = e.message.match(/Available languages:\s*(.+)$/);
        if (m) {
          availableLangs = m[1]
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
      }
      return [];
    }
  };
  for (const lang of ["en", "en-US", "en-GB"]) {
    cuesRaw = await tryLang(lang);
    if (cuesRaw.length > 0) break;
  }
  // Last-ditch: any track whose code starts with "en" (en-CA, en-AU, en-IN…).
  if (cuesRaw.length === 0 && availableLangs.length > 0) {
    const englishish = availableLangs.find((l) => l.toLowerCase().startsWith("en"));
    if (englishish) {
      cuesRaw = await tryLang(englishish);
    }
  }
  if (cuesRaw.length === 0) {
    const langsMsg =
      availableLangs.length > 0
        ? ` Track có sẵn: ${availableLangs.join(", ")}.`
        : "";
    return NextResponse.json(
      {
        error:
          "Video này KHÔNG có phụ đề tiếng Anh." +
          langsMsg +
          " Vui lòng dán transcript thủ công ở chế độ nâng cao, hoặc chọn video khác.",
      },
      { status: 422 },
    );
  }

  // Belt-and-braces: even if YouTube said this is `en`, sanity-check that
  // the actual text is mostly Latin alphabet. Catches mislabeled tracks
  // (the language tag says en but content is Chinese, etc.).
  const sampleText = cuesRaw
    .slice(0, 20)
    .map((c) => c.text)
    .join(" ");
  const ratio = latinRatio(sampleText);
  if (ratio < 0.6) {
    return NextResponse.json(
      {
        error:
          "Phụ đề tải được không phải tiếng Anh thật (tỉ lệ chữ Latin = " +
          Math.round(ratio * 100) +
          "%). Có thể video gắn nhầm track. Vui lòng dán transcript thủ công.",
      },
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
