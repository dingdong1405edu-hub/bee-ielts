import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { effectivePremium } from "@/lib/premium";

/**
 * Learner submits a Premium upgrade request. Idempotent at the "pending"
 * level — if there's already a PENDING row we update its message instead
 * of stacking duplicates in the owner's queue. Already-premium accounts
 * 409 so the UI can show the right state.
 */
const schema = z.object({
  message: z.string().max(800).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
  const message = (parsed.data.message ?? "").trim() || null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isPremium: true },
  });
  if (!user) return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 });
  if (effectivePremium(user as { role: "LEARNER" | "ADMIN" | "OWNER"; isPremium: boolean })) {
    return NextResponse.json(
      { error: "Tài khoản đã là Premium" },
      { status: 409 },
    );
  }

  // Reuse the open PENDING row if there is one — admin will see the latest
  // message but won't get duplicate queue entries from impatient clicks.
  const existing = await prisma.premiumRequest.findFirst({
    where: { userId: session.user.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    await prisma.premiumRequest.update({
      where: { id: existing.id },
      data: { message, createdAt: new Date() },
    });
    return NextResponse.json({ ok: true, status: "PENDING", updated: true });
  }
  await prisma.premiumRequest.create({
    data: { userId: session.user.id, message, status: "PENDING" },
  });
  return NextResponse.json({ ok: true, status: "PENDING", updated: false });
}
