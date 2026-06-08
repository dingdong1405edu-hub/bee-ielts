"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Crown, Check, X, Loader2, Clock, Mail, UserX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface RequestRow {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  message: string | null;
  createdAt: string;
  decidedAt: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    isPremium: boolean;
    avatarUrl: string | null;
  };
}

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  premiumGrantedAt: string | null;
}

export function PremiumAdminClient({
  pending,
  decided,
  premiumLearners,
}: {
  pending: RequestRow[];
  decided: RequestRow[];
  premiumLearners: UserRow[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function callApi(path: string, body: Record<string, unknown>) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Lỗi");
    return data;
  }

  const approve = async (req: RequestRow) => {
    setBusyId(req.id);
    try {
      await callApi("/api/admin/premium/grant", { userId: req.user.id, requestId: req.id });
      toast.success(`Đã cấp Premium cho ${req.user.email}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cấp thất bại");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (req: RequestRow) => {
    setBusyId(req.id);
    try {
      await callApi("/api/admin/premium/reject", { requestId: req.id });
      toast.success("Đã từ chối yêu cầu");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setBusyId(null);
    }
  };

  const revoke = async (u: UserRow) => {
    if (!confirm(`Thu hồi Premium của ${u.email}?`)) return;
    setBusyId(u.id);
    try {
      await callApi("/api/admin/premium/revoke", { userId: u.id });
      toast.success("Đã thu hồi Premium");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <Crown className="h-6 w-6 text-gold-500" /> Premium
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Duyệt yêu cầu Premium từ học viên + xem danh sách user đang Premium. Chỉ OWNER thấy
          được trang này.
        </p>
      </div>

      {/* Pending queue */}
      <section className="space-y-2">
        <h2 className="font-extrabold flex items-center gap-2">
          <Clock className="h-4 w-4 text-gold-500" /> Yêu cầu đang chờ duyệt ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground text-center">
              Chưa có yêu cầu nào đang chờ.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {pending.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4 flex items-start gap-3">
                  <Avatar src={r.user.avatarUrl} email={r.user.email} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold truncate">{r.user.name || r.user.email}</span>
                      <span className="text-xs text-muted-foreground">{r.user.email}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {r.user.role}
                      </Badge>
                    </div>
                    {r.message && (
                      <p className="mt-1.5 text-sm text-foreground/80 bg-muted/40 rounded-lg p-2.5 whitespace-pre-wrap">
                        {r.message}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Gửi {new Date(r.createdAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => approve(r)}
                      disabled={busyId === r.id}
                      className="bg-sage-600 hover:bg-sage-700"
                    >
                      {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Cấp Premium
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reject(r)}
                      disabled={busyId === r.id}
                      className="border-rose-300 text-rose-700 hover:bg-rose-50"
                    >
                      <X className="h-3.5 w-3.5" /> Từ chối
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Active premium learners (revoke) */}
      <section className="space-y-2">
        <h2 className="font-extrabold flex items-center gap-2">
          <Crown className="h-4 w-4 text-sage-500" /> Học viên đang Premium ({premiumLearners.length})
        </h2>
        {premiumLearners.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground text-center">
              Chưa cấp Premium cho ai. ADMIN/OWNER có premium mặc định, không hiện ở đây.
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-2xl border divide-y bg-card">
            {premiumLearners.map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-3">
                <Avatar src={u.avatarUrl} email={u.email} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{u.name || u.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {u.email} · cấp lúc{" "}
                    {u.premiumGrantedAt
                      ? new Date(u.premiumGrantedAt).toLocaleString("vi-VN")
                      : "—"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => revoke(u)}
                  disabled={busyId === u.id}
                  className="border-rose-300 text-rose-700 hover:bg-rose-50"
                >
                  {busyId === u.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserX className="h-3.5 w-3.5" />
                  )}
                  Thu hồi
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Decided history */}
      <section className="space-y-2">
        <h2 className="font-extrabold flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" /> Lịch sử ({decided.length})
        </h2>
        {decided.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có yêu cầu nào được xử lý.</p>
        ) : (
          <div className="rounded-2xl border divide-y bg-card">
            {decided.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 text-sm">
                <Avatar src={r.user.avatarUrl} email={r.user.email} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{r.user.name || r.user.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.user.email}</p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    r.status === "APPROVED"
                      ? "border-sage-400 text-sage-700"
                      : "border-rose-400 text-rose-700"
                  }
                >
                  {r.status === "APPROVED" ? "Đã cấp" : "Từ chối"}
                </Badge>
                <span className="text-xs text-muted-foreground shrink-0">
                  {r.decidedAt ? new Date(r.decidedAt).toLocaleDateString("vi-VN") : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Avatar({
  src,
  email,
  size = "md",
}: {
  src: string | null;
  email: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-7 w-7" : "h-10 w-10";
  const initials = email.slice(0, 2).toUpperCase();
  return (
    <div className={`${dim} shrink-0 rounded-full overflow-hidden bg-primary text-primary-foreground grid place-items-center font-bold text-xs`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}
