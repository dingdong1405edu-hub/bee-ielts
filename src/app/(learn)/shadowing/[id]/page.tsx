import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ShadowingPlayer, type ShadowingPlayerProps } from "./shadowing-player";

export const dynamic = "force-dynamic";

export default async function ShadowingLessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const sp = await searchParams;
  const mode: "shadowing" | "dictation" =
    sp.mode === "dictation" ? "dictation" : "shadowing";
  const lesson = await prisma.shadowingLesson.findUnique({
    where: { id },
    include: { segments: { orderBy: { order: "asc" } } },
  });
  if (!lesson) notFound();

  const props: ShadowingPlayerProps = {
    lesson: {
      id: lesson.id,
      title: lesson.title,
      source: lesson.source,
      youtubeId: lesson.youtubeId,
    },
    segments: lesson.segments.map((s) => ({
      id: s.id,
      order: s.order,
      startSec: s.startSec,
      endSec: s.endSec,
      textEn: s.textEn,
      textVi: s.textVi,
      ipa: s.ipa,
    })),
    mode,
  };
  return <ShadowingPlayer {...props} />;
}
