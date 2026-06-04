import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminOrOwner } from "@/lib/premium";
import { CouponsAdminClient, type CouponRow } from "./coupons-admin-client";

export const dynamic = "force-dynamic";

/**
 * Coupon management page — both ADMIN and OWNER can create / disable /
 * delete coupons. List is sorted by creation date desc; recent first.
 */
export default async function AdminCouponsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!me || !isAdminOrOwner(me)) redirect("/admin");

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const rows: CouponRow[] = coupons.map((c) => ({
    id: c.id,
    code: c.code,
    description: c.description,
    rewardKind: c.rewardKind,
    rewardValue: c.rewardValue,
    maxUses: c.maxUses,
    usedCount: c.usedCount,
    active: c.active,
    expiresAt: c.expiresAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  }));

  return <CouponsAdminClient initial={rows} />;
}
