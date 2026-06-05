import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAdminActivity } from "@/lib/admin-activity";

const createSchema = z.object({
  voiceId: z.string().min(3).max(80),
  name: z.string().min(1).max(40),
  accent: z.string().min(1).max(40),
  gender: z.enum(["Nữ", "Nam"]),
  isDefault: z.boolean().default(false),
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

  const voices = await prisma.speakingVoice.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ voices });
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
    // If marked default, unset any other default first.
    if (data.isDefault) {
      await prisma.speakingVoice.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }
    const lastOrder = await prisma.speakingVoice.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const voice = await prisma.speakingVoice.create({
      data: { ...data, order: (lastOrder?.order ?? -1) + 1 },
    });
    await logAdminActivity({
      action: "CREATE",
      entityType: "SPEAKING_VOICE",
      entityId: voice.id,
      entityTitle: `${voice.name} (${voice.voiceId})`,
    });
    return NextResponse.json({ voice });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "voiceId đã tồn tại" }, { status: 409 });
    }
    console.error("[admin/voices POST]", e);
    return NextResponse.json({ error: "Tạo voice thất bại" }, { status: 500 });
  }
}
