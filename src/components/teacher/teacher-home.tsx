"use client";

/**
 * TeacherHome — the teacher's landing page. Create a class (gets a shareable
 * join code), see each class's join code + member/assignment counts, and jump
 * to "Giao bài". Minimal: one input to make a class, a copy-code button, and a
 * list. New classes are prepended without a reload.
 */
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BookOpen, Check, Copy, GraduationCap, Loader2, Plus, Send, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface TeacherClass {
  id: string;
  name: string;
  joinCode: string | null;
  memberCount: number;
  assignmentCount: number;
  assignments: { id: string; title: string; deadline: string | null; submissionCount: number }[];
}

function fmtDate(iso: string | null): string {
  if (!iso) return "Không hạn";
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Không sao chép được");
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/40 px-2.5 py-1 font-mono text-sm font-bold tracking-widest hover:bg-muted"
      title="Sao chép mã lớp"
    >
      {code}
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
    </button>
  );
}

export function TeacherHome({ initialClasses }: { initialClasses: TeacherClass[] }) {
  const [classes, setClasses] = useState(initialClasses);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const createClass = async () => {
    const n = name.trim();
    if (!n) return toast.error("Nhập tên lớp");
    setCreating(true);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tạo được lớp");
      setClasses((cs) => [
        {
          id: data.class.id,
          name: data.class.name,
          joinCode: data.class.joinCode,
          memberCount: 0,
          assignmentCount: 0,
          assignments: [],
        },
        ...cs,
      ]);
      setName("");
      toast.success("Đã tạo lớp!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi khi tạo lớp");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Lớp học của tôi</h1>
          <p className="text-sm text-muted-foreground">Tạo lớp, chia sẻ mã cho học sinh và giao bài.</p>
        </div>
        <Button asChild variant="brand" className="rounded-full">
          <Link href="/teacher/assignments/new">
            <Send className="h-4 w-4" /> Giao bài mới
          </Link>
        </Button>
      </header>

      {/* Create class */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <label htmlFor="clsname" className="text-sm font-medium">
              Tạo lớp mới
            </label>
            <Input
              id="clsname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createClass()}
              placeholder="VD: Lớp IELTS 6.5 — Thứ 3,5"
            />
          </div>
          <Button onClick={createClass} disabled={creating} className="rounded-lg">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Tạo lớp
          </Button>
        </CardContent>
      </Card>

      {/* Class list */}
      {classes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            <BookOpen className="mx-auto mb-2 h-8 w-8" />
            Chưa có lớp nào. Tạo lớp đầu tiên ở trên nhé!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {classes.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">{c.name}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-4 w-4" /> {c.memberCount} học sinh
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <GraduationCap className="h-4 w-4" /> {c.assignmentCount} bài
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Mã vào lớp</div>
                    {c.joinCode ? <CopyCode code={c.joinCode} /> : <span className="text-sm">—</span>}
                  </div>
                </div>

                {c.assignments.length > 0 && (
                  <ul className="mt-4 divide-y divide-border rounded-lg border">
                    {c.assignments.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                        <Link href={`/exam/${a.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                          {a.title}
                        </Link>
                        <span className="shrink-0 text-xs text-muted-foreground">Hạn: {fmtDate(a.deadline)}</span>
                        <Badge variant="secondary" className="shrink-0">
                          {a.submissionCount} nộp
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
