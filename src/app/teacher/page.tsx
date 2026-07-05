import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canManageAllClasses } from "@/lib/teacher-auth";
import { TeacherHome, type TeacherClass } from "@/components/teacher/teacher-home";

export const dynamic = "force-dynamic";

/** Teacher home — list classes (with join code + counts) and the assignments in
 *  each. Role is gated by the teacher layout. */
export default async function TeacherPage() {
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
    select: {
      id: true,
      name: true,
      joinCode: true,
      isPrivate: true,
      _count: { select: { members: true, assignments: true } },
      assignments: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          deadline: true,
          _count: { select: { submissions: true } },
        },
      },
      members: {
        orderBy: { joinedAt: "asc" },
        take: 300,
        select: { student: { select: { id: true, name: true, email: true } } },
      },
      joinRequests: {
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        select: { student: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  const nameOf = (u: { name: string | null; email: string }) => u.name ?? u.email.split("@")[0];

  const shaped: TeacherClass[] = classes.map((c) => ({
    id: c.id,
    name: c.name,
    joinCode: c.joinCode,
    isPrivate: c.isPrivate,
    memberCount: c._count.members,
    assignmentCount: c._count.assignments,
    assignments: c.assignments.map((a) => ({
      id: a.id,
      title: a.title,
      deadline: a.deadline ? a.deadline.toISOString() : null,
      submissionCount: a._count.submissions,
    })),
    members: c.members.map((m) => ({
      id: m.student.id,
      name: nameOf(m.student),
      email: m.student.email,
    })),
    pendingRequests: c.joinRequests.map((r) => ({
      id: r.student.id,
      name: nameOf(r.student),
      email: r.student.email,
    })),
  }));

  return <TeacherHome initialClasses={shaped} />;
}
