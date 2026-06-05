import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { MUSIC_SCOPES } from "@/lib/music-scopes";
import { logAdminActivity } from "@/lib/admin-activity";

const scopeValues = MUSIC_SCOPES.map((s) => s.value) as [string, ...string[]];

const createSchema = z.object({
  name: z.string().min(1).max(80),
  audioUrl: z.string().min(4),
  scopes: z.array(z.enum(scopeValues)).min(1),
  volume: z.number().min(0).max(1).default(0.4),
  enabled: z.boolean().default(true),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN" && (session.user as { role?: string }).role !== "OWNER") {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tracks = await prisma.backgroundMusic.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ tracks });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad input", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  try {
    const lastOrder = await prisma.backgroundMusic.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const track = await prisma.backgroundMusic.create({
      data: { ...data, order: (lastOrder?.order ?? -1) + 1 },
    });
    await logAdminActivity({
      action: "CREATE",
      entityType: "BACKGROUND_MUSIC",
      entityId: track.id,
      entityTitle: track.name,
    });
    return NextResponse.json({ track });
  } catch (e) {
    console.error("[admin/music POST]", e);
    return NextResponse.json({ error: "Tạo bản nhạc thất bại" }, { status: 500 });
  }
}
