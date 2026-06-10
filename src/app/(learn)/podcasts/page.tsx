import Link from "next/link";
import Image from "next/image";
import { Headphones, Play, Sparkles } from "lucide-react";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function formatDur(sec: number): string {
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export default async function PodcastsListPage() {
  const episodes = await prisma.podcastEpisode.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      channel: true,
      thumbnailUrl: true,
      durationSec: true,
      createdAt: true,
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border-2 border-honey/40 bg-gradient-to-br from-honey via-honey-deep to-leaf-deep p-6 sm:p-8 text-white shadow-lg">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 h-40 w-40 rounded-full bg-leaf/30 blur-2xl pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-2xl bg-white/20 backdrop-blur shadow-inner shrink-0">
            <Headphones className="h-7 w-7 sm:h-8 sm:w-8" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight drop-shadow-sm">
              Podcasts
            </h1>
            <p className="mt-1 text-sm sm:text-base text-white/90">
              Nghe tiếng Anh thật từ creators bản ngữ. Transcript cuộn theo từng câu.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1.5 text-xs font-bold">
            <Sparkles className="h-3.5 w-3.5" />
            {episodes.length} episode{episodes.length === 1 ? "" : "s"}
          </div>
        </div>
      </section>

      {/* Grid */}
      {episodes.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-honey/40 bg-cream/50 p-10 text-center">
          <Headphones className="mx-auto h-12 w-12 text-honey-deep mb-3" />
          <p className="font-bold text-lg">Chưa có podcast nào</p>
          <p className="text-sm text-muted-foreground mt-1">
            Quay lại sớm — admin đang chuẩn bị nội dung.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {episodes.map((ep) => (
            <Link
              key={ep.id}
              href={`/podcasts/${ep.id}`}
              className="group relative overflow-hidden rounded-2xl bg-paper border-2 border-honey/20 shadow-sm hover:shadow-lg hover:border-honey/60 transition-all hover:-translate-y-0.5"
            >
              {/* Thumbnail with play overlay */}
              <div className="relative aspect-video overflow-hidden bg-muted">
                <Image
                  src={ep.thumbnailUrl}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-honey text-ink shadow-lg ring-4 ring-white/30">
                    <Play className="h-6 w-6 ml-0.5 fill-current" />
                  </div>
                </div>
                <div className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-xs font-bold text-white backdrop-blur">
                  {formatDur(ep.durationSec)}
                </div>
              </div>

              {/* Body */}
              <div className="p-4 space-y-1.5">
                <h2 className="font-display font-bold text-base leading-tight line-clamp-2 group-hover:text-honey-deep transition-colors">
                  {ep.title}
                </h2>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-honey" />
                  {ep.channel}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
