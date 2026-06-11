import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminOrOwner } from "@/lib/premium";
import { PodcastsAdminClient, type PodcastRow } from "./podcasts-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminPodcastsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!me || !isAdminOrOwner(me)) redirect("/admin");

  const episodes = await prisma.podcastEpisode.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      channel: true,
      level: true,
      youtubeId: true,
      thumbnailUrl: true,
      durationSec: true,
      published: true,
      createdAt: true,
    },
  });

  const rows: PodcastRow[] = episodes.map((e) => ({
    id: e.id,
    title: e.title,
    channel: e.channel,
    level: e.level,
    youtubeId: e.youtubeId,
    thumbnailUrl: e.thumbnailUrl,
    durationSec: e.durationSec,
    published: e.published,
    createdAt: e.createdAt.toISOString(),
  }));

  return <PodcastsAdminClient initial={rows} />;
}
