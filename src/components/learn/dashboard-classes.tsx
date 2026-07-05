"use client";

/**
 * DashboardClasses — the featured "Lớp học / Bài tập" block on the home screen.
 * A honey-gradient header with a join-by-code box, then the student's newest
 * assignments (undone first) or a friendly empty state. Deliberately eye-
 * catching so classes stand out on the dashboard. Full list lives at /classes.
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, BookOpen, CheckCircle2, ClipboardList, Clock, GraduationCap, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface DashAssignment {
  id: string;
  title: string;
  className: string;
  deadline: string | null;
  status: "NOT_STARTED" | "PENDING" | "SUBMITTED" | "GRADED";
  band: number | null;
}

const isDone = (s: DashAssignment["status"]) => s === "SUBMITTED" || s === "GRADED";

function fmtDate(iso: string | null): string {
  if (!iso) return "Không hạn";
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export function DashboardClasses({
  assignments,
  classCount,
}: {
  assignments: DashAssignment[];
  classCount: number;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  const join = async () => {
    const c = code.trim();
    if (!c) return toast.error("Nhập mã lớp");
    setJoining(true);
    try {
      const res = await fetch("/api/classes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không vào được lớp");
      if (data.pending) {
        toast.success(`Đã gửi yêu cầu vào lớp "${data.class.name}" — chờ giáo viên duyệt.`);
      } else {
        toast.success(`Đã vào lớp "${data.class.name}"`);
      }
      setCode("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi khi vào lớp");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
      {/* Gradient header + join box */}
      <div className="relative gradient-brand p-5 text-white md:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_12%,rgba(255,255,255,0.22),transparent_50%)]" />
        <div className="relative flex flex-wrap items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 backdrop-blur border border-white/20">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-extrabold tracking-tight md:text-2xl">Lớp học của tôi</h2>
            <p className="text-sm text-white/90">Nhập mã để vào lớp và nhận bài tập từ thầy cô.</p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && join()}
              placeholder="Mã lớp"
              maxLength={12}
              className="h-10 w-full border-white/30 bg-white/95 font-mono tracking-widest text-ink placeholder:text-ink/40 sm:w-36"
            />
            <Button
              onClick={join}
              disabled={joining}
              className="h-10 shrink-0 rounded-lg bg-white text-primary hover:bg-white/90"
            >
              {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Vào lớp
            </Button>
          </div>
        </div>
      </div>

      {/* Bài tập */}
      <div className="p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <ClipboardList className="h-4 w-4 text-honey-deep" /> Bài tập được giao
          </h3>
          <Link href="/classes" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Xem tất cả <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {assignments.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-8 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              {classCount === 0 ? "Bạn chưa vào lớp nào — nhập mã lớp ở trên nhé!" : "Bạn chưa có bài tập nào!"}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {assignments.map((a) => {
              const done = isDone(a.status);
              return (
                <li key={a.id}>
                  <Link
                    href={`/exam/${a.id}`}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-accent",
                      done && "bg-muted/30",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                        done ? "bg-success/15 text-success" : "bg-primary/10 text-primary",
                      )}
                    >
                      {done ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{a.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {a.className} · Hạn: {fmtDate(a.deadline)}
                      </span>
                    </span>
                    {done && a.band !== null ? (
                      <Badge variant="success" className="shrink-0">
                        Band {a.band.toFixed(1)}
                      </Badge>
                    ) : (
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
