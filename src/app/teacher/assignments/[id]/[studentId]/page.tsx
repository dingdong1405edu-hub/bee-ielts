import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ArrowLeft, Check, ShieldAlert, X } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canManageAllClasses } from "@/lib/teacher-auth";
import { isAnswerCorrect } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const coerceKey = (v: Prisma.JsonValue | null): string =>
  typeof v === "string" ? v : String(v ?? "");

function cheatCountOf(cheatLogs: Prisma.JsonValue | null | undefined): number {
  if (cheatLogs && typeof cheatLogs === "object" && !Array.isArray(cheatLogs)) {
    const c = (cheatLogs as Record<string, unknown>).count;
    if (typeof c === "number") return c;
  }
  return 0;
}

/** Read the stored answers array (JSON) into a questionId→answer map. */
function answerMap(answers: Prisma.JsonValue | null): Map<string, string> {
  const m = new Map<string, string>();
  if (Array.isArray(answers)) {
    for (const a of answers) {
      if (a && typeof a === "object" && !Array.isArray(a)) {
        const o = a as Record<string, unknown>;
        if (typeof o.questionId === "string") m.set(o.questionId, String(o.answer ?? ""));
      }
    }
  }
  return m;
}

/** Teacher drill-down — one student's attempt: their answer vs the key, per
 *  question. Same ownership gate as the roster page. */
export default async function StudentAttemptPage({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });

  const { id, studentId } = await params;
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      questionIds: true,
      class: { select: { name: true, teacherId: true } },
    },
  });
  if (!assignment) notFound();
  if (assignment.class.teacherId !== me?.id && !canManageAllClasses(me?.role)) {
    redirect("/teacher");
  }

  const [student, submission, questionRows] = await Promise.all([
    prisma.user.findUnique({ where: { id: studentId }, select: { name: true, email: true } }),
    prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId: id, studentId } },
      select: { status: true, totalScore: true, answers: true, cheatLogs: true, submittedAt: true },
    }),
    prisma.question.findMany({
      where: { id: { in: assignment.questionIds } },
      select: { id: true, prompt: true, type: true, options: true, correctAnswer: true, displayNumber: true },
    }),
  ]);
  if (!student) notFound();

  const qById = new Map(questionRows.map((q) => [q.id, q]));
  const questions = assignment.questionIds
    .map((qid) => qById.get(qid))
    .filter((q): q is NonNullable<typeof q> => Boolean(q));

  const answers = answerMap(submission?.answers ?? null);
  const notSubmitted = !submission || submission.status === "PENDING";

  let correct = 0;
  const rows = questions.map((q, i) => {
    const userAns = answers.get(q.id) ?? "";
    const key = coerceKey(q.correctAnswer);
    const ok = isAnswerCorrect(userAns, key, q.type);
    if (ok) correct += 1;
    return { num: q.displayNumber ?? i + 1, prompt: q.prompt, userAns, key, ok };
  });

  const cheat = cheatCountOf(submission?.cheatLogs);

  return (
    <div className="space-y-5">
      <Link
        href={`/teacher/assignments/${assignment.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Danh sách học sinh
      </Link>

      <header>
        <h1 className="text-2xl font-bold">{student.name ?? student.email.split("@")[0]}</h1>
        <p className="text-sm text-muted-foreground">
          {assignment.title} · {assignment.class.name}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {notSubmitted ? (
            <Badge variant="outline">Chưa làm bài</Badge>
          ) : (
            <>
              <Badge variant="success">Band {submission?.totalScore?.toFixed(1) ?? "—"}</Badge>
              <Badge variant="secondary">
                Đúng {correct}/{questions.length}
              </Badge>
              {cheat > 0 && (
                <Badge variant="destructive">
                  <ShieldAlert className="h-3.5 w-3.5" /> Rời tab {cheat} lần
                </Badge>
              )}
            </>
          )}
        </div>
      </header>

      {notSubmitted ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Học sinh này chưa nộp bài.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r) => (
            <Card key={r.num} className={cn(!r.ok && "border-destructive/30")}>
              <CardContent className="p-4">
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-white",
                      r.ok ? "bg-success" : "bg-destructive",
                    )}
                  >
                    {r.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      Câu {r.num}
                      {r.prompt && !/^Câu\s/i.test(r.prompt) ? `. ${r.prompt}` : ""}
                    </p>
                    <div className="mt-1.5 grid gap-1 text-sm sm:grid-cols-2">
                      <p>
                        <span className="text-muted-foreground">Học sinh trả lời: </span>
                        <span className={cn("font-medium", !r.ok && "text-destructive")}>
                          {r.userAns || "(bỏ trống)"}
                        </span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Đáp án đúng: </span>
                        <span className="font-medium text-success">{r.key}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
