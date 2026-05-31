import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentUserChrome } from "@/lib/user-cache";
import { Sidebar, MobileMenu } from "@/components/learn/sidebar";
import { StatsBar } from "@/components/learn/stats-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LearnBackground } from "@/components/learn/learn-background";
import { FloatingHelpers } from "@/components/learn/floating-helpers";

export default async function LearnLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const isAdmin = (session.user as { role?: string }).role === "ADMIN";
  const userId = session.user.id;

  return (
    <div className="flex min-h-screen">
      <LearnBackground />
      <div data-chrome>
        <Sidebar isAdmin={isAdmin} />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <header data-chrome className="sticky top-0 z-30 flex items-center justify-between gap-3 backdrop-blur-md px-4 py-3 md:px-8 md:py-4">
          <div className="flex items-center gap-2 md:hidden">
            <MobileMenu isAdmin={isAdmin} />
            <div className="grid h-9 w-9 place-items-center rounded-xl gradient-brand text-white font-bold text-sm">🐝</div>
            <span className="font-extrabold tracking-tight">Bee IELTS</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Suspense fallback={<StatsBarSkeleton />}>
              <UserChrome userId={userId} />
            </Suspense>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
      <div data-chrome>
        <Suspense fallback={null}>
          <FloatingHelpersGate userId={userId} />
        </Suspense>
      </div>
    </div>
  );
}

/**
 * User-dependent chrome (XP/streak/hearts pills + avatar link). Streamed
 * via Suspense so the page shell can render immediately — without this,
 * every navigation blocked on a Prisma round-trip before showing anything.
 */
async function UserChrome({ userId }: { userId: string }) {
  const user = await getCurrentUserChrome(userId);
  const initials = (user?.name || user?.email || "U").slice(0, 2).toUpperCase();
  return (
    <>
      <StatsBar xp={user?.xp ?? 0} hearts={user?.hearts ?? 5} streakDays={user?.streakDays ?? 0} />
      <Link
        href="/profile"
        aria-label="Hồ sơ cá nhân"
        className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full ring-2 ring-border hover:ring-primary transition-all"
      >
        {user?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center gradient-brand text-white text-xs font-extrabold">
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
    <div className="flex items-center gap-1.5 sm:gap-2 animate-pulse">
      <div className="h-8 w-14 rounded-full bg-muted/60" />
      <div className="h-8 w-14 rounded-full bg-muted/60" />
      <div className="h-8 w-14 rounded-full bg-muted/60" />
      <div className="h-9 w-9 rounded-full bg-muted/60 ml-1" />
    </div>
  );
}
