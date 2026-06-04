import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * Mark a band-climb stage as completed for the current user. Idempotent —
 * tapping the "Đánh dấu hoàn thành" button twice doesn't blow up because
 * the (userId, bandStageId) pair is unique. Used by the gate that locks
 * stage N+1 until stage N is finished: see /band-climber listing.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const stage = await prisma.bandStage.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!stage) {
    return NextResponse.json({ error: "Stage not found" }, { status: 404 });
  }

  try {
    await prisma.bandStageProgress.upsert({
      where: { userId_bandStageId: { userId: session.user.id, bandStageId: id } },
      update: {},
      create: { userId: session.user.id, bandStageId: id },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[band-climber/complete]", e);
    return NextResponse.json({ error: "Lưu thất bại" }, { status: 500 });
  }
}
