import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isOwner } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { Shield, BookOpen, PenLine, Mic, Sparkles, BookOpenText, Headphones, Users, KeyRound, ExternalLink, GraduationCap, TrendingUp, Music, Activity } from "lucide-react";

const nav = [
  { href: "/admin", label: "Tổng quan", icon: Shield },
  { href: "/admin/reading", label: "Reading", icon: BookOpen },
  { href: "/admin/reading/mock", label: "Reading — Thi thử", icon: GraduationCap },
  { href: "/admin/listening", label: "Listening", icon: Headphones },
  { href: "/admin/listening/mock", label: "Listening — Thi thử", icon: GraduationCap },
  { href: "/admin/writing", label: "Writing", icon: PenLine },
  { href: "/admin/speaking", label: "Speaking", icon: Mic },
  { href: "/admin/music", label: "Nhạc nền", icon: Music },
  { href: "/admin/vocab", label: "Vocabulary", icon: Sparkles },
  { href: "/admin/grammar", label: "Grammar", icon: BookOpenText },
  { href: "/admin/band-climber", label: "Vượt band", icon: TrendingUp },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/activity", label: "Hoạt động", icon: Activity },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  // Verify role against DB (not JWT). When OWNER grants ADMIN to another
  // user, their JWT still says LEARNER — so this gate has to consult the
  // source of truth or the new admin would bounce back to /dashboard.
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, email: true },
  });
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const items = isOwner(dbUser.email)
    ? [...nav, { href: "/admin/access", label: "Phân quyền", icon: KeyRound }]
    : nav;

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:bg-card md:p-4 md:h-screen md:sticky md:top-0">
        <Link href="/admin" className="flex items-center gap-2 px-2 py-2 mb-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">A</div>
          <span className="font-bold">Admin</span>
        </Link>
        <nav className="flex-1 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Icon className="h-4 w-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <Link href="/dashboard" className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
          <ExternalLink className="h-4 w-4" /> Về Learn
        </Link>
      </aside>
      <main className="flex-1 p-4 md:p-8 min-w-0">{children}</main>
    </div>
  );
}
