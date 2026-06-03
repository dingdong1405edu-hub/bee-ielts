"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Sparkles, BookOpenText, BookOpen, Headphones, PenLine, Mic,
  GraduationCap, Shield, LogOut, User, Users, Menu, X, Layers, TrendingUp,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/vocab", label: "Vocab", icon: Sparkles },
  { href: "/grammar", label: "Grammar", icon: BookOpenText },
  { href: "/reading", label: "Reading", icon: BookOpen },
  { href: "/listening", label: "Listening", icon: Headphones },
  { href: "/writing", label: "Writing", icon: PenLine },
  { href: "/speaking", label: "Speaking", icon: Mic },
  { href: "/words", label: "Học từ", icon: Layers },
  { href: "/band-climber", label: "Vượt band", icon: TrendingUp },
  { href: "/mock", label: "Thi thử", icon: GraduationCap },
  { href: "/community", label: "Cộng đồng", icon: Users },
  { href: "/profile", label: "Hồ sơ", icon: User },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

// Pages where the learner has navigated INTO a specific lesson/test/stage —
// here we hide the chrome by default so they can focus on the exercise.
// Top-level list pages (e.g. /vocab, /reading) stay expanded.
const LEARN_ROOTS = new Set([
  "band-climber",
  "vocab",
  "grammar",
  "reading",
  "listening",
  "writing",
  "speaking",
  "words",
  "mock",
]);
function isDeepLearnRoute(pathname: string): boolean {
  const segs = pathname.split("/").filter(Boolean);
  if (segs.length < 2) return false;
  return LEARN_ROOTS.has(segs[0]);
}

const PIN_STORAGE_KEY = "bee-sidebar-pinned-v1";

export function Sidebar({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  // On the Community page the feed is white — make the sidebar white too so
  // the left panel blends with the page instead of staying dark.
  const community = pathname === "/community" || pathname.startsWith("/community/");

  const autoCollapse = useMemo(() => isDeepLearnRoute(pathname), [pathname]);

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
  // When the rail is hovered, the panel floats out on top of content without
  // pushing the page — feels snappier than a layout reflow on every hover.
  const showFullPanel = !isRail || hovered;

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
        ) : (
          !isRail && (
            // Anchored-expanded mode: button collapses to rail.
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
          )
        )}
      </div>
      <nav className="flex-1 space-y-1">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={linkClass(active, collapsed)}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn("h-5 w-5 shrink-0", active && "text-primary")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
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

  return (
    <aside
      onMouseEnter={() => isRail && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "hidden md:flex md:flex-col md:h-screen md:sticky md:top-0 relative transition-[width] duration-300 ease-out",
        // Layout-occupying width: thin rail when collapsed, full when expanded
        isRail ? "md:w-16" : "md:w-64",
        community && !showFullPanel && "bg-white border-r border-zinc-200",
      )}
    >
      {/* When the rail is collapsed and NOT hovered, render the thin icon
          column directly. */}
      {isRail && !hovered && (
        <div className="flex flex-col h-full w-16 p-2">{renderNav(true)}</div>
      )}

      {/* Expanded panel — either anchored (pinned open / shallow route) or
          floating overlay (rail + hover). Same JSX, only positioning differs
          so we have one source of truth for nav state. */}
      {showFullPanel && (
        <div
          className={cn(
            "flex flex-col p-4 w-64",
            isRail
              ? // Floating overlay over the rail + content. The slide-in
                // animation makes the "kéo sang bên phải trở lại" feel the
                // user asked for instead of an instant pop.
                "absolute left-0 top-0 h-screen z-40 bg-card shadow-2xl border-r border-border animate-in slide-in-from-left-2 fade-in-0 duration-200"
              : // Anchored — takes the full sticky aside
                "h-full",
            community && "bg-white border-zinc-200",
          )}
        >
          {renderNav(false)}
          {isRail && (
            // Floating overlay's pin-open button — committing pin keeps the
            // panel from disappearing on mouseleave.
            <button
              type="button"
              onClick={() => setPinnedPersistent(true)}
              aria-label="Ghim mở thanh bên"
              title="Ghim mở thanh bên"
              className={cn(
                "absolute top-4 right-2 grid h-8 w-8 place-items-center rounded-lg transition-colors",
                community
                  ? "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                  : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
              )}
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
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
