"use client";

/**
 * TeacherTabs — the teacher portal's own top menu, separating class management
 * from assignment creation so "Giao bài" is its own destination (not a button
 * mixed into the class list).
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/teacher", label: "Lớp học", icon: GraduationCap, exact: true },
  { href: "/teacher/assignments/new", label: "Giao bài", icon: Send, exact: false },
];

export function TeacherTabs() {
  const pathname = usePathname();
  return (
    <nav className="mx-auto flex max-w-5xl gap-1 px-4">
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
