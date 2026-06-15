import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { effectivePremium } from "@/lib/premium";
import { getCurrentUserChrome } from "@/lib/user-cache";
import { TopNav } from "@/components/learn/top-nav";
import { Sidebar } from "@/components/learn/sidebar";
import { BottomNav } from "@/components/learn/bottom-nav";
import { SkillTheme } from "@/components/learn/skill-theme";
import { StatsBar } from "@/components/learn/stats-bar";
import { LearnBackground } from "@/components/learn/learn-background";
import { FloatingHelpers } from "@/components/learn/floating-helpers";
import { BackgroundMusicPlayer } from "@/components/learn/background-music";

export default async function LearnLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  // `session.user.role` is refreshed from DB by the jwt callback in auth.ts
  // (at most every 30 s) — so a freshly-promoted admin sees the Admin link on
  // their next page load without having to log out.
  const role = (session.user as { role?: string }).role;
  const isAdmin = role === "ADMIN" || role === "OWNER";
  // Premium gate read — used to lock/unlock the Vượt band link and show the
  // "Premium ON" badge. Cheap single-column lookup.
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isPremium: true, premiumUntil: true },
  });
  const isPremium = effectivePremium(
    (dbUser ?? { role: "LEARNER", isPremium: false, premiumUntil: null }) as {
      role: "LEARNER" | "ADMIN" | "OWNER";
      isPremium: boolean;
      premiumUntil: Date | null;
    },
  );

  return (
    <div className="min-h-screen">
      <LearnBackground />
      <div data-chrome>
        <TopNav
          isPremium={isPremium}
          rightSlot={
            <Suspense fallback={<StatsBarSkeleton />}>
              <UserChrome userId={userId} />
            </Suspense>
          }
        />
        <Sidebar isAdmin={isAdmin} isPremium={isPremium} />
      </div>
      <main className="min-h-screen pt-16 md:ml-[68px]">
        <div className="mx-auto max-w-6xl p-4 pb-[calc(env(safe-area-inset-bottom)_+_7rem)] md:p-6 md:pb-8">
          <SkillTheme>{children}</SkillTheme>
        </div>
      </main>
      <div data-chrome>
        <BottomNav isAdmin={isAdmin} isPremium={isPremium} />
        <Suspense fallback={null}>
          <FloatingHelpersGate userId={userId} />
        </Suspense>
        <BackgroundMusicPlayer />
      </div>
    </div>
  );
}

/**
 * User-dependent chrome for the top navbar (XP/streak/hearts pills + avatar).
 * Streamed via Suspense so the shell renders immediately. Stats hide on the
 * smallest screens to keep the mobile navbar uncluttered.
 */
async function UserChrome({ userId }: { userId: string }) {
  const user = await getCurrentUserChrome(userId);
  const initials = (user?.name || user?.email || "U").slice(0, 2).toUpperCase();
  return (
    <>
      <div className="hidden sm:block">
        <StatsBar xp={user?.xp ?? 0} hearts={user?.hearts ?? 5} streakDays={user?.streakDays ?? 0} />
      </div>
      <Link
        href="/profile"
        aria-label="Hồ sơ cá nhân"
        className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full ring-2 ring-border transition-all hover:ring-primary"
      >
        {user?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center gradient-brand text-xs font-extrabold text-white">
            {initials}
          </span>
        )}
      </Link>
    </>
  );
}

/** Pop quiz preference also lives in user row — gate via the same Suspense. */
async function FloatingHelpersGate({ userId }: { userId: string }) {
  const user = await getCurrentUserChrome(userId);
  return <FloatingHelpers popQuizEnabled={user?.popQuizOn ?? false} />;
}

function StatsBarSkeleton() {
  return (
    <div className="hidden items-center gap-1.5 sm:flex">
      <div className="h-8 w-12 animate-pulse rounded-full bg-muted/60" />
      <div className="h-8 w-12 animate-pulse rounded-full bg-muted/60" />
      <div className="h-8 w-12 animate-pulse rounded-full bg-muted/60" />
    </div>
  );
}
