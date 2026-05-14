import Link from "next/link";
import { Sparkles, BookOpenText, BookOpen, Headphones, PenLine, Mic, ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { computeDisplayStreak, getStreakRestoreState } from "@/lib/streak";
import { StatsRow } from "@/components/learn/stats-row";

const modules = [
  { href: "/vocab", label: "Vocabulary", desc: "Học từ kiểu Duolingo", icon: Sparkles, grad: "from-violet-500 to-fuchsia-500" },
  { href: "/grammar", label: "Grammar", desc: "Ngữ pháp ngắn gọn", icon: BookOpenText, grad: "from-blue-500 to-cyan-500" },
  { href: "/reading", label: "Reading", desc: "Đọc hiểu IELTS", icon: BookOpen, grad: "from-emerald-500 to-teal-500" },
  { href: "/listening", label: "Listening", desc: "Nghe + Q&A", icon: Headphones, grad: "from-amber-500 to-orange-500" },
  { href: "/writing", label: "Writing", desc: "AI chấm band IELTS", icon: PenLine, grad: "from-rose-500 to-pink-500" },
  { href: "/speaking", label: "Speaking", desc: "3 part — AI đánh giá", icon: Mic, grad: "from-indigo-500 to-blue-500" },
];

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      streakDays: true,
      lastActiveAt: true,
      targetBand: true,
      streakRestoresUsed: true,
      streakRestoreMonth: true,
    },
  });
  if (!user) return null;

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday-start week

  const weekAttempts = await prisma.attempt.findMany({
    where: { userId: session.user.id, createdAt: { gte: weekStart } },
    select: { durationSec: true },
  });
  const weekSeconds = weekAttempts.reduce((sum, a) => sum + (a.durationSec ?? 0), 0);
  const weekMinutes = Math.floor(weekSeconds / 60);

  const recentAttempts = await prisma.attempt.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const displayStreak = computeDisplayStreak(user.streakDays, user.lastActiveAt);
  const restore = getStreakRestoreState(user);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
          Chào {user.name || "bạn"} <span className="inline-block animate-float">👋</span>
        </h1>
        <p className="text-muted-foreground mt-1">Chọn một kỹ năng để bắt đầu luyện tập hôm nay.</p>
      </div>

      <StatsRow
        streakDays={displayStreak}
        streakRestoreRemaining={restore.remaining}
        targetBand={user.targetBand}
        weekMinutes={weekMinutes}
        weekSessions={weekAttempts.length}
      />

      <div>
        <h2 className="text-xl font-extrabold mb-4 tracking-tight">Skill của bạn</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Link key={m.href} href={m.href} className="group">
                <div className="relative h-full rounded-3xl border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 overflow-hidden">
                  <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${m.grad} opacity-20 blur-xl group-hover:opacity-40 transition-opacity`} />
                  <div className={`relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${m.grad} text-white shadow-lg`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="relative mt-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold">{m.label}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{m.desc}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {recentAttempts.length > 0 && (
        <div>
          <h2 className="text-xl font-extrabold mb-4 tracking-tight">Gần đây</h2>
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="divide-y">
              {recentAttempts.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-4 hover:bg-muted/40">
                  <div>
                    <div className="font-semibold text-sm">{a.skill}</div>
                    <div className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString("vi-VN")}</div>
                  </div>
                  {a.score != null && (
                    <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                      {a.score.toFixed(1)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
