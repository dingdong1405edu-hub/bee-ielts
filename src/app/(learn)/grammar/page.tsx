import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import {
  Heart,
  Zap,
  Flame,
  BookOpenText,
  Lock,
  Check,
  Settings,
} from "lucide-react";
import { EmptyState } from "@/components/brand";

export const dynamic = "force-dynamic";

/**
 * Beginner Path — full A1→C2 grammar progression. Redesigned per user
 * mockup: lime-emerald gradient hero, big rounded white stat pills, single
 * full-width section banner per unit with embedded progress bar, then a
 * zigzag node trail for individual lessons.
 */
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

  const flat = units.flatMap((u) =>
    u.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      unitTitle: u.title,
      level: u.level,
      progress: (
        l as { progress?: { completed: boolean; score: number | null }[] }
      ).progress?.[0],
    })),
  );

  const totalLessons = flat.length;
  const completed = flat.filter((l) => l.progress?.completed).length;
  const totalXP = completed * 40;
  const pct = totalLessons === 0 ? 0 : (completed / totalLessons) * 100;

  // First not-yet-done lesson is "current"; everything past it is locked.
  const activeIdx = flat.findIndex((l) => !l.progress?.completed);

  // Group flat into units for the section banners (one banner per unit
  // with its own progress fill).
  const unitBlocks = units.map((u) => {
    const lessons = u.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      progress: (
        l as { progress?: { completed: boolean; score: number | null }[] }
      ).progress?.[0],
    }));
    const done = lessons.filter((l) => l.progress?.completed).length;
    return {
      id: u.id,
      title: u.title,
      level: u.level as string,
      lessons,
      done,
      total: lessons.length,
    };
  });

  return (
    <div className="relative max-w-3xl mx-auto space-y-6 pb-12">
      {/* Hero — full-width lime → amber gradient card with progress bar. */}
      <div className="relative overflow-hidden rounded-[28px] shadow-xl shadow-primary/25 gradient-brand p-7 md:p-9 text-white">
        {/* Decorative radial glow + dotted halo to give the card depth. */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.28),transparent_55%)]" />
        <div className="absolute -right-6 -top-6 h-44 w-44 rounded-full bg-white/10 blur-2xl" />

        <div className="relative flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight drop-shadow-sm">
              Beginner Path
            </h1>
            <span
              className="mt-2 block h-1.5 w-16 rounded-full bg-white/60"
              aria-hidden
            />
            <p className="text-white/95 text-sm md:text-base mt-3 font-medium">
              Từ A1 → C2 · {totalLessons} bài học
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-5xl md:text-6xl font-extrabold leading-none drop-shadow-sm">
              {totalXP}
            </div>
            <div className="text-xs text-white/90 mt-1 tracking-wider uppercase">
              XP
            </div>
          </div>
        </div>

        <div className="relative mt-8 space-y-2">
          <div className="h-1.5 rounded-full bg-white/30 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-[width] duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs md:text-sm text-white/95 font-medium">
            <span>
              {completed}/{totalLessons} bài hoàn thành
            </span>
            <span>{Math.round(pct)}%</span>
          </div>
        </div>
      </div>

      {/* Stat pills — white rounded chips with brand-coloured icon. Matches
          the mockup spacing exactly. */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <StatPill
          icon={Heart}
          value={user?.hearts ?? 5}
          unit="mạng"
          color="text-rose-500"
          bg="bg-rose-100"
        />
        <StatPill
          icon={Zap}
          value={user?.xp ?? 0}
          unit="lượt"
          color="text-emerald-600"
          bg="bg-emerald-100"
        />
        <StatPill
          icon={Flame}
          value={user?.streakDays ?? 0}
          unit="ngày"
          color="text-amber-500"
          bg="bg-amber-100"
        />
      </div>

      {/* Unit section banners — one per CEFR level group. Each fills its
          own progress bar at the bottom edge of the banner. */}
      <div className="space-y-3">
        {unitBlocks.map((u) => {
          const uPct = u.total === 0 ? 0 : (u.done / u.total) * 100;
          const state =
            u.done === 0
              ? "chưa bắt đầu"
              : u.done === u.total
                ? "hoàn thành"
                : "đang học";
          return (
            <Link
              key={u.id}
              href={`#unit-${u.id}`}
              className="group block relative overflow-hidden rounded-[22px] p-5 md:p-6 text-white shadow-lg shadow-primary/20 gradient-brand transition-transform hover:-translate-y-0.5"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.2),transparent_55%)]" />
              <div className="relative flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/25 backdrop-blur border border-white/30 shrink-0">
                  <BookOpenText className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.18em] font-extrabold text-white/95">
                    English Grammar
                  </div>
                  <div className="text-lg md:text-xl font-extrabold leading-tight">
                    {u.level} · {u.title}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl md:text-3xl font-extrabold leading-none">
                    {Math.round(uPct)}%
                  </div>
                  <div className="text-[11px] text-white/90 mt-0.5">
                    {state}
                  </div>
                </div>
              </div>
              <div className="relative mt-4 h-1 rounded-full bg-white/30 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-[width] duration-700"
                  style={{ width: `${uPct}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>

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
        <div className="relative pt-8">
          <div
            className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 border-l-2 border-dashed border-primary/25"
            aria-hidden
          />
          <div className="relative space-y-14">
            {flat.map((l, i) => {
              const done = !!l.progress?.completed;
              const isActive = i === activeIdx;
              const locked =
                !done && !isActive && (activeIdx === -1 || i > activeIdx);
              const offset =
                i % 4 === 0
                  ? "ml-0"
                  : i % 4 === 1
                    ? "ml-24"
                    : i % 4 === 2
                      ? "ml-12"
                      : "-ml-12";
              return (
                <PathNode
                  key={l.id}
                  href={locked ? "#" : `/grammar/${l.id}`}
                  title={l.title}
                  level={l.level as string}
                  state={done ? "done" : isActive ? "active" : "locked"}
                  xp={done ? (l.progress?.score ?? 0) : 40}
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
    <div className="flex items-center gap-3 rounded-full bg-card border-2 border-border/60 px-4 py-3 shadow-sm">
      <div
        className={`grid h-9 w-9 place-items-center rounded-full ${bg} shrink-0`}
      >
        <Icon className={`h-4.5 w-4.5 ${color} fill-current`} />
      </div>
      <div className="min-w-0">
        <div className="text-xl md:text-2xl font-extrabold leading-none">
          {value}
        </div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-[0.18em] font-bold">
          {unit}
        </div>
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

  // Active = lime→amber (matches hero), Done = emerald solid, Locked = muted.
  const ring = isActive
    ? "from-lime-400 to-amber-400"
    : isDone
      ? "from-emerald-400 to-emerald-600"
      : "from-muted to-muted-foreground";
  const ringShadow = isActive
    ? "shadow-amber-400/40"
    : isDone
      ? "shadow-emerald-500/40"
      : "shadow-muted-foreground/20";

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
              <span className="text-[10px] font-extrabold tracking-wider">
                BẮT ĐẦU
              </span>
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
            ${
              isActive
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                : isDone
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                  : "bg-muted text-muted-foreground border-border"
            }
          `}
        >
          {locked ? "KHOÁ" : "NGỮ PHÁP"}
        </span>
        <div
          className={`max-w-[180px] text-sm font-bold leading-tight ${
            locked ? "text-muted-foreground" : "text-foreground"
          }`}
        >
          {title}
        </div>
        <div
          className={`text-[11px] font-bold ${
            isActive
              ? "text-amber-600"
              : isDone
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground"
          }`}
        >
          {isDone ? `+${xp} XP đã nhận` : locked ? `· ${level} ·` : `+${xp} XP`}
        </div>
      </div>
    </div>
  );
}
