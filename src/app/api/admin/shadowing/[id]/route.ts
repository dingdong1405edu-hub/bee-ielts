import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminOrOwner } from "@/lib/premium";
import { extractYoutubeId, youtubeThumbnail } from "@/lib/youtube";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!me || !isAdminOrOwner(me)) return null;
  return me;
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.shadowingLesson.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

const segmentSchema = z.object({
  /** Existing segment id — if absent, we create a new row. */
  id: z.string().optional(),
  startSec: z.number().min(0),
  endSec: z.number().min(0),
  textEn: z.string().min(1).max(2000),
  textVi: z.string().max(2000).nullable().optional(),
  ipa: z.string().max(2000).nullable().optional(),
});

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  source: z.string().min(1).max(80).optional(),
  /** CEFR level. Pass null to clear it. */
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).nullable().optional(),
  youtubeUrl: z.string().min(1).optional(),
  published: z.boolean().optional(),
  /** Premium gate — only Premium/admin accounts may open when true. */
  premium: z.boolean().optional(),
  /** When present, segments are FULLY replaced by this array. Items with
   *  an `id` are updated; items without are created; existing segments not
   *  referenced are deleted. Order = array index (1-based). */
  segments: z.array(segmentSchema).optional(),
});

/**
 * PATCH /api/admin/shadowing/[id]
 *
 * Admin edit endpoint. Updates lesson metadata + (optionally) the full
 * segment list. Segments are reconciled with the existing rows so the order
 * of inputs becomes the new display order, and any DB row whose id is
 * missing from the payload is deleted.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const lesson = await prisma.shadowingLesson.findUnique({
    where: { id },
    select: { id: true, youtubeId: true },
  });
  if (!lesson) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const lessonPatch: {
    title?: string;
    source?: string;
    level?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | null;
    published?: boolean;
    premium?: boolean;
    youtubeId?: string;
    thumbnailUrl?: string;
  } = {};
  if (data.title !== undefined) lessonPatch.title = data.title.trim();
  if (data.source !== undefined) lessonPatch.source = data.source.trim();
  if (data.level !== undefined) lessonPatch.level = data.level;
  if (data.published !== undefined) lessonPatch.published = data.published;
  if (data.premium !== undefined) lessonPatch.premium = data.premium;
  if (data.youtubeUrl !== undefined) {
    const newId = extractYoutubeId(data.youtubeUrl);
    if (!newId) {
      return NextResponse.json(
        { error: "URL YouTube không hợp lệ" },
        { status: 400 },
      );
    }
    lessonPatch.youtubeId = newId;
    lessonPatch.thumbnailUrl = youtubeThumbnail(newId);
  }

  // Validate segment ranges before we touch the DB.
  if (data.segments) {
    for (const [i, s] of data.segments.entries()) {
      if (s.endSec <= s.startSec) {
        return NextResponse.json(
          { error: `Đoạn #${i + 1}: end phải lớn hơn start` },
          { status: 400 },
        );
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    if (Object.keys(lessonPatch).length > 0) {
      await tx.shadowingLesson.update({ where: { id }, data: lessonPatch });
    }
    if (!data.segments) return;

    const existing = await tx.shadowingSegment.findMany({
      where: { lessonId: id },
      select: { id: true },
    });
    const keepIds = new Set(
      data.segments.map((s) => s.id).filter(Boolean) as string[],
    );
    const toDelete = existing.filter((e) => !keepIds.has(e.id)).map((e) => e.id);
    if (toDelete.length > 0) {
      await tx.shadowingSegment.deleteMany({ where: { id: { in: toDelete } } });
    }

    // Two-phase rewrite: bump every kept row's order out of the way first,
    // THEN write the new orders. Without this, the @@unique([lessonId, order])
    // constraint trips when two rows swap positions inside the same txn.
    if (keepIds.size > 0) {
      await tx.shadowingSegment.updateMany({
        where: { lessonId: id },
        data: { order: { increment: 10_000 } },
      });
    }

    for (const [idx, s] of data.segments.entries()) {
      const order = idx + 1;
      const payload = {
        startSec: s.startSec,
        endSec: s.endSec,
        textEn: s.textEn.trim(),
        textVi: s.textVi?.trim() || null,
        ipa: s.ipa?.trim() || null,
      };
      if (s.id) {
        await tx.shadowingSegment.update({
          where: { id: s.id },
          data: { ...payload, order },
        });
      } else {
        await tx.shadowingSegment.create({
          data: { ...payload, order, lessonId: id },
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
