import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canManageAllClasses } from "@/lib/teacher-auth";
import { CustomAssignmentBuilder } from "@/components/teacher/custom-assignment-builder";

export const dynamic = "force-dynamic";

/** Teacher page — create a paper-based assignment. Role is gated by the teacher
 *  layout; here we just load the classes the caller may assign to. */
export default async function NewAssignmentPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  // A plain TEACHER assigns to their own classes; ADMIN/OWNER to any class.
  const where = canManageAllClasses(me?.role) ? {} : { teacherId: session.user.id };
  const classes = await prisma.class.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });

  return <CustomAssignmentBuilder classes={classes} />;
}
