import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Headphones, PenLine, Mic, Sparkles, BookOpenText, Zap, Flame, Target, ChevronRight } from "lucide-react";
import { ProfileHeader } from "./profile-header";
import { DeleteAttemptButton } from "@/components/learn/delete-attempt-button";

export const dynamic = "force-dynamic";

const SKILL_META: Record<string, { label: string; icon: typeof BookOpen; grad: string; unit: string }> = {
  READING: { label: "Reading", icon: BookOpen, grad: "from-emerald-500 to-teal-500", unit: "band" },
  LISTENING: { label: "Listening", icon: Headphones, grad: "from-amber-500 to-orange-500", unit: "band" },
  WRITING: { label: "Writing", icon: PenLine, grad: "from-rose-500 to-pink-500", unit: "band" },
  SPEAKING: { label: "Speaking", icon: Mic, grad: "from-indigo-500 to-blue-500", unit: "band" },
  VOCAB: { label: "Vocabulary", icon: Sparkles, grad: "from-violet-500 to-fuchsia-500", unit: "điểm" },
  GRAMMAR: { label: "Grammar", icon: BookOpenText, grad: "from-blue-500 to-cyan-500", unit: "điểm" },
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, attempts] = await Promise.all([
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
  ]);
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
        <StatTile icon={Zap} label="XP" value={String(user.xp)} grad="from-amber-400 to-yellow-500" />
        <StatTile icon={Flame} label="Streak" value={`${user.streakDays} ngày`} grad="from-orange-500 to-red-500" />
        <StatTile icon={Target} label="Mục tiêu" value={`Band ${user.targetBand.toFixed(1)}`} grad="from-violet-500 to-fuchsia-500" />
        <StatTile icon={BookOpen} label="Bài đã làm" value={String(attempts.length)} grad="from-emerald-500 to-teal-500" />
      </div>

      {/* Attempt history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold">Bài mình đã làm</h2>
          {attempts.length > 0 && (
            <span className="text-xs text-muted-foreground">Nhấn 🗑 để xoá bài không cần</span>
          )}
        </div>
        {attempts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Bạn chưa làm bài nào. Hãy bắt đầu luyện tập nhé! 🐝
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {attempts.map((a) => {
              const meta = SKILL_META[a.skill] ?? SKILL_META.READING;
              const Icon = meta.icon;
              const isWriting = a.skill === "WRITING";
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
                  {isWriting && <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />}
                  <DeleteAttemptButton attemptId={a.id} />
                </CardContent>
              );
              return (
                <Card
                  key={a.id}
                  className={isWriting ? "hover:shadow-md hover:border-primary/40 transition-all" : ""}
                >
                  {isWriting ? (
                    <Link href={`/writing/review/${a.id}`} className="block">
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
