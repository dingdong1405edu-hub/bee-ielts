"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";
import { ScrollReveal } from "@/components/scroll-reveal";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      toast.error("Email hoặc mật khẩu không đúng");
      return;
    }
    toast.success("Welcome back 🐝");
    router.push(params.get("from") ?? "/dashboard");
    router.refresh();
  };

  return (
    <div className="relative min-h-screen grid place-items-center px-4 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-10 left-10 h-72 w-72 rounded-full bg-honey blob" />
        <div className="absolute bottom-10 right-10 h-72 w-72 rounded-full bg-leaf-tint blob" />
      </div>

      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Trang chủ
      </Link>

      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <ScrollReveal>
          <div className="text-center mb-8">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl gradient-brand text-white text-2xl shadow-lg shadow-primary/20 mb-4">
              🐝
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Chào mừng quay lại</h1>
            <p className="text-muted-foreground mt-1 font-semibold">
              Be smarter, be master, <span className="gradient-brand-text">beeielts</span>
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={150}>
          <div className="rounded-3xl border bg-card/80 backdrop-blur p-6 md:p-8 shadow-xl shadow-primary/5">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Mật khẩu</Label>
                <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <Button type="submit" variant="brand" className="w-full" size="lg" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Đăng nhập
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Chưa có tài khoản?{" "}
              <Link href="/register" className="font-semibold text-primary hover:underline">
                Đăng ký free
              </Link>
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={300}>
          <div className="mt-4 rounded-2xl border-2 border-dashed border-primary/20 bg-accent/40 p-4 text-xs text-center">
            <p className="font-semibold mb-1">✨ Thử demo nhanh</p>
            <code className="text-[11px]">demo@bee-ielts.com</code> · <code className="text-[11px]">demo1234</code>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={450}>
          <div className="mt-5 text-center text-xs text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground">📞 Thông tin liên hệ</p>
            <p className="mt-1">
              Vui lòng liên hệ:{" "}
              <a href="tel:0378315088" className="font-semibold text-foreground hover:text-primary">
                0378315088
              </a>
              {" · "}
              <a
                href="mailto:nguyenminhsantafe@gmail.com"
                className="font-semibold text-foreground hover:text-primary"
              >
                nguyenminhsantafe@gmail.com
              </a>
            </p>
            <p className="mt-1">Phát triển bởi DingDong &amp; nnm</p>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
