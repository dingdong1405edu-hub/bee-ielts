import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PodcastPlayer, type PodcastSegment } from "./podcast-player";

export const dynamic = "force-dynamic";

export default async function PodcastPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ep = await prisma.podcastEpisode.findUnique({
    where: { id, published: true },
    select: {
      id: true,
      title: true,
      channel: true,
      youtubeId: true,
      thumbnailUrl: true,
      durationSec: true,
      transcriptJson: true,
    },
  });
  if (!ep) notFound();

  // transcriptJson is Prisma JsonValue — narrow to our shape.
  const segments = Array.isArray(ep.transcriptJson)
    ? (ep.transcriptJson as unknown as PodcastSegment[]).filter(
        (s): s is PodcastSegment =>
          typeof s?.startSec === "number" &&
          typeof s?.endSec === "number" &&
          typeof s?.textEn === "string",
      )
    : [];

  return (
    <PodcastPlayer
      id={ep.id}
      title={ep.title}
      channel={ep.channel}
      youtubeId={ep.youtubeId}
      thumbnailUrl={ep.thumbnailUrl}
      durationSec={ep.durationSec}
      segments={segments}
    />
  );
}
