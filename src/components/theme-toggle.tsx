"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className={cn(
        "relative grid h-9 w-9 place-items-center rounded-xl border bg-card transition-all hover:scale-105 hover:border-primary/40",
        className,
      )}
    >
      {mounted && (
        <>
          <Sun className={cn("h-4 w-4 absolute transition-all", resolvedTheme === "dark" ? "scale-0 rotate-90" : "scale-100 rotate-0 text-amber-500")} />
          <Moon className={cn("h-4 w-4 absolute transition-all", resolvedTheme === "dark" ? "scale-100 rotate-0 text-honey" : "scale-0 -rotate-90")} />
        </>
      )}
    </button>
  );
}
