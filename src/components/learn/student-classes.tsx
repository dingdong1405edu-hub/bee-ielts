"use client";

/**
 * StudentClasses — a learner joins a class by code and sees the assignments
 * they've been given. Undone assignments float to the top; done ones show the
 * band and a "Xem lại" link. Minimal: one join input + a status list.
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, BookOpen, CheckCircle2, Clock, Loader2, LogIn } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface StudentAssignment {
  id: string;
  title: string;
  className: string;
  deadline: string | null;
  status: "NOT_STARTED" | "PENDING" | "SUBMITTED" | "GRADED";
  band: number | null;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "Không hạn";
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const isDone = (s: StudentAssignment["status"]) => s === "SUBMITTED" || s === "GRADED";

export function StudentClasses({
  assignments,
  classCount,
}: {
  assignments: StudentAssignment[];
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
      toast.success(`Đã vào lớp "${data.class.name}"`);
      setCode("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi khi vào lớp");
    } finally {
      setJoining(false);
    }
  };

  // Undone first, then by soonest deadline.
  const sorted = [...assignments].sort((a, b) => {
    const da = isDone(a.status) ? 1 : 0;
    const db = isDone(b.status) ? 1 : 0;
    if (da !== db) return da - db;
    const ta = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const tb = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    return ta - tb;
  });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Lớp học của tôi</h1>
        <p className="text-sm text-muted-foreground">
          Nhập mã lớp thầy cô cung cấp để nhận bài tập.
        </p>
      </header>

      {/* Join by code */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex-1 min-w-[180px] space-y-1.5">
            <label htmlFor="code" className="text-sm font-medium">
              Mã vào lớp
            </label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && join()}
              placeholder="VD: 7KQ4MP"
              className="font-mono tracking-widest"
              maxLength={12}
            />
          </div>
          <Button onClick={join} disabled={joining} className="rounded-lg">
            {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Vào lớp
          </Button>
        </CardContent>
      </Card>

      {/* Assignments */}
      {sorted.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            <BookOpen className="mx-auto mb-2 h-8 w-8" />
            {classCount === 0
              ? "Bạn chưa vào lớp nào. Nhập mã lớp ở trên để bắt đầu."
              : "Chưa có bài tập nào được giao."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((a) => {
            const done = isDone(a.status);
            return (
              <Card key={a.id} className={cn(done && "bg-muted/30")}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div
                    className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
                      done ? "bg-success/15 text-success" : "bg-primary/10 text-primary",
                    )}
                  >
                    {done ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{a.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.className} · Hạn: {fmtDate(a.deadline)}
                    </p>
                  </div>
                  {done ? (
                    <div className="flex shrink-0 items-center gap-2">
                      {a.band !== null && <Badge variant="success">Band {a.band.toFixed(1)}</Badge>}
                      <Button asChild variant="outline" size="sm" className="rounded-lg">
                        <Link href={`/exam/${a.id}`}>Xem lại</Link>
                      </Button>
                    </div>
                  ) : (
                    <Button asChild variant="brand" size="sm" className="shrink-0 rounded-lg">
                      <Link href={`/exam/${a.id}`}>
                        Làm bài <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
