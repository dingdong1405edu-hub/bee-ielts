"use client";

/**
 * ParentDashboard — màn hình phụ huynh theo dõi tiến độ học của con.
 *
 * - Tổng quan (summary cards): số bài đã làm / được giao, band trung bình, và
 *   điểm trung bình từng kỹ năng.
 * - Danh sách bài tập quá hạn (Overdue) chưa nộp.
 * - Bảng lịch sử làm bài gần nhất — có Warning Badge khi cheatCount > 0
 *   (con thoát tab khi làm bài, đọc từ Submission.cheatLogs).
 *
 * Dữ liệu lấy từ mock API GET /api/parent/student-progress. Responsive,
 * mobile-first: bảng chuyển sang dạng thẻ (card) trên màn hình nhỏ.
 */
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Mic,
  PenLine,
  ShieldAlert,
  TrendingUp,
  Headphones,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  ParentStudentProgress,
  ParentRecentSubmission,
  ParentSkillAverages,
} from "@/app/api/parent/student-progress/route";

/* ------------------------------------------------------------------ helpers */

const SKILL_META: Record<
  string,
  { label: string; Icon: typeof BookOpen; className: string }
> = {
  READING: { label: "Reading", Icon: BookOpen, className: "text-leaf" },
  LISTENING: { label: "Listening", Icon: Headphones, className: "text-sky-600" },
  WRITING: { label: "Writing", Icon: PenLine, className: "text-honey-deep" },
  SPEAKING: { label: "Speaking", Icon: Mic, className: "text-rose-500" },
};

function skillMeta(skill: string) {
  return (
    SKILL_META[skill] ?? {
      label: skill,
      Icon: BookOpen,
      className: "text-muted-foreground",
    }
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Số ngày quá hạn (làm tròn lên), tính từ hạn nộp đến bây giờ. */
function daysOverdue(iso: string): number {
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(1, Math.ceil(diff / 86_400_000));
}

function bandTone(band: number | null): string {
  if (band === null) return "text-muted-foreground";
  if (band >= 7) return "text-leaf";
  if (band >= 5.5) return "text-honey-deep";
  return "text-destructive";
}

/* ---------------------------------------------------------------- component */

export function ParentDashboard() {
  const [data, setData] = useState<ParentStudentProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/parent/student-progress");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ParentStudentProgress;
        if (alive) setData(json);
      } catch {
        if (alive) setError("Không tải được dữ liệu tiến độ. Vui lòng thử lại.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Đang tải tiến độ của con…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{error ?? "Không có dữ liệu."}</p>
      </div>
    );
  }

  const { student, summary, overdue, recent } = data;
  const completionPct =
    summary.totalAssigned > 0
      ? Math.round((summary.completedCount / summary.totalAssigned) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Theo dõi học tập</h1>
        <p className="text-sm text-muted-foreground">
          Tiến độ của{" "}
          <span className="font-semibold text-foreground">{student.name}</span> — cập
          nhật theo thời gian thực.
        </p>
      </header>

      {/* Summary stat cards */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          Icon={ClipboardList}
          iconClass="text-honey-deep"
          label="Bài tập đã làm"
          value={`${summary.completedCount}/${summary.totalAssigned}`}
          sub={`Hoàn thành ${completionPct}%`}
        >
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-leaf transition-all"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </StatCard>

        <StatCard
          Icon={TrendingUp}
          iconClass="text-leaf"
          label="Band trung bình"
          value={summary.avgBand === null ? "—" : summary.avgBand.toFixed(1)}
          sub="Trên thang điểm IELTS 0–9"
          valueClass={bandTone(summary.avgBand)}
        />

        <StatCard
          Icon={AlertTriangle}
          iconClass="text-destructive"
          label="Bài quá hạn"
          value={String(overdue.length)}
          sub={overdue.length > 0 ? "Cần nhắc con hoàn thành" : "Không có bài quá hạn 🎉"}
          valueClass={overdue.length > 0 ? "text-destructive" : "text-leaf"}
        />
      </section>

      {/* Skill averages */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Điểm trung bình theo kỹ năng
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(Object.keys(summary.skillAverages) as (keyof ParentSkillAverages)[]).map(
            (key) => {
              const skill = key.toUpperCase();
              const { label, Icon, className } = skillMeta(skill);
              const band = summary.skillAverages[key];
              return (
                <Card key={key} className="p-4">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", className)} />
                    <span className="text-sm font-medium text-foreground">{label}</span>
                  </div>
                  <p className={cn("mt-2 text-2xl font-bold", bandTone(band))}>
                    {band === null ? "—" : band.toFixed(1)}
                  </p>
                </Card>
              );
            },
          )}
        </div>
      </section>

      {/* Overdue list */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarClock className="h-4 w-4 text-destructive" />
          Bài tập quá hạn
        </h2>
        {overdue.length === 0 ? (
          <Card className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-leaf" />
            Con không có bài tập nào quá hạn. Tuyệt vời!
          </Card>
        ) : (
          <div className="space-y-2.5">
            {overdue.map((o) => {
              const { label, Icon, className } = skillMeta(o.skill);
              return (
                <Card
                  key={o.id}
                  className="flex items-center gap-3 border-destructive/30 bg-destructive/5 p-3.5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background">
                    <Icon className={cn("h-5 w-5", className)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {o.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {o.className} · {label}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge variant="destructive">Quá {daysOverdue(o.deadline)} ngày</Badge>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Hạn: {fmtDate(o.deadline)}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent history */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <ClipboardList className="h-4 w-4 text-honey-deep" />
          Lịch sử làm bài gần nhất
        </h2>
        <RecentHistory rows={recent} />
      </section>
    </div>
  );
}

/* ------------------------------------------------------------- subcomponents */

function StatCard({
  Icon,
  iconClass,
  label,
  value,
  sub,
  valueClass,
  children,
}: {
  Icon: typeof BookOpen;
  iconClass: string;
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
          <Icon className={cn("h-4 w-4", iconClass)} />
        </div>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <p className={cn("mt-3 text-3xl font-bold text-foreground", valueClass)}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      {children}
    </Card>
  );
}

/** Warning badge dùng chung cho cả bảng (desktop) và card (mobile). */
function CheatBadge({ count }: { count: number }) {
  if (count <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <CheckCircle2 className="h-3.5 w-3.5 text-leaf" />
        Bình thường
      </span>
    );
  }
  return (
    <Badge variant="destructive" title="Con đã chuyển tab/thoát màn hình khi làm bài">
      <ShieldAlert className="h-3.5 w-3.5" />
      {count} lần thoát tab
    </Badge>
  );
}

function StatusBadge({ status }: { status: ParentRecentSubmission["status"] }) {
  if (status === "GRADED")
    return <Badge variant="success">Đã chấm</Badge>;
  if (status === "SUBMITTED")
    return <Badge variant="secondary">Chờ chấm</Badge>;
  return <Badge variant="outline">Chưa nộp</Badge>;
}

function RecentHistory({ rows }: { rows: ParentRecentSubmission[] }) {
  if (rows.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        Chưa có bài nào được nộp gần đây.
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      {/* Desktop / tablet: table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Bài tập</th>
              <th className="px-4 py-3 font-semibold">Kỹ năng</th>
              <th className="px-4 py-3 font-semibold">Band</th>
              <th className="px-4 py-3 font-semibold">Trạng thái</th>
              <th className="px-4 py-3 font-semibold">Nộp lúc</th>
              <th className="px-4 py-3 font-semibold">Cảnh báo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const { label, Icon, className } = skillMeta(r.skill);
              return (
                <tr
                  key={r.id}
                  className={cn(
                    "border-b border-border/60 last:border-0",
                    r.cheatCount > 0 && "bg-destructive/5",
                  )}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{r.assignmentTitle}</p>
                    <p className="text-xs text-muted-foreground">{r.className}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon className={cn("h-4 w-4", className)} />
                      {label}
                    </span>
                  </td>
                  <td className={cn("px-4 py-3 font-bold", bandTone(r.band))}>
                    {r.band === null ? "—" : r.band.toFixed(1)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {fmtDate(r.submittedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <CheatBadge count={r.cheatCount} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <ul className="divide-y divide-border md:hidden">
        {rows.map((r) => {
          const { label, Icon, className } = skillMeta(r.skill);
          return (
            <li
              key={r.id}
              className={cn("p-4", r.cheatCount > 0 && "bg-destructive/5")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{r.assignmentTitle}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon className={cn("h-3.5 w-3.5", className)} />
                    {label} · {r.className}
                  </p>
                </div>
                <span className={cn("shrink-0 text-lg font-bold", bandTone(r.band))}>
                  {r.band === null ? "—" : r.band.toFixed(1)}
                </span>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <StatusBadge status={r.status} />
                <CheatBadge count={r.cheatCount} />
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {fmtDate(r.submittedAt)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
