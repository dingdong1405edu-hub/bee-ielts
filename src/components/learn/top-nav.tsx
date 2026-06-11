"use client";
import { type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Home, LogOut, Crown, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { BeeLogo } from "@/components/brand/bee-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { isNavActive } from "./nav-config";

// Chỉ hiển thị "Trang chủ" trên thanh trên; các mục khác đã được gỡ khỏi đây
// (vẫn còn trong sidebar/mobile qua nav-config).
const TOP_LINKS = [
  { href: "/", label: "Trang chủ", icon: Home },
];

/**
 * Top horizontal app navbar (DingDongSpeak-style): logo + primary links + a
 * "Luyện kỹ năng" hover dropdown of the skills, with the user chrome (stats +
 * avatar, passed via `rightSlot`), theme toggle, Premium pill and logout on the
 * right. Pairs with the fixed left sidebar (desktop) and the bottom nav (mobile).
 */
export function TopNav({ rightSlot, isPremium }: { rightSlot?: ReactNode; isPremium?: boolean }) {
  const pathname = usePathname();
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
          {TOP_LINKS.map((l) => {
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
