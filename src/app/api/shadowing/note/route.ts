/**
 * GET  /api/shadowing/note?lessonId=...  → load this user's note for a lesson
 * PUT  /api/shadowing/note               → upsert the note text (autosaved
 *                                          by the player on blur / debounce)
 *
 * One row per (userId, lessonId). Empty text deletes the row to keep the
 * Notes tab tidy.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const lessonId = url.searchParams.get("lessonId") ?? "";
  if (!lessonId) {
    return NextResponse.json({ error: "lessonId required" }, { status: 400 });
  }
  const note = await prisma.shadowingNote.findUnique({
    where: { userId_lessonId: { userId: session.user.id, lessonId } },
    select: { text: true, updatedAt: true },
  });
  return NextResponse.json({ text: note?.text ?? "", updatedAt: note?.updatedAt ?? null });
}

const putSchema = z.object({
  lessonId: z.string().min(1),
  text: z.string().max(20_000),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = putSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const text = parsed.data.text.trim();
  const where = {
    userId_lessonId: { userId: session.user.id, lessonId: parsed.data.lessonId },
  };
  if (!text) {
    await prisma.shadowingNote.deleteMany({
      where: { userId: session.user.id, lessonId: parsed.data.lessonId },
    });
    return NextResponse.json({ ok: true, text: "" });
  }
  const saved = await prisma.shadowingNote.upsert({
    where,
    update: { text },
    create: { userId: session.user.id, lessonId: parsed.data.lessonId, text },
    select: { text: true, updatedAt: true },
  });
  return NextResponse.json({ ok: true, ...saved });
}
