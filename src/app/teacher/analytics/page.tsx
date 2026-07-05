import { redirect } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, ClipboardList, GraduationCap, TrendingUp, Users } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canManageAllClasses } from "@/lib/teacher-auth";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart, type BarDatum } from "@/components/teacher/bar-chart";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Teacher analytics — activity this month + 6-month trends (submissions,
 *  average band). Server-computed; charts are inline SVG. */
export default async function TeacherAnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  const classWhere = canManageAllClasses(me?.role) ? {} : { teacherId: session.user.id };
  const classes = await prisma.class.findMany({
    where: classWhere,
    select: { id: true, _count: { select: { members: true } } },
  });
  const classIds = classes.map((c) => c.id);

  const assignments = classIds.length
    ? await prisma.assignment.findMany({ where: { classId: { in: classIds } }, select: { id: true } })
    : [];
  const assignmentIds = assignments.map((a) => a.id);

  // 6-month window (this month + 5 prior).
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, k) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - k), 1);
    return { y: d.getFullYear(), m: d.getMonth(), label: `Th${d.getMonth() + 1}` };
  });
  const windowStart = new Date(months[0].y, months[0].m, 1);

  const subs = assignmentIds.length
    ? await prisma.submission.findMany({
        where: {
          assignmentId: { in: assignmentIds },
          status: { in: ["SUBMITTED", "GRADED"] },
          submittedAt: { gte: windowStart },
        },
        select: { submittedAt: true, totalScore: true, studentId: true },
      })
    : [];

  const counts = months.map(() => 0);
  const bandSum = months.map(() => 0);
  const bandN = months.map(() => 0);
  const students = months.map(() => new Set<string>());
  for (const s of subs) {
    if (!s.submittedAt) continue;
    const idx = months.findIndex((mm) => mm.y === s.submittedAt!.getFullYear() && mm.m === s.submittedAt!.getMonth());
    if (idx < 0) continue;
    counts[idx] += 1;
    students[idx].add(s.studentId);
    if (s.totalScore != null) {
      bandSum[idx] += s.totalScore;
      bandN[idx] += 1;
    }
  }

  const thisIdx = 5;
  const lastIdx = 4;
  const thisCount = counts[thisIdx];
  const lastCount = counts[lastIdx];
  const growthPct = lastCount > 0 ? Math.round(((thisCount - lastCount) / lastCount) * 100) : thisCount > 0 ? 100 : 0;
  const avgBandThis = bandN[thisIdx] ? round1(bandSum[thisIdx] / bandN[thisIdx]) : null;
  const activeThis = students[thisIdx].size;
  const totalStudents = classes.reduce((s, c) => s + c._count.members, 0);

  const submissionsData: BarDatum[] = months.map((mm, i) => ({
    label: mm.label,
    value: counts[i],
    display: String(counts[i]),
  }));
  const bandData: BarDatum[] = months.map((mm, i) => ({
    label: mm.label,
    value: bandN[i] ? round1(bandSum[i] / bandN[i]) : 0,
    display: bandN[i] ? (bandSum[i] / bandN[i]).toFixed(1) : "—",
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Phân tích</h1>
        <p className="text-sm text-muted-foreground">Hoạt động của các lớp bạn phụ trách.</p>
      </header>

      {/* KPI tiles */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          Icon={ClipboardList}
          iconClass="text-honey-deep"
          label="Bài nộp tháng này"
          value={String(thisCount)}
          delta={growthPct}
        />
        <Kpi Icon={TrendingUp} iconClass="text-leaf" label="Band TB tháng này" value={avgBandThis === null ? "—" : avgBandThis.toFixed(1)} />
        <Kpi Icon={Users} iconClass="text-sky-600" label="HS hoạt động" value={String(activeThis)} sub={`/${totalStudents} học sinh`} />
        <Kpi Icon={GraduationCap} iconClass="text-honey-deep" label="Số lớp" value={String(classes.length)} />
      </section>

      {/* Submissions over time */}
      <section>
        <h2 className="mb-1 text-sm font-semibold">Số bài nộp theo tháng</h2>
        <p className="mb-3 text-xs text-muted-foreground">6 tháng gần nhất</p>
        <Card><CardContent className="p-4">
          <BarChart data={submissionsData} colorClass="text-honey" />
        </CardContent></Card>
      </section>

      {/* Average band over time */}
      <section>
        <h2 className="mb-1 text-sm font-semibold">Band trung bình theo tháng</h2>
        <p className="mb-3 text-xs text-muted-foreground">Thang điểm IELTS 0–9</p>
        <Card><CardContent className="p-4">
          <BarChart data={bandData} colorClass="text-leaf" max={9} />
        </CardContent></Card>
      </section>
    </div>
  );
}

function Kpi({
  Icon,
  iconClass,
  label,
  value,
  sub,
  delta,
}: {
  Icon: typeof Users;
  iconClass: string;
  label: string;
  value: string;
  sub?: string;
  delta?: number;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-muted">
            <Icon className={cn("h-4 w-4", iconClass)} />
          </div>
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        <p className="mt-2 text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        {delta !== undefined && (
          <p
            className={cn(
              "mt-0.5 inline-flex items-center gap-0.5 text-xs font-semibold",
              delta > 0 ? "text-leaf" : delta < 0 ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {delta > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : delta < 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : null}
            {delta > 0 ? `+${delta}%` : `${delta}%`} so với tháng trước
          </p>
        )}
      </CardContent>
    </Card>
  );
}
