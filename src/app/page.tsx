import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, BookOpen, Headphones, PenLine, Mic, Trophy, ArrowRight, Zap, Flame } from "lucide-react";
import { ScrollReveal } from "@/components/scroll-reveal";
import { ThemeToggle } from "@/components/theme-toggle";
import { LandingBackground } from "@/components/landing-background";

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
      <LandingBackground />

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
              Luyện đủ 4 kỹ năng IELTS với AI chấm điểm tức thì. Học vui như chơi game,
              tiến bộ mỗi ngày — hoàn toàn miễn phí.
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
                <Flame className="h-4 w-4 text-orange-500" /> 4 kỹ năng
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

      {/* About — the Bee IELTS story */}
      <section className="container pb-24">
        <ScrollReveal>
          <div className="mx-auto max-w-3xl rounded-3xl border bg-card/70 backdrop-blur p-8 md:p-12 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-3 py-1 text-xs font-semibold">
              🐝 Câu chuyện của chúng mình
            </span>
            <h2 className="mt-5 text-2xl md:text-3xl font-extrabold tracking-tight">
              Bee IELTS — <span className="gradient-brand-text">since 2022</span>
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Bee IELTS được phát triển và hoàn thiện bởi{" "}
              <strong className="text-foreground">DingDong Company</strong>, với mong muốn
              giúp người Việt chinh phục IELTS một cách nhẹ nhàng, vui vẻ và bền bỉ.
            </p>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Cái tên <strong className="text-foreground">&ldquo;Bee&rdquo;</strong> lấy cảm hứng từ
              những chú ong chăm chỉ — mỗi ngày góp nhặt một chút, kiên trì và đều đặn, để rồi
              cùng nhau tạo nên mật ngọt. Chúng mình tin việc học tiếng Anh cũng vậy: chỉ cần
              mỗi ngày một chút, bạn sẽ tiến xa hơn mình tưởng. 🍯
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-semibold text-muted-foreground">
              <span>🗓️ Thành lập 2022</span>
              <span>🏢 DingDong Company</span>
              <span>💛 Học vì cộng đồng</span>
            </div>
          </div>
        </ScrollReveal>
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
        © {new Date().getFullYear()} Bee IELTS · DingDong Company · Made with 💜 for English learners
      </footer>
    </main>
  );
}
