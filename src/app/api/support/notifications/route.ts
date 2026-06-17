import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * Recent admin replies surfaced as notification-bell items so a learner is
 * pinged when the Bee team responds. Shape matches the announcements feed:
 * { items: [{ id, kind:'support', title, body, createdAt, href }] }.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ items: [] });

  const replies = await prisma.supportMessage.findMany({
    where: { userId: session.user.id, fromAdmin: true },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, body: true, createdAt: true },
  });

  return NextResponse.json({
    items: replies.map((r) => ({
      id: `support-${r.id}`,
      kind: "support",
      title: "Phản hồi từ đội ngũ Bee",
      body: r.body,
      createdAt: r.createdAt.toISOString(),
      href: "/support",
    })),
  });
}
