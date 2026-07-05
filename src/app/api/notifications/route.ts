/**
 * GET /api/notifications — the current user's personal notifications, in the
 * shape the notification bell expects ({ items: [{ id, kind, title, body,
 * href?, createdAt }] }). Merged with announcements / support in the bell.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ items: [] });

  const rows = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, kind: true, title: true, body: true, href: true, createdAt: true },
  });

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      body: r.body,
      href: r.href ?? undefined,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
