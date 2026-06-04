import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * Learner redeems an admin-issued code. Codes are uppercase + unique;
 * each user can only redeem a given code once. Concurrent redeems are
 * safe because we wrap the usage-check + increment in a transaction
 * and rely on the `(couponId, userId)` unique constraint to bounce
 * duplicates.
 */
const schema = z.object({
  code: z.string().min(2).max(64),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Mã không hợp lệ" }, { status: 400 });
  }
  const code = parsed.data.code.trim().toUpperCase();
  const userId = session.user.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const coupon = await tx.coupon.findUnique({ where: { code } });
      if (!coupon) throw new RedeemError("Mã không tồn tại", 404);
      if (!coupon.active) throw new RedeemError("Mã đã bị vô hiệu hoá", 410);
      if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
        throw new RedeemError("Mã đã hết hạn", 410);
      }
      if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
        throw new RedeemError("Mã đã hết lượt sử dụng", 410);
      }

      // Per-user uniqueness — try the insert first; the unique constraint
      // turns concurrent duplicates into a race-free 409.
      try {
        await tx.couponRedemption.create({
          data: { couponId: coupon.id, userId },
        });
      } catch {
        throw new RedeemError("Bạn đã dùng mã này rồi", 409);
      }
      await tx.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      });

      // Apply the reward to the user row.
      if (coupon.rewardKind === "PREMIUM") {
        await tx.user.update({
          where: { id: userId },
          data: {
            isPremium: true,
            premiumGrantedAt: new Date(),
            premiumGrantedBy: coupon.createdBy,
          },
        });
        return { kind: "PREMIUM" as const, value: 0 };
      }
      if (coupon.rewardKind === "XP") {
        await tx.user.update({
          where: { id: userId },
          data: { xp: { increment: coupon.rewardValue } },
        });
        return { kind: "XP" as const, value: coupon.rewardValue };
      }
      if (coupon.rewardKind === "HEARTS") {
        // Cap at 5 (the standard heart pool ceiling). Increment + clamp
        // by reading then setting — same approach the streak-restore
        // flow already uses elsewhere in the app.
        const current = await tx.user.findUnique({
          where: { id: userId },
          select: { hearts: true },
        });
        const next = Math.min(5, (current?.hearts ?? 0) + coupon.rewardValue);
        await tx.user.update({ where: { id: userId }, data: { hearts: next } });
        return { kind: "HEARTS" as const, value: next - (current?.hearts ?? 0) };
      }
      throw new RedeemError("Loại phần thưởng không hỗ trợ", 400);
    });

    const msg =
      result.kind === "PREMIUM"
        ? "🎉 Bạn vừa được nâng cấp Premium!"
        : result.kind === "XP"
          ? `+${result.value} XP cộng vào tài khoản!`
          : `+${result.value} hearts!`;
    return NextResponse.json({ ok: true, reward: result, message: msg });
  } catch (e) {
    if (e instanceof RedeemError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[coupons/redeem]", e);
    return NextResponse.json({ error: "Lỗi không xác định" }, { status: 500 });
  }
}

class RedeemError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
