import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { Heart, Zap, Flame, BookOpenText, Play, Lock, Check, Settings } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Honeycomb, EmptyState } from "@/components/brand";

export const dynamic = "force-dynamic";

export default async function GrammarPathPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const [units, user] = await Promise.all([
    prisma.grammarUnit.findMany({
      orderBy: [{ level: "asc" }, { order: "asc" }],
      include: {
        lessons: {
          orderBy: { order: "asc" },
          include: {
            progress: userId ? { where: { userId } } : false,
          },
        },
      },
    }),
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: { hearts: true, xp: true, streakDays: true },
        })
      : Promise.resolve(null),
  ]);

  // Flatten all lessons across units to a single path
  const flat = units.flatMap((u) =>
    u.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      unitTitle: u.title,
      level: u.level,
      progress: (l as { progress?: { completed: boolean; score: number | null }[] }).progress?.[0],
    })),
  );

  const totalLessons = flat.length;
  const completed = flat.filter((l) => l.progress?.completed).length;
  const totalXP = completed * 40;
  const firstUnitTitle = units[0]?.title ?? "Grammar";

  // Find first non-completed lesson
  const activeIdx = flat.findIndex((l) => !l.progress?.completed);

  return (
    <div className="relative max-w-2xl mx-auto space-y-6">
      <Honeycomb className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 text-[#14B8A6]/[0.04]" />
      {/* Hero path header */}
      <div className="gradient-brand relative overflow-hidden rounded-3xl p-6 md:p-7 text-white shadow-xl shadow-primary/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.2),transparent_50%)]" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Beginner Path</h1>
            <span className="mt-2 block h-1 w-12 rounded-full" style={{ backgroundColor: "#14B8A6" }} aria-hidden />
            <p className="text-white/85 text-sm mt-2">
              Từ A1 → C2 · {totalLessons} bài học
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-extrabold leading-none">{totalXP}</div>
            <div className="text-xs text-white/80">XP</div>
          </div>
        </div>
        <div className="relative mt-5 space-y-1.5">
          <Progress value={(completed / Math.max(1, totalLessons)) * 100} className="h-2 bg-white/20" />
          <div className="flex items-center justify-between text-xs text-white/85">
            <span>{completed}/{totalLessons} bài hoàn thành</span>
            <span>{Math.round((completed / Math.max(1, totalLessons)) * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatPill icon={Heart} value={user?.hearts ?? 5} unit="mạng" color="text-rose-500" bg="bg-rose-500/15" />
        <StatPill icon={Zap} value={user?.xp ?? 0} unit="lượt" color="text-primary/70" bg="bg-primary/15" />
        <StatPill icon={Flame} value={user?.streakDays ?? 0} unit="ngày" color="text-gold-600" bg="bg-gold-500/15" />
      </div>

      {/* Unit/section banner */}
      <Link
        href="#"
        className="gradient-brand block relative overflow-hidden rounded-2xl p-5 text-white shadow-lg"
      >
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/20 backdrop-blur">
            <BookOpenText className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-wider font-bold text-white/85">English Grammar</div>
            <div className="font-extrabold text-lg truncate">{firstUnitTitle}</div>
            <Progress value={(completed / Math.max(1, totalLessons)) * 100} className="h-1.5 bg-white/20 mt-1.5" />
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-extrabold">{Math.round((completed / Math.max(1, totalLessons)) * 100)}%</div>
            <div className="text-[11px] text-white/80">{completed === 0 ? "chưa bắt đầu" : "đang học"}</div>
          </div>
        </div>
      </Link>

      {totalLessons === 0 ? (
        <EmptyState
          title="Chưa có bài ngữ pháp nào"
          description="Lộ trình ngữ pháp đang được Bee chuẩn bị. Trong lúc chờ, hãy luyện từ vựng để giữ streak nhé!"
          action={
            <Link
              href="/vocab"
              className="inline-flex items-center gap-1.5 rounded-full gradient-brand px-5 py-2.5 text-sm font-bold text-white shadow-md transition-opacity hover:opacity-90"
            >
              Luyện từ vựng
            </Link>
          }
        />
      ) : (
        <div className="relative py-6">
          {/* dashed vertical line */}
          <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 border-l-2 border-dashed border-border dark:border-border" aria-hidden />
          <div className="relative space-y-12">
            {flat.map((l, i) => {
              const done = !!l.progress?.completed;
              const isActive = i === activeIdx;
              const locked = !done && !isActive && (activeIdx === -1 || i > activeIdx);
              // zigzag horizontal offset
              const offset = i % 4 === 0 ? "ml-0" : i % 4 === 1 ? "ml-24" : i % 4 === 2 ? "ml-12" : "-ml-12";
              return (
                <PathNode
                  key={l.id}
                  href={locked ? "#" : `/grammar/${l.id}`}
                  title={l.title}
                  level={l.level as string}
                  state={done ? "done" : isActive ? "active" : "locked"}
                  xp={done ? l.progress?.score ?? 0 : 40}
                  offset={offset}
                  locked={locked}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({
  icon: Icon,
  value,
  unit,
  color,
  bg,
}: {
  icon: typeof Heart;
  value: number;
  unit: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border bg-card px-3 py-2.5">
      <div className={`grid h-8 w-8 place-items-center rounded-xl ${bg}`}>
        <Icon className={`h-4 w-4 ${color} fill-current`} />
      </div>
      <div>
        <div className="text-lg font-extrabold leading-none">{value}</div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{unit}</div>
      </div>
    </div>
  );
}

function PathNode({
  href,
  title,
  level,
  state,
  xp,
  offset,
  locked,
}: {
  href: string;
  title: string;
  level: string;
  state: "done" | "active" | "locked";
  xp: number;
  offset: string;
  locked: boolean;
}) {
  const isActive = state === "active";
  const isDone = state === "done";

  const ring = isActive ? "from-honey to-honey-deep" : isDone ? "from-sage-400 to-teal-500" : "from-muted to-muted-foreground";
  const ringShadow = isActive ? "shadow-primary/40" : isDone ? "shadow-sage-500/40" : "shadow-muted-foreground/20";

  return (
    <div className={`relative w-fit mx-auto flex flex-col items-center ${offset}`}>
      <Link
        href={href}
        aria-disabled={locked}
        className={`group relative ${locked ? "pointer-events-none" : ""}`}
      >
        <div
          className={`
            relative grid h-24 w-24 place-items-center rounded-[32%] bg-gradient-to-br ${ring} text-white
            shadow-[0_8px_0_0_rgba(0,0,0,0.15)] ${ringShadow} shadow-lg
            transition-all duration-200
            ${isActive ? "hover:-translate-y-1" : ""}
            ${locked ? "opacity-60" : ""}
          `}
        >
          {isDone ? (
            <Check className="h-8 w-8" strokeWidth={3} />
          ) : isActive ? (
            <div className="flex flex-col items-center gap-0.5">
              <Settings className="h-6 w-6" />
              <span className="text-[10px] font-extrabold tracking-wider">BẮT ĐẦU</span>
            </div>
          ) : (
            <Lock className="h-7 w-7" />
          )}
        </div>
      </Link>

      <div className="mt-3 flex flex-col items-center text-center gap-1.5">
        <span
          className={`
            inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase border
            ${isActive ? "bg-primary/15 text-primary border-primary/40" : isDone ? "bg-sage-500/15 text-sage-700 dark:text-sage-300 border-sage-500/40" : "bg-muted text-muted-foreground border-border"}
          `}
        >
          {locked ? "KHOÁ" : "NGỮ PHÁP"}
        </span>
        <div className={`max-w-[160px] text-sm font-bold leading-tight ${locked ? "text-muted-foreground" : "text-foreground"}`}>{title}</div>
        <div className={`text-[11px] font-bold ${isActive ? "text-primary" : isDone ? "text-sage-600 dark:text-sage-400" : "text-muted-foreground"}`}>
          {isDone ? `+${xp} XP đã nhận` : locked ? `· ${level} ·` : `+${xp} XP`}
        </div>
      </div>
    </div>
  );
}
