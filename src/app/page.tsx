import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, BookOpen, Headphones, PenLine, Mic, Trophy, ArrowRight, Zap, Flame } from "lucide-react";
import { ScrollReveal } from "@/components/scroll-reveal";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  { icon: Sparkles, title: "Từ vựng", desc: "Học từ kiểu Duolingo, XP & streak giữ lửa.", grad: "from-violet-500 to-fuchsia-500" },
  { icon: BookOpen, title: "Reading", desc: "Passage chuẩn IELTS, đa dạng dạng câu hỏi.", grad: "from-emerald-500 to-teal-500" },
  { icon: Headphones, title: "Listening", desc: "Audio thật, tốc độ tuỳ chỉnh, transcript.", grad: "from-amber-500 to-orange-500" },
  { icon: PenLine, title: "Writing", desc: "AI chấm 4 tiêu chí band IELTS tức thì.", grad: "from-rose-500 to-pink-500" },
  { icon: Mic, title: "Speaking", desc: "Part 1, 2, 3 — AI nghe & feedback.", grad: "from-indigo-500 to-blue-500" },
  { icon: Trophy, title: "Tiến bộ", desc: "Theo dõi điểm, streak, lịch sử bài.", grad: "from-yellow-500 to-amber-500" },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-violet-300 blob animate-blob" />
        <div className="absolute top-40 -right-20 h-80 w-80 rounded-full bg-pink-300 blob animate-blob" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-200 blob animate-blob" style={{ animationDelay: "4s" }} />
      </div>

      <header className="container flex items-center justify-between py-5">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-2xl gradient-brand text-white text-lg shadow-lg shadow-primary/20">🐝</div>
          <span className="text-lg font-extrabold tracking-tight">Bee IELTS</span>
        </Link>
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Đăng nhập</Link>
          </Button>
          <Button asChild size="sm" className="rounded-full">
            <Link href="/register">Bắt đầu <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </nav>
      </header>

      <section className="container pt-12 pb-20 md:pt-20 md:pb-28 text-center">
        <div className="mx-auto max-w-3xl">
          <ScrollReveal>
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-card/60 backdrop-blur px-3.5 py-1.5 text-xs font-semibold shadow-sm">
              <Zap className="h-3.5 w-3.5 text-amber-500" /> AI chấm Writing & Speaking · Miễn phí
            </span>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <h1 className="mt-7 text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-balance leading-[1.05]">
              Be smarter,
              <br />
              be master,
              <br />
              <span className="gradient-brand-text">beeielts.</span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <p className="mt-7 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
              Từ vựng gamified + 4 kỹ năng IELTS có AI chấm — tất cả trong 1 app, miễn phí, dùng được trên điện thoại.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={300}>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Button asChild size="xl" className="rounded-full shadow-lg shadow-primary/30 px-8">
                <Link href="/register">
                  Bắt đầu miễn phí <ArrowRight className="ml-1 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline" className="rounded-full bg-card/70 backdrop-blur">
                <Link href="/login">Tôi đã có tài khoản</Link>
              </Button>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={400}>
            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-orange-500" /> 6 kỹ năng
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-violet-500" /> AI grading
              </div>
              <div className="flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-amber-500" /> XP & Streak
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="container pb-24">
        <ScrollReveal>
          <h2 className="mb-10 text-center text-3xl md:text-4xl font-extrabold tracking-tight">
            Mọi thứ bạn cần để <span className="gradient-brand-text">level up</span>.
          </h2>
        </ScrollReveal>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <ScrollReveal key={f.title} delay={i * 80}>
              <div className="group relative overflow-hidden rounded-3xl border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 h-full">
                <div className={`mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${f.grad} text-white shadow-lg`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section className="container pb-24">
        <ScrollReveal>
          <div className="rounded-3xl gradient-brand p-10 md:p-16 text-white text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
            <div className="relative">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">Sẵn sàng bắt đầu? 🚀</h2>
              <p className="mt-4 text-white/90 max-w-xl mx-auto">
                Đăng ký 30 giây, dùng demo account để thử ngay không cần tạo mới.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Button asChild size="xl" variant="secondary" className="rounded-full bg-white text-primary hover:bg-white/90">
                  <Link href="/register">Tạo tài khoản free</Link>
                </Button>
                <Button asChild size="xl" variant="outline" className="rounded-full border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                  <Link href="/login">Vào demo</Link>
                </Button>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <footer className="container border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Bee IELTS · Made with 💜 for English learners
      </footer>
    </main>
  );
}
