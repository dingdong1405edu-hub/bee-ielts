import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Headphones, PenLine, Mic, Sparkles, UserPlus, TrendingUp, CalendarDays } from "lucide-react";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

/** Local start-of-day (server timezone) for the given offset in days back. */
function startOfDay(offsetDays = 0): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setTime(d.getTime() - offsetDays * DAY);
  return d;
}

export default async function AdminDashboard() {
  const today0 = startOfDay(0);
  const last7 = new Date(Date.now() - 7 * DAY);
  const last30 = new Date(Date.now() - 30 * DAY);
  const chartStart = startOfDay(13); // 14-day window incl. today

  const [
    users,
    reading,
    listening,
    writing,
    speaking,
    vocab,
    attempts,
    newToday,
    new7,
    new30,
    recent,
    chartRows,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.readingTest.count(),
    prisma.listeningTest.count(),
    prisma.writingTask.count(),
    prisma.speakingSet.count(),
    prisma.vocabLesson.count(),
    prisma.attempt.count(),
    prisma.user.count({ where: { createdAt: { gte: today0 } } }),
    prisma.user.count({ where: { createdAt: { gte: last7 } } }),
    prisma.user.count({ where: { createdAt: { gte: last30 } } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: chartStart } },
      select: { createdAt: true },
    }),
  ]);

  // Bucket the last 14 days of signups by day for a tiny bar chart.
  const days: { label: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const start = startOfDay(i);
    const end = new Date(start.getTime() + DAY);
    const count = chartRows.filter((r) => r.createdAt >= start && r.createdAt < end).length;
    days.push({ label: new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(start), count });
  }
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  const newStats = [
    { label: "Hôm nay", value: newToday, icon: UserPlus, color: "bg-leaf" },
    { label: "7 ngày qua", value: new7, icon: CalendarDays, color: "bg-sage-500" },
    { label: "30 ngày qua", value: new30, icon: TrendingUp, color: "bg-indigo-500" },
    { label: "Tổng users", value: users, icon: Users, color: "bg-foreground" },
  ];

  const contentStats = [
    { label: "Reading tests", value: reading, icon: BookOpen, color: "bg-sage-500" },
    { label: "Listening tests", value: listening, icon: Headphones, color: "bg-indigo-500" },
    { label: "Writing tasks", value: writing, icon: PenLine, color: "bg-rose-500" },
    { label: "Speaking sets", value: speaking, icon: Mic, color: "bg-orange-500" },
    { label: "Vocab lessons", value: vocab, icon: Sparkles, color: "bg-leaf" },
  ];

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Tổng quan hệ thống &amp; người dùng mới.</p>
      </div>

      {/* New-user stats */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <UserPlus className="h-5 w-5 text-leaf" /> Người dùng mới
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {newStats.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardDescription>{s.label}</CardDescription>
                    <CardTitle className="text-3xl">{s.value}</CardTitle>
                  </div>
                  <div className={`grid h-10 w-10 place-items-center rounded-lg ${s.color} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 14-day signup chart + recent signups */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Đăng ký 14 ngày qua</CardTitle>
            <CardDescription>Số tài khoản mới mỗi ngày</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 items-end gap-1.5">
              {days.map((d, i) => (
                <div key={i} className="group flex flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[10px] font-bold text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                    {d.count}
                  </span>
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-sage-500 to-leaf transition-all"
                    style={{ height: `${Math.max(4, (d.count / maxDay) * 100)}%` }}
                    title={`${d.label}: ${d.count}`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[9px] text-muted-foreground">
              <span>{days[0]?.label}</span>
              <span>{days[days.length - 1]?.label}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Đăng ký gần đây</CardTitle>
            <Link href="/admin/users" className="text-xs font-semibold text-primary hover:underline">
              Xem tất cả
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {recent.map((u) => (
                <Link
                  key={u.id}
                  href={`/admin/support?user=${u.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{u.name || u.email.split("@")[0]}</div>
                    <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(u.createdAt)}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content stats */}
      <div>
        <h2 className="mb-3 text-lg font-bold">Nội dung</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contentStats.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardDescription>{s.label}</CardDescription>
                    <CardTitle className="text-3xl">{s.value}</CardTitle>
                  </div>
                  <div className={`grid h-10 w-10 place-items-center rounded-lg ${s.color} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>

      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">
            Tổng số bài làm: <strong>{attempts}</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
