/**
 * POST /api/admin/shadowing/[id]/resegment
 *
 * Re-divide an EXISTING lesson's segments with the current dialogue-aware
 * splitter, without re-fetching anything from YouTube (handy when YouTube is
 * blocking the server). Each stored segment is fed back in as a "cue" — its
 * own text + timing — and run through mergeCuesIntoSegments +
 * refineSegmentsForShadowing. The new rules split on speaker turns ("- " /
 * ">>") and at every sentence end, so a segment that currently glues two
 * characters' lines together ("- Where are you going? - To the store.") comes
 * back out as one segment per speaker.
 *
 * IPA + Vietnamese are PRESERVED for any new segment whose English text is
 * unchanged (exact match against the old rows); only genuinely new pieces
 * (the split-apart dialogue lines) are sent to Claude for fresh enrichment —
 * keeps the cost near zero for lessons that barely change.
 *
 * Returns { ok, before, after, enriched, changed } so the admin UI can report
 * how many segments the re-split produced.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminOrOwner } from "@/lib/premium";
import { mergeCuesIntoSegments, refineSegmentsForShadowing } from "@/lib/youtube";
import { enrichShadowingSegments } from "@/lib/claude";

// Re-enrichment (Claude) for the split pieces can take a little while on a
// long lesson, but there is no audio/network download — 300s is plenty.
export const maxDuration = 300;

/** Normalise text for the "did this segment change?" comparison so trivial
 *  whitespace differences don't force a needless re-translation. */
function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  const lesson = await prisma.shadowingLesson.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!lesson) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const oldSegments = await prisma.shadowingSegment.findMany({
    where: { lessonId: id },
    orderBy: { order: "asc" },
    select: { startSec: true, endSec: true, textEn: true, textVi: true, ipa: true },
  });
  if (oldSegments.length === 0) {
    return NextResponse.json({ error: "Bài chưa có đoạn nào." }, { status: 400 });
  }

  // Feed each existing segment back in as a cue, then re-split with the
  // dialogue-aware pipeline.
  const cues = oldSegments.map((s) => ({
    text: s.textEn,
    offsetSec: s.startSec,
    durationSec: Math.max(0.3, s.endSec - s.startSec),
  }));
  const merged = refineSegmentsForShadowing(mergeCuesIntoSegments(cues));
  if (merged.length === 0) {
    return NextResponse.json(
      { error: "Re-chia ra 0 đoạn — không thay đổi gì." },
      { status: 422 },
    );
  }

  // Carry over IPA + Vietnamese for any segment whose English is unchanged.
  const oldByText = new Map<string, { textVi: string | null; ipa: string | null }>();
  for (const s of oldSegments) {
    oldByText.set(norm(s.textEn), { textVi: s.textVi, ipa: s.ipa });
  }
  const carried = merged.map((s) => oldByText.get(norm(s.textEn)) ?? null);

  // Enrich ONLY the new/changed pieces (the split-apart dialogue lines).
  const toEnrich: { globalIdx: number; textEn: string }[] = [];
  merged.forEach((s, i) => {
    if (!carried[i]) toEnrich.push({ globalIdx: i, textEn: s.textEn });
  });
  const enrichedMap = new Map<number, { ipa: string; textVi: string }>();
  const BATCH = 40;
  for (let i = 0; i < toEnrich.length; i += BATCH) {
    const slice = toEnrich.slice(i, i + BATCH);
    try {
      const items = await enrichShadowingSegments({
        segments: slice.map((s) => ({ textEn: s.textEn })),
      });
      for (const it of items) {
        const local = it.index - 1;
        if (local >= 0 && local < slice.length) {
          enrichedMap.set(slice[local].globalIdx, {
            ipa: it.ipa || "",
            textVi: it.textVi || "",
          });
        }
      }
    } catch (e) {
      console.error(
        `[resegment] enrich batch ${i} failed lesson=${id}:`,
        e instanceof Error ? e.message : e,
      );
    }
  }

  // Full replace: delete the old rows, write the freshly-split ones.
  await prisma.$transaction(async (tx) => {
    await tx.shadowingSegment.deleteMany({ where: { lessonId: id } });
    for (let i = 0; i < merged.length; i++) {
      const s = merged[i];
      const enriched = enrichedMap.get(i);
      const kept = carried[i];
      await tx.shadowingSegment.create({
        data: {
          lessonId: id,
          order: i + 1,
          startSec: s.startSec,
          endSec: s.endSec,
          textEn: s.textEn,
          textVi: kept?.textVi ?? enriched?.textVi ?? null,
          ipa: kept?.ipa ?? enriched?.ipa ?? null,
        },
      });
    }
  });

  return NextResponse.json({
    ok: true,
    before: oldSegments.length,
    after: merged.length,
    enriched: enrichedMap.size,
    changed: merged.length !== oldSegments.length,
  });
}
