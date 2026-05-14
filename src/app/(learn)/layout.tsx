import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Sidebar, MobileNav } from "@/components/learn/sidebar";
import { StatsBar } from "@/components/learn/stats-bar";

export default async function LearnLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { xp: true, hearts: true, streakDays: true, name: true, role: true },
  });
  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="flex min-h-screen">
      <Sidebar isAdmin={isAdmin} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-background/80 backdrop-blur-md px-4 py-3 md:px-8 md:py-4">
          <div className="flex items-center gap-2 md:hidden">
            <div className="grid h-9 w-9 place-items-center rounded-xl gradient-brand text-white font-bold text-sm">🐝</div>
            <span className="font-extrabold tracking-tight">Bee IELTS</span>
          </div>
          <div className="ml-auto">
            <StatsBar xp={user?.xp ?? 0} hearts={user?.hearts ?? 5} streakDays={user?.streakDays ?? 0} />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8 pb-28 md:pb-8">{children}</main>
        <MobileNav isAdmin={isAdmin} />
      </div>
    </div>
  );
}
