"use client";

/**
 * RoleSwitcher — lets a user change their persona (Học sinh / Giáo viên / Phụ
 * huynh) any time from their profile. Reuses POST /api/onboarding/role, then
 * sends them to that persona's home.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookOpen, GraduationCap, Loader2, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { playPopSfx } from "@/lib/quiz-sfx";

type Role = "LEARNER" | "TEACHER" | "PARENT";

const OPTS: { role: Role; label: string; Icon: typeof BookOpen; home: string }[] = [
  { role: "LEARNER", label: "Học sinh", Icon: BookOpen, home: "/dashboard" },
  { role: "TEACHER", label: "Giáo viên", Icon: GraduationCap, home: "/teacher" },
  { role: "PARENT", label: "Phụ huynh", Icon: Users, home: "/parent" },
];

export function RoleSwitcher({ current }: { current: string }) {
  const router = useRouter();
  const [role, setRole] = useState<string>(current);
  const [busy, setBusy] = useState<Role | null>(null);

  const change = async (r: Role, home: string) => {
    if (r === role || busy) return;
    setBusy(r);
    try {
      const res = await fetch("/api/onboarding/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: r }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không đổi được vai trò");
      setRole(r);
      playPopSfx();
      toast.success("Đã đổi vai trò!");
      router.push(home);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-base font-bold">Vai trò</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Bạn có thể đổi vai trò bất cứ lúc nào.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {OPTS.map(({ role: r, label, Icon, home }) => {
            const active = role === r;
            const loading = busy === r;
            return (
              <button
                key={r}
                type="button"
                disabled={!!busy}
                onClick={() => change(r, home)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-sm font-semibold transition-all disabled:opacity-60",
                  active ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent",
                )}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
                {label}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
