import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookOpen, Headphones, PenLine, Mic, Sparkles, Zap, Trophy, ArrowRight } from "lucide-react";

const features = [
  { icon: Sparkles, title: "Từ vựng & Ngữ pháp", desc: "Học theo phong cách Duolingo: lessons ngắn, XP, streak, hearts." },
  { icon: BookOpen, title: "Reading", desc: "Luyện đọc với passages thực tế + nhiều dạng câu hỏi." },
  { icon: Headphones, title: "Listening", desc: "Bài nghe chuẩn IELTS với audio player tốc độ tuỳ chỉnh." },
  { icon: PenLine, title: "Writing", desc: "AI chấm Task 1 & Task 2 theo 4 tiêu chí band score." },
  { icon: Mic, title: "Speaking", desc: "Part 1, 2, 3 — ghi âm và nhận đánh giá từ AI." },
  { icon: Trophy, title: "Tiến độ", desc: "Theo dõi điểm số, lịch sử bài làm, gamification giữ lửa." },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-accent/30 to-background">
      <header className="container flex items-center justify-between py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">🐝</div>
          <span className="text-lg font-bold">Bee IELTS</span>
        </div>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Đăng nhập</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">Bắt đầu</Link>
          </Button>
        </nav>
      </header>

      <section className="container py-16 md:py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            <Zap className="h-3 w-3" /> AI chấm Writing & Speaking
          </span>
          <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight">
            Học tiếng Anh <span className="text-primary">vui như chơi</span>,<br className="hidden md:block" />
            luyện IELTS hiệu quả như thầy thật.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Nền tảng học tiếng Anh toàn diện: từ vựng & ngữ pháp gamified, 4 kỹ năng IELTS với AI chấm bài tức thì.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="xl">
              <Link href="/register">Bắt đầu miễn phí <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="xl" variant="outline">
              <Link href="/login">Tôi đã có tài khoản</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container pb-20">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-md">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="container border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Bee IELTS — Made with ❤️ for English learners.
      </footer>
    </main>
  );
}
