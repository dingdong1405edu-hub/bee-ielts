/**
 * GET /api/announcements — public list of active admin announcements (newest
 * first, pinned on top). Consumed by the notification bell on the landing
 * (index.html) and the in-app TopNav. No auth required.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await prisma.announcement.findMany({
      where: { active: true },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 50,
      select: { id: true, kind: true, title: true, body: true, code: true, createdAt: true },
    });
    return NextResponse.json(
      { items: items.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })) },
      { headers: { "Cache-Control": "public, max-age=30" } },
    );
  } catch (e) {
    console.error("[announcements] list failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ items: [] });
  }
}
