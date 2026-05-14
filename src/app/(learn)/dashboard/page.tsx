import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, BookOpenText, BookOpen, Headphones, PenLine, Mic, ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const modules = [
  { href: "/vocab", label: "Vocabulary", icon: Sparkles, desc: "Học từ vựng theo phong cách Duolingo", color: "bg-violet-500" },
  { href: "/grammar", label: "Grammar", icon: BookOpenText, desc: "Luyện ngữ pháp qua bài tập ngắn", color: "bg-blue-500" },
  { href: "/reading", label: "Reading", icon: BookOpen, desc: "Đọc hiểu IELTS với passages thật", color: "bg-emerald-500" },
  { href: "/listening", label: "Listening", icon: Headphones, desc: "Nghe và làm câu hỏi IELTS", color: "bg-amber-500" },
  { href: "/writing", label: "Writing", icon: PenLine, desc: "Task 1 & 2 — AI chấm band", color: "bg-rose-500" },
  { href: "/speaking", label: "Speaking", icon: Mic, desc: "3 part IELTS — AI đánh giá", color: "bg-indigo-500" },
];

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user;
  const recentAttempts = user?.id
    ? await prisma.attempt.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
    : [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Chào {user?.name || "bạn"} 👋</h1>
        <p className="text-muted-foreground mt-1">Chọn một kỹ năng để bắt đầu luyện tập hôm nay.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.href} href={m.href}>
              <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5">
                <CardHeader>
                  <div className={`grid h-10 w-10 place-items-center rounded-lg ${m.color} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="mt-3 flex items-center gap-1">
                    {m.label}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                  <CardDescription>{m.desc}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      {recentAttempts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Hoạt động gần đây</h2>
          <Card>
            <CardContent className="p-0 divide-y">
              {recentAttempts.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium">{a.skill}</div>
                    <div className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString("vi-VN")}</div>
                  </div>
                  {a.score != null && <div className="text-sm font-semibold">Band {a.score.toFixed(1)}</div>}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
