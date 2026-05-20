import Link from "next/link";
import { BookOpen, GraduationCap, type LucideIcon } from "lucide-react";
import { TestBank } from "@prisma/client";
import { cn } from "@/lib/utils";

/** Tabs to switch between PRACTICE / MOCK banks on an admin listing page. */
export function BankTabs({
  current,
  practiceCount,
  mockCount,
  base,
}: {
  current: TestBank;
  practiceCount: number;
  mockCount: number;
  base: string;
}) {
  const tabs: { value: TestBank; label: string; count: number; icon: LucideIcon; query: string }[] = [
    { value: "PRACTICE", label: "Luyện tập", count: practiceCount, icon: BookOpen, query: "practice" },
    { value: "MOCK", label: "Đề thi thử", count: mockCount, icon: GraduationCap, query: "mock" },
  ];
  return (
    <div className="inline-flex rounded-2xl border bg-card p-1">
      {tabs.map((t) => {
        const Icon = t.icon;
        const active = current === t.value;
        return (
          <Link
            key={t.value}
            href={`${base}?bank=${t.query}`}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
              active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Icon className="h-4 w-4" />
            {t.label}
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", active ? "bg-white/20" : "bg-muted")}>
              {t.count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function resolveBankParam(raw: string | string[] | undefined): TestBank {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === "mock" ? "MOCK" : "PRACTICE";
}
