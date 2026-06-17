import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminOrOwner } from "@/lib/premium";

/**
 * Admin inbox: one row per learner who has a support thread, newest activity
 * first, with the last message preview and a count of unread learner messages.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (!isAdminOrOwner(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Latest activity per thread (cap at 50 threads).
  const latestPerUser = await prisma.supportMessage.groupBy({
    by: ["userId"],
    _max: { createdAt: true },
    orderBy: { _max: { createdAt: "desc" } },
    take: 50,
  });
  const userIds = latestPerUser.map((g) => g.userId);
  if (userIds.length === 0) return NextResponse.json({ threads: [] });

  const [unreadGroups, lastMsgs, users] = await Promise.all([
    prisma.supportMessage.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, fromAdmin: false, readByAdmin: false },
      _count: { _all: true },
    }),
    // Last message per thread: fetch recent messages for these threads and keep
    // the first (newest) seen per user. Bounded by take.
    prisma.supportMessage.findMany({
      where: { userId: { in: userIds } },
      orderBy: { createdAt: "desc" },
      take: 600,
      select: { userId: true, body: true, fromAdmin: true, createdAt: true },
    }),
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, avatarUrl: true, role: true },
    }),
  ]);

  const unreadBy = new Map(unreadGroups.map((g) => [g.userId, g._count._all]));
  const userBy = new Map(users.map((u) => [u.id, u]));
  const lastBy = new Map<string, { body: string; fromAdmin: boolean; createdAt: Date }>();
  for (const m of lastMsgs) {
    if (!lastBy.has(m.userId)) lastBy.set(m.userId, m);
  }

  const threads = latestPerUser
    .map((g) => {
      const u = userBy.get(g.userId);
      const last = lastBy.get(g.userId);
      return {
        userId: g.userId,
        name: u?.name ?? null,
        email: u?.email ?? "(đã xoá)",
        avatarUrl: u?.avatarUrl ?? null,
        role: u?.role ?? "LEARNER",
        lastBody: last?.body ?? "",
        lastFromAdmin: last?.fromAdmin ?? false,
        lastAt: (g._max.createdAt ?? new Date(0)).toISOString(),
        unread: unreadBy.get(g.userId) ?? 0,
      };
    })
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));

  return NextResponse.json({ threads });
}
