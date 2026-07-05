"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, KeyRound } from "lucide-react";
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

/** Google "G" mark — inline so we don't pull in an icon dependency. */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

type AccountRole = "LEARNER" | "TEACHER" | "PARENT";

function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<AccountRole>("LEARNER");
  // Remember the last chosen persona on this device so a returning teacher's
  // dropdown defaults to "Giáo viên" (not "Học sinh") next time.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("bee_login_role");
      if (saved === "LEARNER" || saved === "TEACHER" || saved === "PARENT") setRole(saved);
    } catch {
      /* ignore */
    }
  }, []);
  const chooseRole = (r: AccountRole) => {
    setRole(r);
    try {
      localStorage.setItem("bee_login_role", r);
    } catch {
      /* ignore */
    }
  };
  const destination = params.get("from") ?? params.get("callbackUrl") ?? "/dashboard";
  // New users pick their persona here; it rides through the OAuth round-trip on
  // the callbackUrl and /welcome applies it (only for a not-yet-onboarded user —
  // existing accounts keep their role, so re-picking here can't demote anyone).
  // Only forward `next` for a real deep link — otherwise let /welcome route to
  // the chosen role's home (a new teacher should land on /teacher, not /dashboard).
  const isDeepLink = destination !== "/dashboard";
  const onboardUrl =
    `/welcome?role=${role}` + (isDeepLink ? `&next=${encodeURIComponent(destination)}` : "");

  // ID + password sign-in (opt-in; the account is first created via Google).
  const [showPw, setShowPw] = useState(false);
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const signInGoogle = () => {
    setLoading(true);
    // Google handles the redirect; on return Auth.js sends the user to
    // callbackUrl. `redirect: true` (default) navigates away, so we never
    // reset loading — the spinner stays until the page unloads.
    // `from` is set by the edge middleware; `callbackUrl` is what Auth.js's own
    // pages.signIn redirect appends — accept either so server-gated deep links
    // survive the Google round-trip.
    signIn("google", { callbackUrl: onboardUrl });
  };

  const signInPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (!id.trim() || !pw) {
      setPwError("Nhập ID và mật khẩu");
      return;
    }
    setPwLoading(true);
    // redirect:false so we can show an inline error instead of bouncing to the
    // Auth.js error page. On success the session cookie is set; navigate + refresh.
    const res = await signIn("credentials", {
      username: id.trim().toLowerCase(),
      password: pw,
      redirect: false,
    });
    if (res?.error) {
      setPwError("ID hoặc mật khẩu không đúng");
      setPwLoading(false);
      return;
    }
    // Same role-carrying route as the Google path: /welcome applies the chosen
    // persona and lands on its home, so an ID login also respects the dropdown.
    router.push(onboardUrl);
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

      {/* ── Sign-in column ── */}
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
              <h1 className="font-display text-3xl font-extrabold tracking-tight">Chào mừng đến Bee IELTS</h1>
              <p className="text-muted-foreground mt-1 font-semibold">
                Be smarter, be master, <span className="gradient-brand-text">beeielts</span>
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={150}>
            <div className="relative overflow-hidden rounded-3xl border bg-card/80 p-6 shadow-xl shadow-sage/5 backdrop-blur md:p-8">
              <div className="relative space-y-4 text-center">
                {/* Persona picker — like the reference login. Applied on first
                    sign-in; existing accounts keep their role. */}
                <div className="text-left">
                  <label htmlFor="acctype" className="text-sm font-semibold">
                    Chọn loại tài khoản
                  </label>
                  <select
                    id="acctype"
                    value={role}
                    onChange={(e) => chooseRole(e.target.value as AccountRole)}
                    className="mt-1.5 h-11 w-full rounded-xl border bg-background px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="LEARNER">Học sinh</option>
                    <option value="TEACHER">Giáo viên</option>
                    <option value="PARENT">Phụ huynh</option>
                  </select>
                </div>

                <p className="text-sm text-muted-foreground">
                  Đăng nhập hoặc tạo tài khoản chỉ với một chạm bằng Google.
                  Lần đầu đăng nhập sẽ tự tạo tài khoản cho bạn.
                </p>
                <Button
                  onClick={signInGoogle}
                  disabled={loading}
                  variant="outline"
                  size="lg"
                  className="w-full gap-3 border-2 font-semibold"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <GoogleIcon className="h-5 w-5" />
                  )}
                  {loading ? "Đang chuyển tới Google…" : "Tiếp tục với Google"}
                </Button>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Khi tiếp tục, bạn đồng ý với Điều khoản &amp; Chính sách bảo mật của Bee IELTS.
                </p>

                {/* Divider */}
                <div className="flex items-center gap-3 pt-1">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    hoặc
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {!showPw ? (
                  <Button
                    type="button"
                    onClick={() => setShowPw(true)}
                    variant="ghost"
                    size="lg"
                    className="w-full gap-2 font-semibold text-muted-foreground hover:text-foreground"
                  >
                    <KeyRound className="h-4 w-4" />
                    Đăng nhập bằng ID &amp; mật khẩu
                  </Button>
                ) : (
                  <form onSubmit={signInPassword} className="space-y-3 text-left">
                    <Input
                      value={id}
                      onChange={(e) => setId(e.target.value.toLowerCase())}
                      placeholder="ID đăng nhập"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      aria-label="ID đăng nhập"
                    />
                    <Input
                      type="password"
                      value={pw}
                      onChange={(e) => setPw(e.target.value)}
                      placeholder="Mật khẩu"
                      autoComplete="current-password"
                      aria-label="Mật khẩu"
                    />
                    {pwError && <p className="text-xs font-semibold text-destructive">{pwError}</p>}
                    <Button type="submit" variant="brand" size="lg" disabled={pwLoading} className="w-full gap-2 font-semibold">
                      {pwLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <KeyRound className="h-5 w-5" />}
                      {pwLoading ? "Đang đăng nhập…" : "Đăng nhập"}
                    </Button>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Chưa có ID? Đăng nhập bằng Google trước, rồi tạo ID &amp; mật khẩu trong trang Hồ sơ.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={300}>
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
