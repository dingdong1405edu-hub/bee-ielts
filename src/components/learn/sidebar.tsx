"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Sparkles, BookOpenText, BookOpen, Headphones, PenLine, Mic,
  GraduationCap, Shield, LogOut, User, Users, Menu, X, Layers, TrendingUp,
  PanelLeftClose, PanelLeftOpen, Crown, Lock,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  /** Premium-only — locked icon + tooltip for free users. */
  premium?: boolean;
};

const nav: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/vocab", label: "Vocab", icon: Sparkles },
  { href: "/grammar", label: "Grammar", icon: BookOpenText },
  { href: "/reading", label: "Reading", icon: BookOpen },
  { href: "/listening", label: "Listening", icon: Headphones },
  { href: "/writing", label: "Writing", icon: PenLine },
  { href: "/speaking", label: "Speaking", icon: Mic },
  { href: "/words", label: "Học từ", icon: Layers },
  { href: "/band-climber", label: "Vượt band", icon: TrendingUp, premium: true },
  { href: "/mock", label: "Thi thử", icon: GraduationCap },
  { href: "/community", label: "Cộng đồng", icon: Users },
  { href: "/profile", label: "Hồ sơ", icon: User },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

// Default behaviour: rail is COLLAPSED on every learn-layout page so the
// main content gets full width. Hover (or click → pin) brings the full
// nav back. Users who prefer a permanent sidebar pin it open and the
// preference persists via PIN_STORAGE_KEY.
//
// Was previously gated by isDeepLearnRoute() — only deep lesson pages
// collapsed, shallow pages like /dashboard kept the 256px sidebar open.
// That left the dashboard's right-hand cards (Lịch thi / Lịch học) sitting
// behind the sidebar at narrow widths; collapsing by default everywhere
// fixes the overlap without forcing per-page tweaks.
function shouldAutoCollapse(_pathname: string): boolean {
  return true;
}

// Bumped v1 → v2 when the auto-collapse default flipped to apply on every
// learn page (previously only deep routes). Old keys held `true` for users
// who had pinned-open under the old rule, which kept the sidebar full-width
// and masked the new default. Bumping invalidates those stale preferences
// so everyone lands on the collapsed rail on next load.
const PIN_STORAGE_KEY = "bee-sidebar-pinned-v2";

export function Sidebar({
  isAdmin,
  isPremium,
}: {
  isAdmin?: boolean;
  isPremium?: boolean;
}) {
  const pathname = usePathname();
  // On the Community page the feed is white — make the sidebar white too so
  // the left panel blends with the page instead of staying dark.
  const community = pathname === "/community" || pathname.startsWith("/community/");

  const autoCollapse = useMemo(() => shouldAutoCollapse(pathname), [pathname]);

  // Three-way state for sidebar visibility:
  //   null  → follow auto rule (deep learn route = rail, else = full)
  //   true  → user pinned open (always full)
  //   false → user pinned closed (always rail, hover overlays full)
  const [pinned, setPinned] = useState<boolean | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Hydrate the pin preference from localStorage after mount so SSR markup
  // matches the server-rendered HTML and avoids hydration mismatch warnings.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PIN_STORAGE_KEY);
      if (raw === "true") setPinned(true);
      else if (raw === "false") setPinned(false);
    } catch {
      // localStorage blocked → keep auto behavior
    }
    setHydrated(true);
  }, []);

  // Collapse the hover overlay when the route changes — clicking a link on
  // the floating panel should commit navigation AND close, not leave it open
  // on top of the new page.
  useEffect(() => {
    setHovered(false);
  }, [pathname]);

  function setPinnedPersistent(next: boolean) {
    setPinned(next);
    try {
      localStorage.setItem(PIN_STORAGE_KEY, String(next));
    } catch {
      /* ignore */
    }
    setHovered(false);
  }

  // Effective rail state. Before hydration, fall back to the auto rule so the
  // server-rendered HTML is stable.
  const isRail = !hydrated ? autoCollapse : pinned === null ? autoCollapse : !pinned;

  const linkClass = (active: boolean, collapsed: boolean) =>
    cn(
      "flex items-center rounded-xl text-sm font-semibold transition-all",
      collapsed ? "justify-center px-0 py-2.5 mx-auto w-11" : "gap-3 px-3 py-2.5",
      active
        ? community
          ? "bg-zinc-100 text-zinc-900 shadow-sm border border-zinc-200"
          : "bg-card text-foreground shadow-sm border"
        : community
          ? "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
    );

  // Reusable nav content — rendered into either the rail itself or the
  // floating overlay so both share the exact same list.
  const renderNav = (collapsed: boolean) => (
    <>
      <div
        className={cn(
          "flex items-center gap-1 mb-1",
          collapsed ? "flex-col px-0 py-2" : "justify-between px-1 py-3",
        )}
      >
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2 min-w-0",
            collapsed && "justify-center",
          )}
          title="Bee IELTS"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl gradient-brand text-white font-bold shadow-md shadow-primary/20">🐝</div>
          {!collapsed && (
            <span className={cn("font-extrabold tracking-tight truncate", community && "text-zinc-900")}>
              Bee IELTS
            </span>
          )}
        </Link>
        {collapsed ? (
          // Rail mode: small expand-pin button under the logo so users have
          // a discoverable click target in addition to hover.
          <button
            type="button"
            onClick={() => setPinnedPersistent(true)}
            aria-label="Mở rộng thanh bên"
            title="Mở rộng thanh bên"
            className={cn(
              "mt-1 grid h-7 w-7 place-items-center rounded-lg transition-colors",
              community
                ? "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
            )}
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        ) : isRail ? (
          // Hover-expanded mode (panel is open but not pinned): show a pin
          // button so the user can lock it open without having to keep the
          // cursor parked over the sidebar.
          <button
            type="button"
            onClick={() => setPinnedPersistent(true)}
            aria-label="Ghim mở thanh bên"
            title="Ghim mở thanh bên"
            className={cn(
              "shrink-0 grid h-8 w-8 place-items-center rounded-lg transition-colors",
              community
                ? "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
            )}
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        ) : (
          // Anchored-expanded mode (pinned open): button collapses to rail.
          <button
            type="button"
            onClick={() => setPinnedPersistent(false)}
            aria-label="Thu gọn thanh bên"
            title="Thu gọn thanh bên"
            className={cn(
              "shrink-0 grid h-8 w-8 place-items-center rounded-lg transition-colors",
              community
                ? "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
            )}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-1">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          // Premium-gated link gets a lock icon for free users so the
          // restriction is visible up front. We still let them click —
          // the layout gate redirects to /premium with a useful CTA.
          const locked = !!item.premium && !isPremium;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={linkClass(active, collapsed)}
              title={
                collapsed
                  ? locked
                    ? `${item.label} (Premium)`
                    : item.label
                  : undefined
              }
            >
              <Icon className={cn("h-5 w-5 shrink-0", active && "text-primary")} />
              {!collapsed && (
                <span className="flex items-center gap-1.5">
                  {item.label}
                  {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                </span>
              )}
            </Link>
          );
        })}
        {!isPremium && (
          <Link
            href="/premium"
            className={linkClass(pathname.startsWith("/premium"), collapsed)}
            title={collapsed ? "Premium" : undefined}
          >
            <Crown className="h-5 w-5 shrink-0 text-amber-500" />
            {!collapsed && <span className="text-amber-600 dark:text-amber-400">Premium</span>}
          </Link>
        )}
        {isPremium && (
          <Link
            href="/premium"
            className={linkClass(pathname.startsWith("/premium"), collapsed)}
            title={collapsed ? "Premium" : undefined}
          >
            <Crown className="h-5 w-5 shrink-0 text-amber-500" />
            {!collapsed && (
              <span className="flex items-center gap-1.5">
                Premium
                <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-500 text-white rounded px-1 py-px">
                  ON
                </span>
              </span>
            )}
          </Link>
        )}
        {isAdmin && (
          <Link
            href="/admin"
            className={linkClass(pathname.startsWith("/admin"), collapsed)}
            title={collapsed ? "Admin" : undefined}
          >
            <Shield className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Admin</span>}
          </Link>
        )}
      </nav>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        title={collapsed ? "Đăng xuất" : undefined}
        className={cn(
          "mt-2 flex items-center rounded-xl text-sm font-semibold",
          collapsed ? "justify-center px-0 py-2.5 mx-auto w-11" : "gap-3 px-3 py-2.5",
          community
            ? "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
        )}
      >
        <LogOut className="h-5 w-5 shrink-0" />
        {!collapsed && <span>Đăng xuất</span>}
      </button>
    </>
  );

  // Effective COLLAPSED state for what the user actually sees right now —
  // combines isRail (the "anchored" rail decision) with hover. Hover bumps
  // us out of collapsed so the aside grows in-flow and pushes the main
  // content right, instead of overlaying on top of it.
  const collapsedNow = isRail && !hovered;

  return (
    <aside
      onMouseEnter={() => isRail && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "hidden md:flex md:flex-col md:h-screen md:sticky md:top-0 transition-[width] duration-300 ease-out overflow-hidden",
        // Single source of truth for width — grows from rail to full panel
        // on hover so the main column reflows instead of being covered by
        // an overlay. This is the "từ từ kéo sang bên phải trở lại như
        // ban đầu" behaviour the user asked for.
        collapsedNow ? "md:w-16" : "md:w-64",
        community && "bg-white border-r border-zinc-200",
      )}
    >
      <div
        className={cn(
          "flex flex-col h-full",
          collapsedNow ? "w-16 p-2" : "w-64 p-4",
        )}
      >
        {renderNav(collapsedNow)}
      </div>
    </aside>
  );
}

/** Mobile hamburger menu — button in the header + slide-in drawer. */
export function MobileMenu({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Mở menu"
        className="md:hidden grid h-9 w-9 place-items-center rounded-xl border bg-card text-foreground"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay + drawer */}
      <div
        className={cn(
          "md:hidden fixed inset-0 z-[60] transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
        <aside
          className={cn(
            "absolute left-0 top-0 h-full w-72 max-w-[82vw] bg-background shadow-xl flex flex-col transition-transform duration-200",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between px-4 py-4 border-b">
            <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl gradient-brand text-white font-bold">🐝</div>
              <span className="font-extrabold tracking-tight">Bee IELTS</span>
            </Link>
            <button
              onClick={() => setOpen(false)}
              aria-label="Đóng menu"
              className="grid h-9 w-9 place-items-center rounded-xl border text-muted-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all",
                    active
                      ? "bg-card text-foreground shadow-sm border"
                      : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
                  )}
                >
                  <Icon className={cn("h-5 w-5", active && "text-primary")} />
                  {item.label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all",
                  pathname.startsWith("/admin")
                    ? "bg-card text-foreground shadow-sm border"
                    : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
                )}
              >
                <Shield className="h-5 w-5" />
                Admin
              </Link>
            )}
          </nav>

          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="m-3 flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
            Đăng xuất
          </button>
        </aside>
      </div>
    </>
  );
}
