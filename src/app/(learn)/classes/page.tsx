import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { StudentClasses, type StudentAssignment } from "@/components/learn/student-classes";

export const dynamic = "force-dynamic";

/** Student view — join a class by code and see the assignments they've been
 *  given, with status + band. */
export default async function ClassesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const studentId = session.user.id;

  // Managers/parents don't "join a class" — send them to their own portal so
  // this student-only enrollment view can't put a teacher into the student flow.
  const me = await prisma.user.findUnique({
    where: { id: studentId },
    select: { role: true },
  });
  if (me?.role === "TEACHER") redirect("/teacher");
  if (me?.role === "PARENT") redirect("/parent");

  const memberships = await prisma.classMember.findMany({
    where: { studentId },
    orderBy: { joinedAt: "desc" },
    select: {
      class: {
        select: {
          id: true,
          name: true,
          assignments: {
            orderBy: { createdAt: "desc" },
            select: { id: true, title: true, deadline: true },
          },
        },
      },
    },
  });

  const flat = memberships.flatMap((m) =>
    m.class.assignments.map((a) => ({ ...a, className: m.class.name })),
  );
  const ids = flat.map((a) => a.id);
  const subs = ids.length
    ? await prisma.submission.findMany({
        where: { assignmentId: { in: ids }, studentId },
        select: { assignmentId: true, status: true, totalScore: true },
      })
    : [];
  const byId = new Map(subs.map((s) => [s.assignmentId, s]));

  const assignments: StudentAssignment[] = flat.map((a) => {
    const s = byId.get(a.id);
    return {
      id: a.id,
      title: a.title,
      className: a.className,
      deadline: a.deadline ? a.deadline.toISOString() : null,
      status: (s?.status ?? "NOT_STARTED") as StudentAssignment["status"],
      band: s?.totalScore ?? null,
    };
  });

  // Pending requests to private classes (waiting for teacher approval).
  const pending = await prisma.classJoinRequest.findMany({
    where: { studentId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: { class: { select: { name: true } } },
  });
  const pendingClasses = pending.map((p) => p.class.name);

  return (
    <StudentClasses
      assignments={assignments}
      classCount={memberships.length}
      pendingClasses={pendingClasses}
    />
  );
}
