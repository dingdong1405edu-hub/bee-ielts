import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminOrOwner } from "@/lib/premium";

/**
 * Admin/Owner endpoints for coupons. Listing is GET, creation is POST.
 * Code is uppercased server-side so admins can paste in any case.
 */
const createSchema = z.object({
  code: z.string().min(2).max(64),
  description: z.string().max(200).optional(),
  rewardKind: z.enum(["PREMIUM", "XP", "HEARTS"]),
  rewardValue: z.number().int().min(0).max(100000).default(0),
  maxUses: z.number().int().min(1).max(100000).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
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
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ coupons });
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
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
  const code = parsed.data.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]+$/.test(code)) {
    return NextResponse.json(
      { error: "Mã chỉ chứa chữ HOA, số, gạch dưới và gạch ngang" },
      { status: 400 },
    );
  }
  // XP / HEARTS need a positive value, otherwise the coupon is a no-op.
  if (parsed.data.rewardKind !== "PREMIUM" && parsed.data.rewardValue < 1) {
    return NextResponse.json(
      { error: "Loại XP/HEARTS cần rewardValue ≥ 1" },
      { status: 400 },
    );
  }
  const exists = await prisma.coupon.findUnique({ where: { code } });
  if (exists) {
    return NextResponse.json({ error: "Mã này đã tồn tại" }, { status: 409 });
  }
  const coupon = await prisma.coupon.create({
    data: {
      code,
      description: parsed.data.description || null,
      rewardKind: parsed.data.rewardKind,
      rewardValue: parsed.data.rewardValue,
      maxUses: parsed.data.maxUses ?? null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      createdBy: me.id,
    },
  });
  return NextResponse.json({ coupon });
}
