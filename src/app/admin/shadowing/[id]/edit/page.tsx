import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminOrOwner } from "@/lib/premium";
import { ShadowingEditor, type EditorLesson } from "./shadowing-editor";

export const dynamic = "force-dynamic";

export default async function ShadowingEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!me || !isAdminOrOwner(me)) redirect("/admin");

  const { id } = await params;
  const lesson = await prisma.shadowingLesson.findUnique({
    where: { id },
    include: { segments: { orderBy: { order: "asc" } } },
  });
  if (!lesson) notFound();

  const data: EditorLesson = {
    id: lesson.id,
    title: lesson.title,
    source: lesson.source,
    level: lesson.level,
    youtubeId: lesson.youtubeId,
    thumbnailUrl: lesson.thumbnailUrl,
    published: lesson.published,
    createdByName: lesson.createdBy
      ? (
          await prisma.user.findUnique({
            where: { id: lesson.createdBy },
            select: { name: true, email: true },
          })
        )?.name ?? null
      : null,
    segments: lesson.segments.map((s) => ({
      id: s.id,
      order: s.order,
      startSec: s.startSec,
      endSec: s.endSec,
      textEn: s.textEn,
      textVi: s.textVi,
      ipa: s.ipa,
    })),
  };

  return <ShadowingEditor lesson={data} />;
}
