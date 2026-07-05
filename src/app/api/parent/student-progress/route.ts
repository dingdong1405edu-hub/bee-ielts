/**
 * GET /api/parent/student-progress — real progress for a parent's linked child.
 *
 * Resolves the parent's children (ParentStudent), picks one (?studentId= or the
 * first), then aggregates across the child's classes:
 *   - summary: completed vs assigned, average band, per-skill averages
 *   - overdue: assignments past deadline the child hasn't submitted
 *   - recent: latest submissions, with cheatCount from Submission.cheatLogs
 *
 * `cheatCount > 0` → the ParentDashboard shows a Warning Badge. Returns
 * { linked: false } when the parent hasn't linked any child yet (→ link form).
 */
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export interface ParentSkillAverages {
  reading: number | null;
  listening: number | null;
  writing: number | null;
  speaking: number | null;
}
export interface ParentOverdueItem {
  id: string;
  title: string;
  className: string;
  skill: string;
  deadline: string;
}
export interface ParentRecentSubmission {
  id: string;
  assignmentTitle: string;
  className: string;
  skill: string;
  band: number | null;
  scorePercent: number | null;
  status: "PENDING" | "SUBMITTED" | "GRADED";
  submittedAt: string | null;
  cheatCount: number;
}
export interface ParentStudentProgress {
  linked: boolean;
  children: { id: string; name: string }[];
  student: { id: string; name: string; avatarUrl: string | null } | null;
  summary: {
    completedCount: number;
    totalAssigned: number;
    avgBand: number | null;
    skillAverages: ParentSkillAverages;
  } | null;
  overdue: ParentOverdueItem[];
  recent: ParentRecentSubmission[];
}

/** Read the assignment's declared paper skill from its config JSON. */
function paperSkill(config: Prisma.JsonValue | null | undefined): "READING" | "LISTENING" | null {
  if (config && typeof config === "object" && !Array.isArray(config)) {
    const paper = (config as Record<string, unknown>).paper;
    if (paper && typeof paper === "object" && !Array.isArray(paper)) {
      const s = (paper as Record<string, unknown>).skill;
      if (s === "READING" || s === "LISTENING") return s;
    }
  }
  return null;
}

function cheatCountOf(cheatLogs: Prisma.JsonValue | null | undefined): number {
  if (cheatLogs && typeof cheatLogs === "object" && !Array.isArray(cheatLogs)) {
    const c = (cheatLogs as Record<string, unknown>).count;
    if (typeof c === "number") return c;
  }
  return 0;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (xs: number[]): number | null => (xs.length ? round1(xs.reduce((s, x) => s + x, 0) / xs.length) : null);

const EMPTY: ParentStudentProgress = {
  linked: false,
  children: [],
  student: null,
  summary: null,
  overdue: [],
  recent: [],
};

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  const parentId = session.user.id;

  const links = await prisma.parentStudent.findMany({
    where: { parentId },
    orderBy: { createdAt: "asc" },
    select: { student: { select: { id: true, name: true, email: true } } },
  });
  const children = links.map((l) => ({
    id: l.student.id,
    name: l.student.name ?? l.student.email.split("@")[0],
  }));
  if (children.length === 0) return NextResponse.json(EMPTY);

  const wanted = new URL(req.url).searchParams.get("studentId");
  const childId = children.find((c) => c.id === wanted)?.id ?? children[0].id;
  const child = await prisma.user.findUnique({
    where: { id: childId },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });
  if (!child) return NextResponse.json(EMPTY);

  const memberships = await prisma.classMember.findMany({
    where: { studentId: childId },
    select: { classId: true },
  });
  const classIds = memberships.map((m) => m.classId);

  const assignments = classIds.length
    ? await prisma.assignment.findMany({
        where: { classId: { in: classIds } },
        select: { id: true, title: true, deadline: true, config: true, class: { select: { name: true } } },
      })
    : [];
  const assignmentById = new Map(assignments.map((a) => [a.id, a]));
  const assignmentIds = assignments.map((a) => a.id);

  const submissions = assignmentIds.length
    ? await prisma.submission.findMany({
        where: { assignmentId: { in: assignmentIds }, studentId: childId },
        select: {
          id: true,
          assignmentId: true,
          status: true,
          totalScore: true,
          submittedAt: true,
          updatedAt: true,
          cheatLogs: true,
        },
      })
    : [];
  const subByAssignment = new Map(submissions.map((s) => [s.assignmentId, s]));

  const isDone = (status: string) => status === "SUBMITTED" || status === "GRADED";
  const done = submissions.filter((s) => isDone(s.status));
  const graded = submissions.filter((s) => s.status === "GRADED" && s.totalScore != null);

  // Per-skill band averages (paper-mode assignments carry a skill in config).
  const reading: number[] = [];
  const listening: number[] = [];
  for (const s of graded) {
    const sk = paperSkill(assignmentById.get(s.assignmentId)?.config);
    if (sk === "READING") reading.push(s.totalScore as number);
    else if (sk === "LISTENING") listening.push(s.totalScore as number);
  }

  const now = Date.now();
  const overdue: ParentOverdueItem[] = assignments
    .filter((a) => {
      const sub = subByAssignment.get(a.id);
      return a.deadline && a.deadline.getTime() < now && !(sub && isDone(sub.status));
    })
    .map((a) => ({
      id: a.id,
      title: a.title,
      className: a.class.name,
      skill: paperSkill(a.config) ?? "READING",
      deadline: (a.deadline as Date).toISOString(),
    }));

  const recent: ParentRecentSubmission[] = done
    .slice()
    .sort(
      (x, y) =>
        (y.submittedAt ?? y.updatedAt).getTime() - (x.submittedAt ?? x.updatedAt).getTime(),
    )
    .slice(0, 8)
    .map((s) => {
      const a = assignmentById.get(s.assignmentId);
      return {
        id: s.id,
        assignmentTitle: a?.title ?? "—",
        className: a?.class.name ?? "",
        skill: paperSkill(a?.config) ?? "READING",
        band: s.totalScore,
        scorePercent: null,
        status: s.status as ParentRecentSubmission["status"],
        submittedAt: (s.submittedAt ?? s.updatedAt).toISOString(),
        cheatCount: cheatCountOf(s.cheatLogs),
      };
    });

  const body: ParentStudentProgress = {
    linked: true,
    children,
    student: { id: child.id, name: child.name ?? child.email.split("@")[0], avatarUrl: child.avatarUrl },
    summary: {
      completedCount: done.length,
      totalAssigned: assignments.length,
      avgBand: avg(graded.map((s) => s.totalScore as number)),
      skillAverages: { reading: avg(reading), listening: avg(listening), writing: null, speaking: null },
    },
    overdue,
    recent,
  };
  return NextResponse.json(body);
}
