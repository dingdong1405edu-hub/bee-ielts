"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sparkles, BookOpenText, BookOpen, Headphones, PenLine, Mic, GraduationCap, Shield, LogOut, User } from "lucide-react";
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
  { href: "/mock", label: "Thi thử", icon: GraduationCap },
];

export function Sidebar({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:p-4 md:h-screen md:sticky md:top-0">
      <Link href="/dashboard" className="flex items-center gap-2 px-3 py-3 mb-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl gradient-brand text-white font-bold shadow-md shadow-primary/20">🐝</div>
        <span className="font-extrabold tracking-tight">Bee IELTS</span>
      </Link>
      <nav className="flex-1 space-y-1">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
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
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
            pathname.startsWith("/profile")
              ? "bg-card text-foreground shadow-sm border"
              : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
          )}
        >
          <User className={cn("h-5 w-5", pathname.startsWith("/profile") && "text-primary")} />
          Hồ sơ
        </Link>
        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
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
        className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-card/60 hover:text-foreground"
      >
        <LogOut className="h-5 w-5" />
        Đăng xuất
      </button>
    </aside>
  );
}

export function MobileNav({ isAdmin: _isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const items = nav.slice(0, 5);
  return (
    <nav className="md:hidden fixed bottom-3 inset-x-3 z-40 rounded-2xl border bg-card/95 backdrop-blur shadow-lg">
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
