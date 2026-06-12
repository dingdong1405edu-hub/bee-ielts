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
import { BeeLogo, BeeMascot, LeafField, Leaf } from "@/components/brand";

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
    <div className="relative min-h-screen lg:grid lg:grid-cols-2 overflow-hidden">
      {/* ── Branded panel ── (right on desktop, under the form on mobile) */}
      {/* The panel background (bg-sage) is fixed green in BOTH themes, so its
          text/logo must stay light regardless of the theme — `text-cream`
          flips dark in dark mode and turned the logo + copy muddy. Use white. */}
      <aside className="relative order-last hidden overflow-hidden bg-sage text-white lg:flex lg:flex-col lg:justify-between lg:p-12">

        <LeafField className="absolute inset-0" />
        <div className="pointer-events-none absolute -top-16 -right-16 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-slate/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/30 shadow-lg shadow-black/10 backdrop-blur-sm">
            <BeeLogo variant="full" className="h-8 w-8 text-white" />
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight text-white">Bee IELTS</span>
        </div>

        <div className="relative">
          <BeeMascot className="w-40 drop-shadow-xl" priority />
          <h2 className="mt-8 max-w-sm font-display text-4xl font-extrabold leading-tight">
            Mỗi ngày một chút,
            <br />
            tiến bộ thấy rõ.
          </h2>
          <p className="mt-4 max-w-sm text-white/85 leading-relaxed">
            Luyện 4 kỹ năng IELTS với phản hồi từ AI, từ vựng &amp; ngữ pháp
            gamified — học vui như chơi, chắc như ong xây tổ.
          </p>
          <ul className="mt-6 space-y-2.5">
            {[
              "Chấm Writing & Speaking theo band score",
              "Reading & Listening sát đề thật",
              "Streak, XP, hearts giữ lửa mỗi ngày",
            ].map((line) => (
              <li key={line} className="flex items-center gap-2.5 text-sm text-white/90">
                <Leaf className="h-4 w-4 shrink-0 text-gold" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/60">
          Be smarter, be master, <span className="font-semibold text-white/90">beeielts</span>.
        </p>
      </aside>

      {/* ── Form column ── */}
      <div className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-12">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-10 left-10 h-72 w-72 rounded-full bg-gold/15 blob" />
          <div className="absolute bottom-10 right-10 h-72 w-72 rounded-full bg-sage-tint blob" />
        </div>

        <Link
          href="/"
          className="absolute top-6 left-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Trang chủ
        </Link>

        <div className="absolute top-5 right-5">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md">
          <ScrollReveal>
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-paper text-ink shadow-lg shadow-sage/10 ring-1 ring-sage/15">
                <BeeLogo variant="full" className="h-10 w-10 text-ink" />
              </div>
              <h1 className="font-display text-3xl font-extrabold tracking-tight">Chào mừng quay lại</h1>
              <p className="text-muted-foreground mt-1 font-semibold">
                Be smarter, be master, <span className="gradient-brand-text">beeielts</span>
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={150}>
            <div className="relative overflow-hidden rounded-3xl border bg-card/80 p-6 shadow-xl shadow-sage/5 backdrop-blur md:p-8">
              
              <form onSubmit={onSubmit} className="relative space-y-4">
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
              <p className="relative mt-6 text-center text-sm text-muted-foreground">
                Chưa có tài khoản?{" "}
                <Link href="/register" className="font-semibold text-primary hover:underline">
                  Đăng ký free
                </Link>
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={300}>
            <div className="mt-4 flex items-center gap-3 rounded-2xl border-2 border-dashed border-sage/25 bg-sage-tint/40 p-4 text-xs">
              <BeeMascot className="w-10 shrink-0" />
              <div className="text-left">
                <p className="mb-0.5 flex items-center gap-1.5 font-semibold">
                  <Leaf className="h-3.5 w-3.5 text-leaf" /> Thử demo nhanh
                </p>
                <code className="text-[11px]">demo@bee-ielts.com</code> · <code className="text-[11px]">demo1234</code>
              </div>
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
    </div>
  );
}
