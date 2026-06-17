"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, Loader2, Check, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Lets a learner who signed in with Google set a login ID + password so they
 * can sign in again without Google. If they already have an ID, the form
 * doubles as "change password" (ID stays editable but pre-filled).
 */
export function CredentialsCard({ initialUsername }: { initialUsername: string | null }) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const hasId = Boolean(initialUsername);

  const submit = async () => {
    const id = username.trim().toLowerCase();
    if (!/^[a-z0-9._]{3,30}$/.test(id)) {
      toast.error("ID phải dài 3–30 ký tự, chỉ gồm chữ thường, số, dấu chấm hoặc gạch dưới");
      return;
    }
    if (password.length < 6) {
      toast.error("Mật khẩu cần ít nhất 6 ký tự");
      return;
    }
    if (password !== confirm) {
      toast.error("Mật khẩu nhập lại không khớp");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/user/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: id, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lưu thất bại");
      toast.success(hasId ? "Đã cập nhật mật khẩu" : "Đã tạo ID đăng nhập");
      setPassword("");
      setConfirm("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl gradient-brand text-white shadow-md">
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-extrabold tracking-tight">Đăng nhập bằng ID & mật khẩu</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {hasId
                ? "Bạn đã có ID đăng nhập. Lần sau có thể đăng nhập bằng ID + mật khẩu mà không cần Google."
                : "Tạo một ID riêng và mật khẩu để lần sau đăng nhập không cần Google. Tài khoản Google vẫn dùng được bình thường."}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="login-id">ID đăng nhập</Label>
            <Input
              id="login-id"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="vd: minh_ielts"
              autoComplete="username"
              maxLength={30}
              spellCheck={false}
            />
            <p className="text-[11px] text-muted-foreground">
              3–30 ký tự · chữ thường, số, dấu chấm hoặc gạch dưới (_)
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="login-pw">{hasId ? "Mật khẩu mới" : "Mật khẩu"}</Label>
              <Input
                id="login-pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ít nhất 6 ký tự"
                autoComplete="new-password"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-pw2">Nhập lại mật khẩu</Label>
              <Input
                id="login-pw2"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                autoComplete="new-password"
                maxLength={100}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-leaf" />
            Mật khẩu được mã hoá, Bee không lưu bản gốc.
          </p>
          <Button variant="brand" className="rounded-full" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {hasId ? "Cập nhật mật khẩu" : "Tạo ID đăng nhập"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
