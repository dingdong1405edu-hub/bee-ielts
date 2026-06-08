import Link from "next/link";
import { Sparkles, BookOpenText, BookOpen, Headphones, PenLine, Mic, ArrowRight, GraduationCap, Video, Play } from "lucide-react";
import { ScrollReveal } from "@/components/scroll-reveal";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { computeDisplayStreak, getStreakRestoreState } from "@/lib/streak";
import { effectivePremium } from "@/lib/premium";
import { StatsRow } from "@/components/learn/stats-row";
import { ExamCountdown } from "@/components/learn/exam-countdown";
import { StudySchedule } from "@/components/learn/study-schedule";
import { PremiumCouponCards } from "@/components/learn/premium-coupon-cards";
import { BeeMascot, Honeycomb, Leaf } from "@/components/brand";

// Per-skill accent gradients — distinct hue per module, all muted/editorial
// to harmonise with the sage+gold base (see tailwind `skill.*` tokens).
const modules = [
  { href: "/vocab", label: "Vocabulary", desc: "Từ vựng Duolingo-style", icon: Sparkles, grad: "from-[#C77E7E] to-[#A85656]" },
  { href: "/grammar", label: "Grammar", desc: "Ngữ pháp ngắn gọn", icon: BookOpenText, grad: "from-[#4FA39A] to-[#357C75]" },
  { href: "/reading", label: "Reading", desc: "Đọc hiểu IELTS", icon: BookOpen, grad: "from-[#5E8E78] to-[#3F6553]" },
  { href: "/listening", label: "Listening", desc: "Nghe + Q&A", icon: Headphones, grad: "from-[#6E93B5] to-[#4C6E92]" },
  { href: "/writing", label: "Writing", desc: "AI chấm band IELTS", icon: PenLine, grad: "from-[#CBA45F] to-[#9A7635]" },
  { href: "/speaking", label: "Speaking", desc: "3 part — AI đánh giá", icon: Mic, grad: "from-[#CC7D58] to-[#A85B3C]" },
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
      examDate: true,
      role: true,
      isPremium: true,
    },
  });
  if (!user) return null;

  // Premium gate + pending request flag for the bottom CTA cards. Cheap
  // lookup; reused throughout the dashboard render.
  const isPremium = effectivePremium(
    user as { role: "LEARNER" | "ADMIN" | "OWNER"; isPremium: boolean },
  );
  const pendingPremiumRequest = isPremium
    ? false
    : !!(await prisma.premiumRequest.findFirst({
        where: { userId: session.user.id, status: "PENDING" },
        select: { id: true },
      }));

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
      <div className="relative overflow-hidden rounded-3xl">
        <Honeycomb className="absolute inset-0 text-gold/[0.06]" />
        <div className="relative flex items-center gap-3">
          <BeeMascot className="w-16 shrink-0 animate-float" priority />
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              Chào {user.name || "bạn"} <span className="inline-block animate-float">👋</span>
            </h1>
            <p className="text-muted-foreground mt-1">Chọn một kỹ năng để bắt đầu luyện tập hôm nay.</p>
          </div>
        </div>
      </div>

      <StatsRow
        streakDays={displayStreak}
        streakRestoreRemaining={restore.remaining}
        targetBand={user.targetBand}
        weekMinutes={weekMinutes}
        weekSessions={weekAttempts.length}
      />

      <ExamCountdown examDate={user.examDate ? user.examDate.toISOString().slice(0, 10) : null} />

      <StudySchedule
        examDate={user.examDate ? user.examDate.toISOString().slice(0, 10) : null}
        targetBand={user.targetBand}
      />

      <Link href="/mock" className="block group">
        <div className="relative overflow-hidden rounded-3xl gradient-brand p-6 md:p-8 text-white shadow-xl shadow-primary/20 transition-all hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-0.5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.2),transparent_50%)]" />
          <div className="relative flex items-center gap-4 flex-wrap">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 backdrop-blur border border-white/20">
              <GraduationCap className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Thi thử IELTS Full</h2>
              <p className="text-white/90 text-sm mt-0.5">4 kỹ năng → AI chấm overall + per-skill band</p>
            </div>
            <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </Link>

      {/* Shadowing hero — highlight new feature: practice with YouTube
          videos, AI scores pronunciation per sentence. Sits between Mock
          card and module grid so it's the second-most prominent CTA. */}
      <Link href="/shadowing" className="block group">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#9A7BA8] via-[#8A6E9C] to-[#6E5680] p-6 md:p-8 text-white shadow-xl shadow-[#8A6E9C]/25 transition-all hover:shadow-2xl hover:shadow-[#8A6E9C]/35 hover:-translate-y-0.5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_85%,rgba(255,255,255,0.25),transparent_55%)]" />
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <span className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border border-white/30">
            <Sparkles className="h-3 w-3" /> Mới
          </span>
          <div className="relative flex items-center gap-4 flex-wrap">
            <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-white/15 backdrop-blur border border-white/20">
              <Video className="h-7 w-7" />
              <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-white text-[#8A6E9C] shadow-md">
                <Play className="h-3 w-3 fill-current" />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Shadowing với YouTube</h2>
              <p className="text-white/90 text-sm mt-0.5">Nghe – nói theo video → AI chấm phát âm từng câu</p>
            </div>
            <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </Link>

      <div>
        <h2 className="text-xl font-extrabold mb-4 tracking-tight flex items-center gap-2">
          <Leaf className="h-4 w-4 text-leaf" />
          Phần học:
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m, i) => {
            const Icon = m.icon;
            return (
              <ScrollReveal key={m.href} delay={i * 60}>
                <Link href={m.href} className="group block h-full">
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
              </ScrollReveal>
            );
          })}
        </div>
      </div>

      {recentAttempts.length > 0 && (
        <div>
          <h2 className="text-xl font-extrabold mb-4 tracking-tight flex items-center gap-2">
            <Leaf className="h-4 w-4 text-leaf" />
            Gần đây
          </h2>
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

      {/* Bottom CTA pair — premium upsell on the left, coupon redemption
          on the right. Hidden behind no flag: even premium users see the
          coupon card so they can still claim XP/heart codes. */}
      <PremiumCouponCards
        isPremium={isPremium}
        hasPendingRequest={pendingPremiumRequest}
      />
    </div>
  );
}
