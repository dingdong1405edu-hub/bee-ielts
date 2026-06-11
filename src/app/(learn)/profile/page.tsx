import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Headphones, PenLine, Mic, Sparkles, BookOpenText, Zap, Flame, Target, ChevronRight, GraduationCap, Trophy, Lock } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { ProfileHeader } from "./profile-header";
import { DeleteAttemptButton } from "@/components/learn/delete-attempt-button";
import { EmptyState, Leaf } from "@/components/brand";
import { ACHIEVEMENTS } from "@/lib/achievements/catalog";
import { listUnlockedCodes } from "@/lib/achievements/award";

export const dynamic = "force-dynamic";

// Skills that have a per-attempt review page.
const REVIEW_PATH: Record<string, string> = {
  READING: "/reading/review",
  LISTENING: "/listening/review",
  WRITING: "/writing/review",
  SPEAKING: "/speaking/review",
};

const SKILL_META: Record<string, { label: string; icon: typeof BookOpen; grad: string; unit: string }> = {
  READING: { label: "Reading", icon: BookOpen, grad: "from-sage-500 to-teal-500", unit: "band" },
  LISTENING: { label: "Listening", icon: Headphones, grad: "from-gold-400 to-gold-600", unit: "band" },
  WRITING: { label: "Writing", icon: PenLine, grad: "from-honey to-honey-deep", unit: "band" },
  SPEAKING: { label: "Speaking", icon: Mic, grad: "from-leaf to-leaf-deep", unit: "band" },
  VOCAB: { label: "Vocabulary", icon: Sparkles, grad: "from-honey to-honey-deep", unit: "điểm" },
  GRAMMAR: { label: "Grammar", icon: BookOpenText, grad: "from-honey to-honey-deep", unit: "điểm" },
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, attempts, mocks, unlockedCodes] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        bio: true,
        avatarUrl: true,
        coverUrl: true,
        xp: true,
        streakDays: true,
        targetBand: true,
        createdAt: true,
      },
    }),
    prisma.attempt.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: { id: true, skill: true, score: true, createdAt: true, refId: true },
    }),
    prisma.mockAttempt.findMany({
      where: { userId: session.user.id },
      orderBy: { completedAt: "desc" },
      take: 10,
      select: {
        id: true,
        completedAt: true,
        overallBand: true,
        listeningBand: true,
        readingBand: true,
        writingBand: true,
        speakingBand: true,
      },
    }),
    listUnlockedCodes(session.user.id),
  ]);
  const unlockedSet = new Set(unlockedCodes);
  if (!user) redirect("/login");

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <ProfileHeader
        name={user.name ?? ""}
        email={user.email}
        bio={user.bio ?? ""}
        avatarUrl={user.avatarUrl}
        coverUrl={user.coverUrl}
      />

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile icon={Zap} label="XP" value={String(user.xp)} grad="from-gold-400 to-gold-500" />
        <StatTile icon={Flame} label="Streak" value={`${user.streakDays} ngày`} grad="from-gold-500 to-red-500" />
        <StatTile icon={Target} label="Mục tiêu" value={`Band ${user.targetBand.toFixed(1)}`} grad="from-honey to-honey-deep" />
        <StatTile icon={BookOpen} label="Bài đã làm" value={String(attempts.length)} grad="from-sage-500 to-teal-500" />
      </div>

      {/* Achievement / badge wall */}
      <div>
        <h2 className="text-lg font-extrabold mb-3 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-honey-deep" />
          Huy chương & Danh hiệu
          <span className="ml-auto text-xs font-bold text-muted-foreground">
            {unlockedSet.size} / {ACHIEVEMENTS.length}
          </span>
        </h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = unlockedSet.has(a.code);
            const Icon =
              ((LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
                kebabToPascal(a.iconKey)
              ]) || LucideIcons.Award;
            const colorClasses = unlocked ? medalColors(a.color) : medalColorsLocked();
            return (
              <div
                key={a.code}
                className={`relative rounded-2xl border-2 p-3 text-center transition-all ${
                  unlocked
                    ? "border-honey/40 bg-paper shadow-sm hover:shadow-md"
                    : "border-dashed border-muted bg-muted/20 opacity-70"
                }`}
                title={a.description}
              >
                <div className="relative mx-auto h-16 w-16 grid place-items-center rounded-full"
                  style={{ backgroundImage: `linear-gradient(135deg, ${colorClasses.light}, ${colorClasses.dark})` }}
                >
                  <Icon className="h-8 w-8 text-white drop-shadow" />
                  {!unlocked && (
                    <div className="absolute inset-0 grid place-items-center rounded-full bg-black/40 backdrop-blur-[1px]">
                      <Lock className="h-5 w-5 text-white/90" />
                    </div>
                  )}
                </div>
                <p className="mt-2 text-[11px] uppercase tracking-wider font-bold text-honey-deep">
                  {a.tier === "gold" ? "Vàng" : a.tier === "silver" ? "Bạc" : "Đồng"}
                </p>
                <p className="font-display font-extrabold text-sm leading-tight mt-0.5">
                  {a.title}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{a.name}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mock test history */}
      {mocks.length > 0 && (
        <div>
          <h2 className="text-lg font-extrabold mb-3 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" /> Bài thi thử đã làm
          </h2>
          <div className="space-y-2">
            {mocks.map((m) => (
              <Link key={m.id} href={`/mock/review/${m.id}`} className="block">
                <Card className="hover:shadow-md hover:border-primary/40 transition-all">
                  <CardContent className="p-4 flex items-center gap-3 flex-wrap">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl gradient-brand text-white shadow-md font-extrabold">
                      {m.overallBand.toFixed(1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold inline-flex items-center gap-1.5">
                        <GraduationCap className="h-4 w-4 text-primary" /> Overall band {m.overallBand.toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat("vi-VN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(m.completedAt)}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                        <MiniBand label="L" v={m.listeningBand} />
                        <MiniBand label="R" v={m.readingBand} />
                        <MiniBand label="W" v={m.writingBand} />
                        <MiniBand label="S" v={m.speakingBand} />
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Attempt history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold flex items-center gap-2">
            <Leaf className="h-5 w-5 text-leaf" /> Bài mình đã làm
          </h2>
          {attempts.length > 0 && (
            <span className="text-xs text-muted-foreground">Nhấn 🗑 để xoá bài không cần</span>
          )}
        </div>
        {attempts.length === 0 ? (
          <EmptyState
            compact
            title="Chưa có bài nào"
            description="Bạn chưa làm bài nào. Cùng Bee bắt đầu luyện tập nhé!"
            action={
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-full gradient-brand px-5 py-2.5 text-sm font-bold text-white shadow-md transition-opacity hover:opacity-90"
              >
                Bắt đầu luyện tập
                <ChevronRight className="h-4 w-4" />
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {attempts.map((a) => {
              const meta = SKILL_META[a.skill] ?? SKILL_META.READING;
              const Icon = meta.icon;
              const reviewHref = REVIEW_PATH[a.skill] ? `${REVIEW_PATH[a.skill]}/${a.id}` : null;
              const body = (
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${meta.grad} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{meta.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(a.createdAt).toLocaleString("vi-VN")}
                      {a.refId.startsWith("mock-") && " · Thi thử"}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-extrabold text-primary">
                      {a.score != null ? a.score.toFixed(1) : "—"}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase">{meta.unit}</div>
                  </div>
                  {reviewHref && <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />}
                  <DeleteAttemptButton attemptId={a.id} />
                </CardContent>
              );
              return (
                <Card
                  key={a.id}
                  className={reviewHref ? "hover:shadow-md hover:border-primary/40 transition-all" : ""}
                >
                  {reviewHref ? (
                    <Link href={reviewHref} className="block">
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function kebabToPascal(s: string): string {
  return s.split("-").map((p) => p[0]?.toUpperCase() + p.slice(1)).join("");
}

function medalColors(color: string): { light: string; dark: string } {
  const map: Record<string, { light: string; dark: string }> = {
    amber: { light: "#fde68a", dark: "#b45309" },
    rose: { light: "#fda4af", dark: "#9f1239" },
    violet: { light: "#c4b5fd", dark: "#5b21b6" },
    sky: { light: "#7dd3fc", dark: "#075985" },
    emerald: { light: "#6ee7b7", dark: "#065f46" },
  };
  return map[color] ?? map.amber;
}

function medalColorsLocked(): { light: string; dark: string } {
  return { light: "#cbd5e1", dark: "#475569" };
}

function MiniBand({ label, v }: { label: string; v: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-extrabold">{v.toFixed(1)}</span>
    </span>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  grad,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
  grad: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${grad} text-white mb-2`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-lg font-extrabold leading-tight">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
