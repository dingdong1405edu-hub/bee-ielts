"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface Ctx {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<Ctx>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
  toggle: () => {},
});

function applyTheme(t: Theme): "light" | "dark" {
  const root = document.documentElement;
  const resolved =
    t === "dark" ||
    (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
      ? "dark"
      : "light";
  if (resolved === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  return resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    const stored: Theme = raw === "dark" || raw === "light" || raw === "system" ? raw : "system";
    setThemeState(stored);
    setResolvedTheme(applyTheme(stored));
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setResolvedTheme(applyTheme("system"));
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem("theme", t);
    setThemeState(t);
    setResolvedTheme(applyTheme(t));
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
