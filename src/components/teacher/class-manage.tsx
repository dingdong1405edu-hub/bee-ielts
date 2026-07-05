"use client";

/**
 * ClassManage — the expandable management panel inside a teacher's class card.
 *   - Toggle "riêng tư" (private): new students must be approved.
 *   - Approve / reject pending join requests (private classes).
 *   - Kick a student out of the class.
 * All actions hit the class APIs and update local state optimistically-ish
 * (on success). Kept self-contained so TeacherHome stays a thin list.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Lock, LockOpen, UserMinus, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface Person {
  id: string;
  name: string;
  email: string;
}

export function ClassManage({
  classId,
  initialPrivate,
  initialMembers,
  initialRequests,
}: {
  classId: string;
  initialPrivate: boolean;
  initialMembers: Person[];
  initialRequests: Person[];
}) {
  const [isPrivate, setIsPrivate] = useState(initialPrivate);
  const [members, setMembers] = useState(initialMembers);
  const [requests, setRequests] = useState(initialRequests);
  const [busy, setBusy] = useState<string | null>(null); // key of the row being acted on

  const togglePrivate = async () => {
    const next = !isPrivate;
    setBusy("privacy");
    try {
      const res = await fetch(`/api/classes/${classId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrivate: next }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Lỗi");
      setIsPrivate(next);
      toast.success(next ? "Đã bật lớp riêng tư — học sinh cần được duyệt." : "Đã chuyển lớp công khai.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không đổi được chế độ lớp");
    } finally {
      setBusy(null);
    }
  };

  const decide = async (student: Person, action: "approve" | "reject") => {
    setBusy(`req-${student.id}`);
    try {
      const res = await fetch(`/api/classes/${classId}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id, action }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Lỗi");
      setRequests((rs) => rs.filter((r) => r.id !== student.id));
      if (action === "approve") {
        setMembers((ms) => [...ms, student]);
        toast.success(`Đã duyệt ${student.name}`);
      } else {
        toast.success(`Đã từ chối ${student.name}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Thao tác thất bại");
    } finally {
      setBusy(null);
    }
  };

  const kick = async (student: Person) => {
    if (!confirm(`Xoá ${student.name} khỏi lớp?`)) return;
    setBusy(`mem-${student.id}`);
    try {
      const res = await fetch(`/api/classes/${classId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Lỗi");
      setMembers((ms) => ms.filter((m) => m.id !== student.id));
      toast.success(`Đã xoá ${student.name} khỏi lớp`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không xoá được");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-4 space-y-4 border-t pt-4">
      {/* Privacy toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          {isPrivate ? <Lock className="h-4 w-4 text-honey-deep" /> : <LockOpen className="h-4 w-4 text-muted-foreground" />}
          <span className="font-medium">{isPrivate ? "Lớp riêng tư" : "Lớp công khai"}</span>
          <span className="text-xs text-muted-foreground">
            {isPrivate ? "học sinh cần được duyệt" : "có mã là vào được ngay"}
          </span>
        </div>
        <Button variant="outline" size="sm" className="rounded-lg" disabled={busy === "privacy"} onClick={togglePrivate}>
          {busy === "privacy" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPrivate ? (
            <LockOpen className="h-4 w-4" />
          ) : (
            <Lock className="h-4 w-4" />
          )}
          {isPrivate ? "Chuyển công khai" : "Bật riêng tư"}
        </Button>
      </div>

      {/* Pending requests */}
      {requests.length > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <UserPlus className="h-3.5 w-3.5" /> Yêu cầu vào lớp ({requests.length})
          </p>
          {requests.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-lg border bg-honey-tint/40 p-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.name}</p>
                <p className="truncate text-xs text-muted-foreground">{r.email}</p>
              </div>
              <Button
                size="sm"
                variant="brand"
                className="h-8 rounded-lg"
                disabled={busy === `req-${r.id}`}
                onClick={() => decide(r, "approve")}
              >
                {busy === `req-${r.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Duyệt
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-lg"
                disabled={busy === `req-${r.id}`}
                onClick={() => decide(r, "reject")}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Members */}
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Học sinh trong lớp ({members.length})
        </p>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có học sinh nào.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{m.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => kick(m)}
                  disabled={busy === `mem-${m.id}`}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  aria-label={`Xoá ${m.name}`}
                  title="Xoá khỏi lớp"
                >
                  {busy === `mem-${m.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Small badge showing the pending-request count on a collapsed class card. */
export function PendingBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return <Badge variant="destructive">{count} chờ duyệt</Badge>;
}
