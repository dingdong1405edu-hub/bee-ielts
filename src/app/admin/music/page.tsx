import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { MusicAdminClient } from "./music-client";

export const dynamic = "force-dynamic";

export default async function AdminMusicPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    redirect("/dashboard");
  }

  const tracks = await prisma.backgroundMusic.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Nhạc nền</h1>
        <p className="text-muted-foreground">
          Thêm nhạc nền cho từng phần. Nhạc sẽ tự tắt khi user vào trang đang làm bài
          (test, lesson, mini-quiz...) để không trùng với audio bài học.
        </p>
      </div>
      <MusicAdminClient
        initial={tracks.map((t) => ({
          id: t.id,
          name: t.name,
          audioUrl: t.audioUrl,
          scopes: t.scopes,
          volume: t.volume,
          enabled: t.enabled,
          order: t.order,
        }))}
      />
    </div>
  );
}
