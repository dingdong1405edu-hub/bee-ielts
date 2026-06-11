"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Home, Target, TrendingUp, GraduationCap, Users, ChevronDown, LogOut, Crown, Lock, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { BeeLogo } from "@/components/brand/bee-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { NAV_GROUPS, isNavActive } from "./nav-config";

const SKILLS = NAV_GROUPS.find((g) => g.label === "Luyện kỹ năng")?.items ?? [];

const TOP_LINKS = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/dashboard", label: "Mục tiêu", icon: Target },
  { href: "/band-climber", label: "Vượt band", icon: TrendingUp },
  { href: "/mock", label: "Thi thử", icon: GraduationCap },
  { href: "/community", label: "Cộng đồng", icon: Users },
];

/**
 * Top horizontal app navbar (DingDongSpeak-style): logo + primary links + a
 * "Luyện kỹ năng" hover dropdown of the skills, with the user chrome (stats +
 * avatar, passed via `rightSlot`), theme toggle, Premium pill and logout on the
 * right. Pairs with the fixed left sidebar (desktop) and the bottom nav (mobile).
 */
export function TopNav({ rightSlot, isPremium }: { rightSlot?: ReactNode; isPremium?: boolean }) {
  const pathname = usePathname();
  const skillsActive = SKILLS.some((s) => isNavActive(pathname, s.href));
  const linkBase = "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors";
  const linkActive = "bg-primary/10 text-primary font-semibold";
  const linkIdle = "text-muted-foreground hover:text-foreground hover:bg-muted";

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-16 border-b border-border bg-background/85 backdrop-blur-md">
      <nav className="flex h-16 items-center gap-2 px-3 sm:px-5">
        {/* Logo → home (index.html) */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-cream border border-gold/30">
            <BeeLogo variant="bare" className="h-6 w-6 text-ink" />
          </span>
          <span className="hidden font-extrabold tracking-tight text-[17px] sm:block">
            Bee<span className="gradient-brand-text">IELTS</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="ml-2 hidden items-center gap-1 md:flex">
          {TOP_LINKS.slice(0, 2).map((l) => {
            const Icon = l.icon;
            return (
              <Link key={l.href} href={l.href} aria-current={isNavActive(pathname, l.href) ? "page" : undefined} className={cn(linkBase, isNavActive(pathname, l.href) ? linkActive : linkIdle)}>
                <Icon size={16} /> {l.label}
              </Link>
            );
          })}

          {/* Skills dropdown */}
          <div className="group relative">
            <button type="button" aria-haspopup="true" className={cn(linkBase, skillsActive ? linkActive : linkIdle)}>
              <Layers size={16} />
              Luyện kỹ năng
              <ChevronDown size={14} className="transition-transform group-hover:rotate-180 group-focus-within:rotate-180" />
            </button>
            {/* pt-2 bridges the gap so hover doesn't drop; focus-within opens it via keyboard */}
            <div className="invisible absolute left-0 top-full pt-2 opacity-0 transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <div className="grid w-[420px] grid-cols-2 gap-1 rounded-2xl border border-border bg-popover p-2 shadow-xl">
                {SKILLS.map((s) => {
                  const Icon = s.icon;
                  const active = isNavActive(pathname, s.href);
                  return (
                    <Link
                      key={s.href}
                      href={s.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                        active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted",
                      )}
                    >
                      <Icon size={17} className={active ? "text-primary" : "text-muted-foreground"} />
                      {s.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {TOP_LINKS.slice(2).map((l) => {
            const Icon = l.icon;
            return (
              <Link key={l.href} href={l.href} aria-current={isNavActive(pathname, l.href) ? "page" : undefined} className={cn(linkBase, isNavActive(pathname, l.href) ? linkActive : linkIdle)}>
                <Icon size={16} /> {l.label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <Link
            href="/premium"
            className="hidden items-center gap-1.5 rounded-full border border-gold-300 bg-gold-100 px-3 py-1.5 text-xs font-bold text-gold-700 transition-colors hover:bg-gold-200 dark:border-gold-500/30 dark:bg-gold-500/15 dark:text-gold-300 sm:flex"
          >
            {isPremium ? <Crown size={13} /> : <Lock size={12} />} Premium
          </Link>
          {rightSlot}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            title="Đăng xuất"
            className="hidden rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive md:inline-flex"
          >
            <LogOut size={16} />
          </button>
        </div>
      </nav>
    </header>
  );
}
