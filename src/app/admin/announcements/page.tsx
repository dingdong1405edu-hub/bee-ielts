import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminOrOwner } from "@/lib/premium";
import { AnnouncementsAdminClient, type AnnouncementRow } from "./announcements-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!me || !isAdminOrOwner(me)) redirect("/admin");

  const items = await prisma.announcement.findMany({
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  const rows: AnnouncementRow[] = items.map((a) => ({
    id: a.id,
    kind: a.kind,
    title: a.title,
    body: a.body,
    code: a.code,
    active: a.active,
    pinned: a.pinned,
    createdAt: a.createdAt.toISOString(),
  }));

  return <AnnouncementsAdminClient initial={rows} />;
}
