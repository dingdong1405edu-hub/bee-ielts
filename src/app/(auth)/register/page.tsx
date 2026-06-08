"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";
import { BeeLogo, BeeMascot, MascotBubble, LeafField, PaperGrain } from "@/components/brand";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Đăng ký thất bại");
        return;
      }
      await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      toast.success("Chào mừng đến Bee IELTS 🎉");
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen grid place-items-center px-4 py-10 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-10 left-10 h-72 w-72 rounded-full bg-honey blob" />
        <div className="absolute bottom-10 right-10 h-72 w-72 rounded-full bg-leaf-tint blob" />
      </div>

      <Link href="/" className="absolute top-6 left-6 z-10 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Trang chủ
      </Link>

      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border bg-card/80 shadow-xl shadow-primary/5 backdrop-blur md:grid-cols-2">
        {/* ── Branded panel ── */}
        <div className="relative hidden flex-col justify-between gap-8 bg-sage-50 p-8 text-foreground dark:bg-sage-950 md:flex">
          
          <LeafField className="absolute inset-0" />
          <PaperGrain opacity={0.35} />

          <div className="relative flex items-center gap-2">
            <BeeLogo variant="full" className="h-9 w-9 text-ink" />
            <span className="font-display text-lg font-extrabold tracking-tight">Bee IELTS</span>
          </div>

          <div className="relative flex flex-col items-center gap-5 text-center">
            <BeeMascot className="w-32 drop-shadow-sm" priority />
            <div>
              <h2 className="font-display text-2xl font-extrabold tracking-tight">Học chăm như ong</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Be smarter, be master, <span className="gradient-brand-text font-semibold">beeielts</span>
              </p>
            </div>
          </div>

          <div className="relative">
            <MascotBubble tone="tip">Tạo tài khoản free trong 30 giây — không cần thẻ, học ngay hôm nay!</MascotBubble>
          </div>
        </div>

        {/* ── Form ── */}
        <div className="p-6 md:p-8">
          <div className="mb-6 text-center md:text-left">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border bg-paper text-ink shadow-sm md:hidden">
              <BeeLogo variant="bare" className="h-9 w-9 text-ink" />
            </div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">Tạo tài khoản</h1>
            <p className="text-muted-foreground mt-1">Free, không cần thẻ — bắt đầu trong 30 giây.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Họ tên</Label>
              <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nguyễn Văn A" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input id="password" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Ít nhất 6 ký tự" />
            </div>
            <Button type="submit" variant="brand" className="w-full" size="lg" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Tạo tài khoản
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Đã có tài khoản?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
