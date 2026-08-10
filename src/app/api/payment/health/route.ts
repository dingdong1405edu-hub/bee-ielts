import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  MAX_ORDER_CODE,
  PAYOS_CODE,
  describePayosFailure,
  getPayos,
  isConfigured,
  payosCode,
  resolveAppUrl,
} from "@/lib/payos";
import { isAdminOrOwner } from "@/lib/premium";

/**
 * Owner/admin-only self-check for the PayOS integration: open
 *   /api/payment/health
 * on the deployed site and it says exactly which leg is broken, instead of
 * everything collapsing into one generic checkout error.
 *
 * Never returns secret values — only whether they are present, their length,
 * and whether they were pasted with stray quotes.
 */
export const dynamic = "force-dynamic";

function describeEnv(name: string): {
  present: boolean;
  length: number;
  quoted: boolean;
  padded: boolean;
} {
  const raw = process.env[name] ?? "";
  const trimmed = raw.trim();
  return {
    present: trimmed.length > 0,
    length: trimmed.replace(/^["']|["']$/g, "").length,
    quoted: /^["'].*["']$/.test(trimmed),
    padded: raw !== trimmed,
  };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  }
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!isAdminOrOwner(me)) {
    return NextResponse.json({ error: "Chỉ owner/admin" }, { status: 403 });
  }

  const env = {
    PAYOS_CLIENT_ID: describeEnv("PAYOS_CLIENT_ID"),
    PAYOS_API_KEY: describeEnv("PAYOS_API_KEY"),
    PAYOS_CHECKSUM_KEY: describeEnv("PAYOS_CHECKSUM_KEY"),
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? null,
    resolvedAppUrl: resolveAppUrl(req),
  };

  // Live auth probe with no side effects: look up an order code that cannot
  // exist. PayOS answers "101 — mã thanh toán không tồn tại" when the keys are
  // good, and "214 — cổng không tồn tại/tạm dừng" when they are not. It returns
  // HTTP 200 either way, so the business code is the only usable signal.
  let payos: { ok: boolean; code: string | null; note: string };
  if (!isConfigured()) {
    payos = { ok: false, code: null, note: "Thiếu biến môi trường PAYOS_*" };
  } else {
    try {
      await getPayos().paymentRequests.get(MAX_ORDER_CODE - 1);
      payos = { ok: true, code: "00", note: "Xác thực OK" };
    } catch (e) {
      const code = payosCode(e);
      payos =
        code === PAYOS_CODE.NOT_FOUND
          ? { ok: true, code, note: "Xác thực OK (đơn thử không tồn tại — đúng như mong đợi)" }
          : { ok: false, code, note: describePayosFailure(e).message };
    }
  }

  // The column type that caused the original outage.
  let orderCodeColumn = "unknown";
  try {
    const rows = await prisma.$queryRaw<{ data_type: string }[]>`
      select data_type from information_schema.columns
      where table_name = 'Payment' and column_name = 'orderCode' limit 1`;
    orderCodeColumn = rows[0]?.data_type ?? "missing";
  } catch (e) {
    orderCodeColumn = `lỗi: ${e instanceof Error ? e.message.slice(0, 80) : "?"}`;
  }

  const byStatus = await prisma.payment
    .groupBy({ by: ["status"], _count: { _all: true } })
    .catch(() => []);
  const latest = await prisma.payment
    .findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { orderCode: true, amount: true, status: true, paidAt: true, createdAt: true },
    })
    .catch(() => []);

  return NextResponse.json({
    env,
    payos,
    db: {
      orderCodeColumn,
      maxOrderCode: MAX_ORDER_CODE,
      byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
      latest,
    },
  });
}
