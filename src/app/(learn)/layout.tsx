import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Sidebar, MobileMenu } from "@/components/learn/sidebar";
import { StatsBar } from "@/components/learn/stats-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LearnBackground } from "@/components/learn/learn-background";

export default async function LearnLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { xp: true, hearts: true, streakDays: true, name: true, role: true, avatarUrl: true, email: true },
  });
  const isAdmin = user?.role === "ADMIN";
  const initials = (user?.name || user?.email || "U").slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen">
      <LearnBackground />
      <Sidebar isAdmin={isAdmin} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-background/80 backdrop-blur-md px-4 py-3 md:px-8 md:py-4">
          <div className="flex items-center gap-2 md:hidden">
            <MobileMenu isAdmin={isAdmin} />
            <div className="grid h-9 w-9 place-items-center rounded-xl gradient-brand text-white font-bold text-sm">🐝</div>
            <span className="font-extrabold tracking-tight">Bee IELTS</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <StatsBar xp={user?.xp ?? 0} hearts={user?.hearts ?? 5} streakDays={user?.streakDays ?? 0} />
            <ThemeToggle />
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
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
