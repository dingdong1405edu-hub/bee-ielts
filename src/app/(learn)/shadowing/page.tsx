import Link from "next/link";
import { Headphones, Keyboard, Sparkles, Upload, Clock, Crown, Lock } from "lucide-react";
import type { CEFRLevel } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { effectivePremium } from "@/lib/premium";
import {EmptyState } from "@/components/brand";
import { PRACTICE_LEVELS, LEVEL_DESC, LEVEL_BADGE_CLASS, LEVEL_PILL_CLASS } from "@/lib/cefr";

export const dynamic = "force-dynamic";

export default async function ShadowingLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; level?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isPremium: true },
  });
  const isPremium = effectivePremium(
    me as { role: "LEARNER" | "ADMIN" | "OWNER"; isPremium: boolean } | null,
  );
  const sp = await searchParams;
  const mode = sp.mode === "dictation" ? "DICTATION" : "SHADOWING";
  const levelFilter = (PRACTICE_LEVELS as readonly string[]).includes(sp.level ?? "")
    ? (sp.level as CEFRLevel)
    : null;
  // Preserve the mode across the level filter links.
  const modeQ = mode === "DICTATION" ? "mode=dictation" : "";

  const lessons = await prisma.shadowingLesson.findMany({
    where: { published: true, ...(levelFilter ? { level: levelFilter } : {}) },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { segments: true } } },
    take: 60,
  });

  return (
    <div className="relative max-w-6xl mx-auto space-y-6">
      
      <div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-[#A560E8]/10 border border-[#A560E8]/20 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider"
          style={{ color: "#A560E8" }}
        >
          <Headphones className="h-3 w-3" />
          {mode === "SHADOWING" ? "Shadowing" : "Dictation"}
        </span>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-2">
          {mode === "SHADOWING" ? "Luyện Shadowing" : "Luyện Dictation"}
        </h1>
        <p className="text-muted-foreground mt-1.5">
          {mode === "SHADOWING"
            ? "Chọn chủ đề để luyện kỹ năng nói một cách tự nhiên"
            : "Nghe và gõ lại từng câu để rèn nghe + chính tả"}
        </p>
      </div>

      {/* Mode toggle */}
      <div className="inline-flex rounded-full border bg-card p-1 gap-1">
        <ModeTab
          href="/shadowing"
          active={mode === "SHADOWING"}
          icon={Headphones}
          label="SHADOWING"
        />
        <ModeTab
          href="/shadowing?mode=dictation"
          active={mode === "DICTATION"}
          icon={Keyboard}
          label="DICTATION"
        />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-lg font-extrabold tracking-tight">Tất cả bài học</h2>
        <span className="rounded-full bg-sage-500/10 text-sage-700 dark:text-sage-300 px-3 py-1 text-xs font-extrabold">
          {lessons.length} bài học
        </span>
      </div>

      {/* Difficulty filter — pick a CEFR level (B1–C2) or all. */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs font-bold text-muted-foreground mr-1">Độ khó:</span>
        <Link
          href={`/shadowing${modeQ ? `?${modeQ}` : ""}`}
          className={`rounded-full px-3 py-1 text-xs font-extrabold border-2 transition-colors ${
            levelFilter === null
              ? "border-foreground bg-foreground text-background"
              : "border-transparent bg-muted/50 text-muted-foreground hover:bg-accent"
          }`}
        >
          Tất cả
        </Link>
        {PRACTICE_LEVELS.map((lv) => {
          const active = levelFilter === lv;
          const qs = [modeQ, `level=${lv}`].filter(Boolean).join("&");
          return (
            <Link
              key={lv}
              href={`/shadowing?${qs}`}
              title={LEVEL_DESC[lv]}
              className={`rounded-full px-3 py-1 text-xs font-extrabold border-2 transition-colors ${
                active
                  ? `${LEVEL_BADGE_CLASS[lv]} border-transparent text-white`
                  : `border-transparent ${LEVEL_PILL_CLASS[lv]} hover:brightness-95`
              }`}
            >
              {lv}
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Featured "Luyện với nội dung bạn yêu thích" card */}
        <Link
          href="/shadowing"
          className="group sm:col-span-2 lg:col-span-2 rounded-3xl bg-gradient-to-br from-gold-100 via-gold-100 to-rose-100 dark:from-gold-900/40 dark:via-gold-900/40 dark:to-rose-900/40 p-6 relative overflow-hidden border-2 border-gold-200 dark:border-gold-700/50 hover:shadow-xl transition-shadow"
        >
          <span className="absolute top-4 left-4 inline-flex items-center gap-1 rounded-full bg-white/80 dark:bg-card/80 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-gold-700 dark:text-gold-300 shadow-sm">
            <Sparkles className="h-3 w-3" /> Mới
          </span>
          <div className="relative">
            <h3 className="text-2xl font-extrabold tracking-tight leading-tight mt-6">
              Luyện với<br />
              nội dung <span className="text-gold-600">bạn</span><br />
              yêu thích
            </h3>
            <p className="mt-3 text-sm text-foreground dark:text-muted-foreground max-w-xs">
              Upload video hoặc audio của riêng bạn để luyện Shadowing và Dictation với Bee.
            </p>
            <div className="mt-5 inline-flex flex-col">
              <div className="inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-card px-5 py-3 font-extrabold shadow-md group-hover:shadow-lg transition-shadow">
                <Upload className="h-4 w-4 text-gold-600" />
                <span className="text-sm">UPLOAD VIDEO / AUDIO</span>
              </div>
              <span className="text-[11px] text-gold-700 dark:text-gold-300 mt-1.5 ml-2 italic">
                Sắp ra mắt
              </span>
            </div>
          </div>
        </Link>

        {/* Lesson cards */}
        {lessons.map((l) => {
          // Premium-gated lessons: free users land on the upsell page instead.
          const locked = l.premium && !isPremium;
          const href = locked
            ? "/premium?from=shadowing"
            : `/shadowing/${l.id}${mode === "DICTATION" ? "?mode=dictation" : ""}`;
          return (
          <Link
            key={l.id}
            href={href}
            className="group rounded-2xl bg-card border-2 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <div className="relative aspect-video bg-muted">
              {l.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={l.thumbnailUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
              <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                <span className="rounded-md bg-rose-600 text-white px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                  {l.source}
                </span>
                {l.level && (
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider shadow-sm text-white ${LEVEL_BADGE_CLASS[l.level]}`}
                  >
                    {l.level}
                  </span>
                )}
                {l.premium && (
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-gold-500 text-gold-950 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                    <Crown className="h-2.5 w-2.5" /> Premium
                  </span>
                )}
              </div>
              <div className="absolute top-2 right-2">
                <span className="rounded-md bg-sage-600 text-white px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                  Cộng đồng
                </span>
              </div>
              <div className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/60 text-white px-1.5 py-0.5 text-[10px] font-bold backdrop-blur-sm">
                <Clock className="h-2.5 w-2.5" /> {l._count.segments} đoạn
              </div>
              {/* Lock overlay for free users */}
              {locked && (
                <div className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-[1px]">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-3 py-1.5 text-xs font-extrabold text-gold-950 shadow-lg">
                    <Lock className="h-3.5 w-3.5" /> Mở khoá Premium
                  </span>
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="font-bold text-sm leading-snug line-clamp-2">{l.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{l._count.segments} phân đoạn</p>
            </div>
          </Link>
          );
        })}
      </div>

      {lessons.length === 0 && (
        <EmptyState
          title="Chưa có bài Shadowing nào"
          description="Kho bài luyện đang trống. Admin có thể thêm bài mới để cả cộng đồng cùng luyện với Bee."
          action={
            <Link
              href="/admin/shadowing"
              className="inline-flex items-center gap-1.5 rounded-full gradient-brand px-5 py-2.5 text-sm font-bold text-white shadow-md transition-opacity hover:opacity-90"
            >
              Thêm bài tại /admin/shadowing
            </Link>
          }
        />
      )}
    </div>
  );
}

function ModeTab({
  href,
  active,
  icon: Icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition-colors ${
        active
          ? "bg-foreground text-background shadow-sm"
          : "text-muted-foreground hover:bg-accent"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
