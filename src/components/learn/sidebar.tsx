"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sparkles, BookOpenText, BookOpen, Headphones, PenLine, Mic, Shield, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/vocab", label: "Vocabulary", icon: Sparkles },
  { href: "/grammar", label: "Grammar", icon: BookOpenText },
  { href: "/reading", label: "Reading", icon: BookOpen },
  { href: "/listening", label: "Listening", icon: Headphones },
  { href: "/writing", label: "Writing", icon: PenLine },
  { href: "/speaking", label: "Speaking", icon: Mic },
];

export function Sidebar({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:bg-card md:p-4 md:h-screen md:sticky md:top-0">
      <Link href="/dashboard" className="flex items-center gap-2 px-2 py-2 mb-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">🐝</div>
        <span className="font-bold">Bee IELTS</span>
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
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname.startsWith("/admin")
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Shield className="h-4 w-4" />
            Admin
          </Link>
        )}
      </nav>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
        Đăng xuất
      </button>
    </aside>
  );
}

export function MobileNav({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const items = nav.slice(0, 5);
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-card">
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
      {isAdmin && null}
    </nav>
  );
}
