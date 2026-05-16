"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Loader2, ShieldCheck, ShieldOff, UserPlus } from "lucide-react";
import { OWNER_EMAIL } from "@/lib/admin";

type U = { id: string; email: string; name: string | null; role: string };

export function AccessManager({ users }: { users: U[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const setRole = async (targetEmail: string, role: "ADMIN" | "LEARNER") => {
    setBusy(targetEmail);
    try {
      const res = await fetch("/api/admin/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi");
      toast.success(role === "ADMIN" ? "Đã cấp quyền admin" : "Đã thu quyền admin");
      setEmail("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Thất bại");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cấp quyền admin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Email người dùng (đã có tài khoản)</Label>
            <Input
              type="email"
              placeholder="vidu@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button
            disabled={!email.trim() || busy !== null}
            onClick={() => setRole(email.trim(), "ADMIN")}
          >
            {busy === email.trim() ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Cấp quyền
          </Button>
          <p className="text-xs text-muted-foreground">
            Người dùng cần đăng xuất rồi đăng nhập lại để quyền mới có hiệu lực.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Danh sách người dùng</CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y">
          {users.map((u) => {
            const owner = u.email.toLowerCase() === OWNER_EMAIL;
            const isAdmin = u.role === "ADMIN";
            return (
              <div key={u.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {u.name || "—"}{" "}
                    <span className="text-muted-foreground text-sm">({u.email})</span>
                  </div>
                  <div className="mt-1">
                    {owner ? (
                      <Badge className="bg-amber-500 hover:bg-amber-500">
                        <Crown className="h-3 w-3" /> Owner
                      </Badge>
                    ) : (
                      <Badge variant={isAdmin ? "default" : "secondary"}>{u.role}</Badge>
                    )}
                  </div>
                </div>
                {!owner && (
                  <Button
                    size="sm"
                    variant={isAdmin ? "outline" : "default"}
                    disabled={busy !== null}
                    onClick={() => setRole(u.email, isAdmin ? "LEARNER" : "ADMIN")}
                  >
                    {busy === u.email ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isAdmin ? (
                      <ShieldOff className="h-4 w-4" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    {isAdmin ? "Thu quyền" : "Cấp quyền"}
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
