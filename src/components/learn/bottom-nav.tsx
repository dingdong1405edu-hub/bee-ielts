"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Target, GraduationCap, Users, User, LayoutGrid, X, Crown, Shield, Lock, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { SHEET_GROUPS, isNavActive, type NavItem } from "./nav-config";

const TABS: NavItem[] = [
  { href: "/dashboard", label: "Mục tiêu", icon: Target },
  { href: "/mock", label: "Thi thử", icon: GraduationCap },
  // centre slot = "Kỹ năng" sheet (rendered separately)
  { href: "/community", label: "Cộng đồng", icon: Users },
  { href: "/profile", label: "Hồ sơ", icon: User },
];

/**
 * Mobile navigation (<md): a native-style fixed BOTTOM TAB BAR with 4 primary
 * destinations + a raised centre "Kỹ năng" button that opens a slide-up sheet
 * listing every skill/section (grouped, icon grid). Safe-area aware, full-cell
 * touch targets, modal sheet with Escape + focus handling. Replaces the old
 * hamburger drawer.
 */
export function BottomNav({ isAdmin, isPremium }: { isAdmin?: boolean; isPremium?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]); // close sheet on navigate

  // While open: lock background scroll, close on Escape, move focus into the
  // sheet, and return focus to the trigger on close.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      triggerRef.current?.focus();
    };
  }, [open]);

  const skillActive = SHEET_GROUPS.some((g) => g.items.some((i) => isNavActive(pathname, i.href)));

  const BarTab = ({ item }: { item: NavItem }) => {
    const active = isNavActive(pathname, item.href);
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors",
          active ? "text-primary" : "text-muted-foreground",
        )}
      >
        <Icon className="h-[22px] w-[22px]" />
        <span className="leading-none">{item.label}</span>
      </Link>
    );
  };

  const SheetTile = ({ item }: { item: NavItem }) => {
    const active = isNavActive(pathname, item.href);
    const locked = !!item.premium && !isPremium;
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        onClick={() => setOpen(false)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-colors",
          active ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted active:bg-muted",
        )}
      >
        <span className={cn("grid h-11 w-11 place-items-center rounded-xl", active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="flex items-center gap-1 text-xs font-semibold leading-tight">
          {item.label}
          {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
        </span>
      </Link>
    );
  };

  return (
    <>
      {/* ===== Bottom tab bar ===== */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md">
        <div className="grid grid-cols-5 items-center h-16 px-1 overflow-visible">
          <BarTab item={TABS[0]} />
          <BarTab item={TABS[1]} />
          {/* Centre: skills sheet trigger (raised FAB) */}
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Kỹ năng"
            aria-haspopup="dialog"
            aria-expanded={open}
            className="flex h-full w-full flex-col items-center justify-center gap-0.5"
          >
            <span className="-mt-7 grid h-14 w-14 place-items-center rounded-full gradient-brand text-white shadow-lg shadow-primary/30 ring-4 ring-background transition-transform active:scale-95">
              <LayoutGrid className="h-6 w-6" />
            </span>
            <span className={cn("-mt-1 text-[11px] font-semibold leading-none", skillActive ? "text-primary" : "text-muted-foreground")}>Kỹ năng</span>
          </button>
          <BarTab item={TABS[2]} />
          <BarTab item={TABS[3]} />
        </div>
        {/* iOS home-indicator filler */}
        <div className="h-[env(safe-area-inset-bottom)] bg-background/95" />
      </nav>

      {/* ===== Slide-up skills sheet ===== */}
      <div className={cn("md:hidden fixed inset-0 z-50", open ? "" : "pointer-events-none")} aria-hidden={!open}>
        <div
          className={cn("absolute inset-0 bg-black/45 transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
          onClick={() => setOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="skills-sheet-title"
          className={cn(
            "absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-3xl bg-background shadow-2xl transition-transform duration-300 ease-out",
            open ? "translate-y-0" : "translate-y-full",
          )}
        >
          {/* grab handle + header */}
          <div className="shrink-0 px-5 pt-2.5">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" />
            <div className="flex items-center justify-between pb-3">
              <span id="skills-sheet-title" className="text-lg font-extrabold tracking-tight">Khám phá</span>
              <button ref={closeRef} onClick={() => setOpen(false)} aria-label="Đóng" className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground active:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* groups */}
          <div className="overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)_+_20px)]">
            {SHEET_GROUPS.map((group) => (
              <div key={group.label} className="mb-5">
                <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{group.label}</p>
                <div className="grid grid-cols-3 gap-2.5">
                  {group.items.map((item) => (
                    <SheetTile key={item.href} item={item} />
                  ))}
                </div>
              </div>
            ))}

            <div className="mb-2">
              <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Tài khoản</p>
              <div className="grid grid-cols-3 gap-2.5">
                <SheetTile item={{ href: "/premium", label: "Premium", icon: Crown }} />
                {isAdmin && <SheetTile item={{ href: "/admin", label: "Admin", icon: Shield }} />}
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 text-center transition-colors active:bg-muted"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-muted text-destructive">
                    <LogOut className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold leading-tight">Đăng xuất</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
