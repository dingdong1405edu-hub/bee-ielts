import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminOrOwner } from "@/lib/premium";
import { ShadowingAdminClient, type LessonRow } from "./shadowing-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminShadowingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!me || !isAdminOrOwner(me)) redirect("/admin");

  const lessons = await prisma.shadowingLesson.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { segments: true } } },
  });

  const rows: LessonRow[] = lessons.map((l) => ({
    id: l.id,
    title: l.title,
    source: l.source,
    youtubeId: l.youtubeId,
    thumbnailUrl: l.thumbnailUrl,
    segmentCount: l._count.segments,
    createdAt: l.createdAt.toISOString(),
  }));

  return <ShadowingAdminClient initial={rows} />;
}
