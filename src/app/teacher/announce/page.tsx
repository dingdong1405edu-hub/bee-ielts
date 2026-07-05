import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canManageAllClasses } from "@/lib/teacher-auth";
import { AnnounceForm } from "@/components/teacher/announce-form";

export const dynamic = "force-dynamic";

/** Teacher → send a notification to students. Role gated by the teacher layout. */
export default async function AnnouncePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const where = canManageAllClasses(me?.role) ? {} : { teacherId: session.user.id };
  const classes = await prisma.class.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });

  return <AnnounceForm classes={classes} />;
}
