"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Sparkles, BookOpenText, BookOpen, Headphones, PenLine, Mic,
  GraduationCap, Shield, LogOut, User, Users, Menu, X, Layers,
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
  { href: "/mock", label: "Thi thử", icon: GraduationCap },
  { href: "/community", label: "Cộng đồng", icon: Users },
  { href: "/profile", label: "Hồ sơ", icon: User },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  // On the Community page the feed is white — make the sidebar white too so
  // the left panel blends with the page instead of staying dark.
  const community = pathname === "/community" || pathname.startsWith("/community/");

  const linkClass = (active: boolean) =>
    cn(
      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
      active
        ? community
          ? "bg-zinc-100 text-zinc-900 shadow-sm border border-zinc-200"
          : "bg-card text-foreground shadow-sm border"
        : community
          ? "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
    );

  return (
    <aside
      className={cn(
        "hidden md:flex md:w-64 md:flex-col md:p-4 md:h-screen md:sticky md:top-0",
        community && "bg-white border-r border-zinc-200",
      )}
    >
      <Link href="/dashboard" className="flex items-center gap-2 px-3 py-3 mb-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl gradient-brand text-white font-bold shadow-md shadow-primary/20">🐝</div>
        <span className={cn("font-extrabold tracking-tight", community && "text-zinc-900")}>Bee IELTS</span>
      </Link>
      <nav className="flex-1 space-y-1">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} className={linkClass(active)}>
              <Icon className={cn("h-5 w-5", active && "text-primary")} />
              {item.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link href="/admin" className={linkClass(pathname.startsWith("/admin"))}>
            <Shield className="h-5 w-5" />
            Admin
          </Link>
        )}
      </nav>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className={cn(
          "mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold",
          community
            ? "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
        )}
      >
        <LogOut className="h-5 w-5" />
        Đăng xuất
      </button>
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
