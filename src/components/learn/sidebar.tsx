"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, Shield, User, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_GROUPS, isNavActive, type NavItem } from "./nav-config";

/**
 * Desktop sidebar (md+): a collapsed 68px icon-rail by default that expands to
 * a full 240px labelled rail ON HOVER. The expanded rail overlays the page
 * (it's fixed) so the content never reflows — the main content keeps a fixed
 * 68px left margin (see `(learn)/layout.tsx`). Pairs with <TopNav/> above and
 * <BottomNav/> on mobile.
 */
export function Sidebar({ isAdmin, isPremium }: { isAdmin?: boolean; isPremium?: boolean }) {
  const pathname = usePathname();

  const itemClass = (active: boolean) =>
    cn(
      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
      active
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );
  // Labels + group headings are hidden on the collapsed rail and fade in only
  // when it expands on hover.
  const labelCls = "truncate opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100";

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isNavActive(pathname, item.href);
    const locked = !!item.premium && !isPremium;
    return (
      <Link
        key={item.href}
        href={item.href}
        title={item.label}
        aria-current={active ? "page" : undefined}
        className={itemClass(active)}
      >
        <Icon size={18} className={cn("shrink-0", active && "text-primary")} />
        <span className={cn("flex items-center gap-1.5", labelCls)}>
          {item.label}
          {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
        </span>
        {active && (
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" />
        )}
      </Link>
    );
  };

  return (
    <aside className="group hidden md:flex flex-col fixed left-0 top-16 bottom-0 w-[68px] hover:w-60 focus-within:w-60 overflow-hidden border-r border-border bg-background z-40 transition-[width] duration-200 ease-out hover:shadow-2xl focus-within:shadow-2xl">
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 scrollbar-thin">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label ?? "home"} className={cn(gi > 0 && "mt-4")}>
            {group.label && (
              <p className={cn("px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/60 whitespace-nowrap", labelCls)}>
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">{group.items.map(renderItem)}</div>
          </div>
        ))}
      </nav>

      {/* Account block */}
      <div className="space-y-0.5 border-t border-border p-3">
        <Link href="/premium" title="Premium" aria-current={isNavActive(pathname, "/premium") ? "page" : undefined} className={itemClass(isNavActive(pathname, "/premium"))}>
          <Crown size={18} className="shrink-0 text-gold-500" />
          {isPremium ? (
            <span className={cn("flex items-center gap-1.5", labelCls)}>
              Premium
              <span className="rounded bg-gold-500 px-1 py-px text-[9px] font-extrabold uppercase tracking-wider text-gold-950">ON</span>
            </span>
          ) : (
            <span className={cn("font-bold text-gold-700 dark:text-gold-400", labelCls)}>Premium</span>
          )}
        </Link>
        <Link href="/profile" title="Hồ sơ" aria-current={isNavActive(pathname, "/profile") ? "page" : undefined} className={itemClass(isNavActive(pathname, "/profile"))}>
          <User size={18} className="shrink-0" />
          <span className={labelCls}>Hồ sơ</span>
        </Link>
        {isAdmin && (
          <Link href="/admin" title="Admin" aria-current={isNavActive(pathname, "/admin") ? "page" : undefined} className={itemClass(isNavActive(pathname, "/admin"))}>
            <Shield size={18} className="shrink-0" />
            <span className={labelCls}>Admin</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
