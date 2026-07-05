"use client";

/**
 * WelcomePicker — the one-time "Bạn là ai?" screen. Three big tappable cards;
 * choosing one sets the role via POST /api/onboarding/role and redirects to
 * that persona's home. Deliberately minimal — a single decision, no form.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GraduationCap, Loader2, Users, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "LEARNER" | "PARENT" | "TEACHER";

const OPTIONS: {
  role: Role;
  title: string;
  desc: string;
  Icon: typeof BookOpen;
  home: string;
}[] = [
  {
    role: "LEARNER",
    title: "Học sinh",
    desc: "Học từ vựng, luyện 4 kỹ năng và làm bài tập thầy cô giao.",
    Icon: BookOpen,
    home: "/dashboard",
  },
  {
    role: "TEACHER",
    title: "Giáo viên",
    desc: "Tạo lớp, giao bài (PDF + nghe + đáp án) và theo dõi kết quả.",
    Icon: GraduationCap,
    home: "/teacher",
  },
  {
    role: "PARENT",
    title: "Phụ huynh",
    desc: "Theo dõi tiến độ, điểm số và cảnh báo của con.",
    Icon: Users,
    home: "/parent",
  },
];

export function WelcomePicker({ name }: { name: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Role | null>(null);

  const choose = async (role: Role, home: string) => {
    if (busy) return;
    setBusy(role);
    try {
      const res = await fetch("/api/onboarding/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Không lưu được lựa chọn");
      }
      router.push(home);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold">
          Chào{name ? ` ${name}` : ""}! 👋
        </h1>
        <p className="mt-2 text-muted-foreground">Bạn dùng Bee IELTS với vai trò nào?</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {OPTIONS.map(({ role, title, desc, Icon, home }) => {
          const loading = busy === role;
          return (
            <button
              key={role}
              type="button"
              disabled={!!busy}
              onClick={() => choose(role, home)}
              className={cn(
                "group flex flex-col items-center gap-3 rounded-2xl border-2 bg-card p-6 text-center transition-all",
                "hover:border-primary hover:shadow-lg disabled:opacity-60",
                loading ? "border-primary" : "border-border",
              )}
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Icon className="h-7 w-7" />}
              </span>
              <span className="text-lg font-bold">{title}</span>
              <span className="text-sm text-muted-foreground">{desc}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Cần đổi vai trò sau này? Nhắn cho đội ngũ Bee để được hỗ trợ.
      </p>
    </div>
  );
}
