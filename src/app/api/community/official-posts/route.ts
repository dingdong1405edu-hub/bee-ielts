import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * Recent OFFICIAL community posts (asOwner = true) for the notification bell.
 * These are the posts the owner — or an admin posting under the Bee identity —
 * wants every learner to be notified about. Lightweight: id + snippet + time.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ items: [] });

  const posts = await prisma.post.findMany({
    where: { asOwner: true },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, content: true, createdAt: true },
  });

  const items = posts.map((p) => {
    const text = p.content.trim();
    return {
      id: `post:${p.id}`,
      kind: "post" as const,
      title: "Bài mới từ Bee 🐝",
      body: text.length > 140 ? `${text.slice(0, 140)}…` : text || "Xem bài viết mới trong cộng đồng.",
      code: null,
      href: "/community",
      createdAt: p.createdAt.toISOString(),
    };
  });

  return NextResponse.json({ items });
}
