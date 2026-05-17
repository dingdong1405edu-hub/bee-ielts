import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Headphones, BookOpen, PenLine, Mic, Coffee, Clock, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export default async function MockLandingPage() {
  const session = await auth();
  const recent = session?.user?.id
    ? await prisma.attempt.findMany({
        where: { userId: session.user.id, refId: { startsWith: "mock-" } },
        orderBy: { createdAt: "desc" },
        take: 3,
      })
    : [];

  const sections = [
    { icon: Headphones, label: "Listening", time: "~20 phút", grad: "from-amber-500 to-orange-500" },
    { icon: BookOpen, label: "Reading", time: "60 phút · 4 bài đọc", grad: "from-emerald-500 to-teal-500" },
    { icon: Coffee, label: "Nghỉ giải lao", time: "15 phút (có thể skip)", grad: "from-zinc-400 to-zinc-500" },
    { icon: PenLine, label: "Writing", time: "60 phút · Task 1 + Task 2", grad: "from-rose-500 to-pink-500" },
    { icon: Mic, label: "Speaking", time: "~12 phút · 3 part", grad: "from-indigo-500 to-blue-500" },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="rounded-3xl gradient-brand p-7 md:p-10 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.18),transparent_50%)]" />
        <div className="relative flex items-start gap-4 flex-wrap">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 backdrop-blur border border-white/20">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Thi thử IELTS Full</h1>
            <p className="mt-2 text-white/90 max-w-md">
              4 kỹ năng theo trình tự thi thật: Listening → Reading → Writing → Speaking. Bấm giờ chuẩn, có break giữa các phần.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-2">
          <h2 className="font-extrabold tracking-tight flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Trình tự bài thi
          </h2>
          <ol className="mt-2 space-y-2">
            {sections.map((s, i) => {
              const Icon = s.icon;
              return (
                <li key={i} className="flex items-center gap-3 rounded-xl border p-3">
                  <div className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${s.grad} text-white`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 font-semibold">{s.label}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {s.time}
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="p-5 text-sm space-y-1">
          <p>📌 Tổng thời gian ước tính: <strong>~2 giờ 45 phút</strong> (gồm 1 lần nghỉ 15 phút sau Reading)</p>
          <p>🎤 Phần Speaking yêu cầu quyền truy cập micro</p>
          <p>🔇 AI giám khảo sẽ đọc câu hỏi qua loa — hãy bật âm thanh</p>
          <p>📊 Cuối bài: AI chấm điểm cả 4 kỹ năng + overall band</p>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button asChild size="xl" variant="brand" className="flex-1 rounded-full">
          <Link href="/mock/test">Bắt đầu thi thử →</Link>
        </Button>
      </div>

      {recent.length > 0 && (
        <div>
          <h2 className="text-lg font-extrabold mb-3 tracking-tight">Lần thi gần đây</h2>
          <div className="rounded-2xl border bg-card divide-y">
            {recent.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-semibold">{a.skill} mock</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString("vi-VN")}
                  </div>
                </div>
                {a.score != null && (
                  <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                    {a.score.toFixed(1)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
