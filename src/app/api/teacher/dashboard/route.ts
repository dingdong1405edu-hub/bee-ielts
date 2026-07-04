/**
 * GET /api/teacher/dashboard — the teacher's own classes + active-assignment
 * counts (TEACHER/ADMIN).
 *
 * "Active" assignment = no deadline set, or deadline still in the future.
 * Returns each class with member + assignment counts, plus session totals.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireTeacher();
  if (gate instanceof NextResponse) return gate;

  const now = new Date();
  const classes = await prisma.class.findMany({
    where: { teacherId: gate.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: { select: { members: true, assignments: true } },
      // Only the ACTIVE ones — count via the length of this filtered relation.
      assignments: {
        where: { OR: [{ deadline: null }, { deadline: { gte: now } }] },
        select: { id: true },
      },
    },
  });

  const shaped = classes.map((c) => ({
    id: c.id,
    name: c.name,
    createdAt: c.createdAt,
    memberCount: c._count.members,
    assignmentCount: c._count.assignments,
    activeAssignmentCount: c.assignments.length,
  }));

  return NextResponse.json({
    classes: shaped,
    totals: {
      classCount: shaped.length,
      activeAssignmentCount: shaped.reduce((s, c) => s + c.activeAssignmentCount, 0),
    },
  });
}
