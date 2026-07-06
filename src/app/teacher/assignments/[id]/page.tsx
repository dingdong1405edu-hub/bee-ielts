import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ArrowLeft, CheckCircle2, Clock, Eye, ShieldAlert } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canManageAllClasses } from "@/lib/teacher-auth";
import { typeLabel } from "@/lib/answer-key";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SolutionSheet, type SolutionItem } from "@/components/teacher/solution-sheet";

export const dynamic = "force-dynamic";

function cheatCountOf(cheatLogs: Prisma.JsonValue | null | undefined): number {
  if (cheatLogs && typeof cheatLogs === "object" && !Array.isArray(cheatLogs)) {
    const c = (cheatLogs as Record<string, unknown>).count;
    if (typeof c === "number") return c;
  }
  return 0;
}

/** Read config.paper.skill so we know this is a Reading/Listening paper assignment. */
function paperSkillOf(config: Prisma.JsonValue | null | undefined): "READING" | "LISTENING" | null {
  if (config && typeof config === "object" && !Array.isArray(config)) {
    const paper = (config as Record<string, unknown>).paper;
    if (paper && typeof paper === "object" && !Array.isArray(paper)) {
      const s = (paper as Record<string, unknown>).skill;
      if (s === "READING" || s === "LISTENING") return s;
    }
  }
  return null;
}

function coerceAnswer(v: Prisma.JsonValue | null): string {
  return typeof v === "string" ? v : String(v ?? "");
}

function fmtDateTime(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

type Row = {
  id: string;
  name: string;
  email: string;
  status: "NOT_STARTED" | "PENDING" | "SUBMITTED" | "GRADED";
  band: number | null;
  cheatCount: number;
  submittedAt: Date | null;
  attemptCount: number;
};

/** Teacher "kiểm tra học sinh" — the roster for one assignment: who did it,
 *  their band, and anti-cheat flags. Gated by the teacher layout + ownership. */
export default async function AssignmentReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });

  const { id } = await params;
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      deadline: true,
      questionIds: true,
      config: true,
      class: {
        select: {
          name: true,
          teacherId: true,
          members: {
            orderBy: { joinedAt: "asc" },
            select: { student: { select: { id: true, name: true, email: true } } },
          },
        },
      },
      submissions: {
        select: { studentId: true, status: true, totalScore: true, submittedAt: true, cheatLogs: true, attemptCount: true },
      },
    },
  });
  if (!assignment) notFound();
  if (assignment.class.teacherId !== me?.id && !canManageAllClasses(me?.role)) {
    redirect("/teacher");
  }

  const subByStudent = new Map(assignment.submissions.map((s) => [s.studentId, s]));
  const roster: Row[] = assignment.class.members.map((m) => {
    const s = subByStudent.get(m.student.id);
    return {
      id: m.student.id,
      name: m.student.name ?? m.student.email.split("@")[0],
      email: m.student.email,
      status: (s?.status ?? "NOT_STARTED") as Row["status"],
      band: s?.totalScore ?? null,
      cheatCount: cheatCountOf(s?.cheatLogs),
      submittedAt: s?.submittedAt ?? null,
      attemptCount: s?.attemptCount ?? 0,
    };
  });

  const done = roster.filter((r) => r.status === "SUBMITTED" || r.status === "GRADED");
  const bands = done.map((r) => r.band).filter((b): b is number => b !== null);
  const avgBand = bands.length ? Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 10) / 10 : null;
  const flagged = roster.filter((r) => r.cheatCount > 0).length;
  const totalAttempts = roster.reduce((s, r) => s + r.attemptCount, 0);

  // Paper-mode (Reading/Listening) assignments carry the answer key + AI lời
  // giải on their custom questions — surface it as a complete solution sheet.
  const paperSkill = paperSkillOf(assignment.config);
  let solutionItems: SolutionItem[] = [];
  if (paperSkill) {
    const qRows = await prisma.question.findMany({
      where: { id: { in: assignment.questionIds } },
      select: { id: true, type: true, prompt: true, correctAnswer: true, explanation: true, displayNumber: true },
    });
    const byId = new Map(qRows.map((q) => [q.id, q]));
    solutionItems = assignment.questionIds
      .map((id, i): SolutionItem | null => {
        const q = byId.get(id);
        if (!q) return null;
        const prompt = q.prompt && !/^Câu\s*\d+\s*$/i.test(q.prompt) ? q.prompt : "";
        return {
          number: q.displayNumber ?? i + 1,
          prompt,
          answer: coerceAnswer(q.correctAnswer),
          typeLabel: typeLabel(q.type),
          explanation: q.explanation ?? "",
        };
      })
      .filter((x): x is SolutionItem => x !== null);
  }
  const skillLabel = paperSkill === "READING" ? "Reading" : paperSkill === "LISTENING" ? "Listening" : "";

  return (
    <div className="space-y-5">
      <Link href="/teacher" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Lớp học
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{assignment.title}</h1>
          <p className="text-sm text-muted-foreground">
            {assignment.class.name} · {assignment.questionIds.length} câu · Hạn:{" "}
            {assignment.deadline ? fmtDateTime(assignment.deadline) : "không hạn"}
          </p>
        </div>
        <Link
          href={`/exam/${assignment.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-accent"
        >
          <Eye className="h-4 w-4" /> Xem trước đề
        </Link>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Đã nộp</p>
          <p className="mt-1 text-2xl font-bold">{done.length}/{roster.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Tổng lượt làm</p>
          <p className="mt-1 text-2xl font-bold text-honey-deep">{totalAttempts}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Band trung bình</p>
          <p className="mt-1 text-2xl font-bold text-leaf">{avgBand === null ? "—" : avgBand.toFixed(1)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Cảnh báo gian lận</p>
          <p className={cn("mt-1 text-2xl font-bold", flagged > 0 ? "text-destructive" : "text-leaf")}>{flagged}</p>
        </CardContent></Card>
      </div>

      {/* Answer key + AI solutions (paper-mode Reading/Listening) */}
      {solutionItems.length > 0 && (
        <SolutionSheet
          title={assignment.title}
          className={assignment.class.name}
          skillLabel={skillLabel}
          items={solutionItems}
        />
      )}

      {/* Roster */}
      {roster.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          Lớp chưa có học sinh nào.
        </CardContent></Card>
      ) : (
        <Card className="overflow-hidden p-0">
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Học sinh</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold">Band</th>
                  <th className="px-4 py-3 font-semibold">Lượt</th>
                  <th className="px-4 py-3 font-semibold">Nộp lúc</th>
                  <th className="px-4 py-3 font-semibold">Cảnh báo</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((r) => (
                  <tr
                    key={r.id}
                    className={cn("border-b last:border-0 hover:bg-accent/60", r.cheatCount > 0 && "bg-destructive/5")}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/teacher/assignments/${assignment.id}/${r.id}`} className="block">
                        <p className="font-medium hover:underline">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.email}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 font-bold">{r.band === null ? "—" : r.band.toFixed(1)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.attemptCount || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDateTime(r.submittedAt)}</td>
                    <td className="px-4 py-3"><CheatCell count={r.cheatCount} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="divide-y md:hidden">
            {roster.map((r) => (
              <li key={r.id} className={cn(r.cheatCount > 0 && "bg-destructive/5")}>
                <Link href={`/teacher/assignments/${assignment.id}/${r.id}`} className="block p-4 hover:bg-accent/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{r.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                    </div>
                    <span className="shrink-0 text-lg font-bold">{r.band === null ? "—" : r.band.toFixed(1)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={r.status} />
                    {r.attemptCount > 1 && <span className="text-xs text-muted-foreground">{r.attemptCount} lượt</span>}
                    <CheatCell count={r.cheatCount} />
                    <span className="ml-auto text-[11px] text-muted-foreground">{fmtDateTime(r.submittedAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Row["status"] }) {
  if (status === "GRADED") return <Badge variant="success"><CheckCircle2 className="h-3.5 w-3.5" /> Đã chấm</Badge>;
  if (status === "SUBMITTED") return <Badge variant="secondary">Đã nộp</Badge>;
  return <Badge variant="outline"><Clock className="h-3.5 w-3.5" /> Chưa làm</Badge>;
}

function CheatCell({ count }: { count: number }) {
  if (count <= 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <Badge variant="destructive" title="Số lần rời tab khi làm bài">
      <ShieldAlert className="h-3.5 w-3.5" /> {count}
    </Badge>
  );
}
