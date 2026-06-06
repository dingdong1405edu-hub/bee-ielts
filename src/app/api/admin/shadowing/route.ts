import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminOrOwner } from "@/lib/premium";
import { extractYoutubeId, youtubeThumbnail } from "@/lib/youtube";

const segmentSchema = z.object({
  startSec: z.number().min(0),
  endSec: z.number().min(0),
  textEn: z.string().min(1),
  textVi: z.string().optional().nullable(),
  ipa: z.string().optional().nullable(),
});

const createSchema = z.object({
  title: z.string().min(1).max(200),
  source: z.string().min(1).max(80),
  youtubeUrl: z.string().min(1),
  segments: z.array(segmentSchema).min(1).max(500),
});

export async function GET() {
  const session = await auth();
  const me = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      })
    : null;
  if (!me || !isAdminOrOwner(me)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const lessons = await prisma.shadowingLesson.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { segments: true } } },
  });
  return NextResponse.json({ lessons });
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
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const ytId = extractYoutubeId(parsed.data.youtubeUrl);
  if (!ytId) {
    return NextResponse.json({ error: "URL YouTube không hợp lệ" }, { status: 400 });
  }
  for (const s of parsed.data.segments) {
    if (s.endSec <= s.startSec) {
      return NextResponse.json(
        { error: "Mỗi đoạn cần endSec > startSec" },
        { status: 400 },
      );
    }
  }
  const lesson = await prisma.shadowingLesson.create({
    data: {
      title: parsed.data.title.trim(),
      source: parsed.data.source.trim(),
      youtubeId: ytId,
      thumbnailUrl: youtubeThumbnail(ytId),
      createdBy: null, // admin-created lessons stay community-owned
      published: true,
      segments: {
        create: parsed.data.segments.map((s, i) => ({
          order: i + 1,
          startSec: s.startSec,
          endSec: s.endSec,
          textEn: s.textEn.trim(),
          textVi: s.textVi?.trim() || null,
          ipa: s.ipa?.trim() || null,
        })),
      },
    },
  });
  return NextResponse.json({ id: lesson.id });
}
