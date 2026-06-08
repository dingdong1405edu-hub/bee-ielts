import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Headphones, PenLine, Mic, Sparkles } from "lucide-react";

export default async function AdminDashboard() {
  const [users, reading, listening, writing, speaking, vocab, attempts] = await Promise.all([
    prisma.user.count(),
    prisma.readingTest.count(),
    prisma.listeningTest.count(),
    prisma.writingTask.count(),
    prisma.speakingSet.count(),
    prisma.vocabLesson.count(),
    prisma.attempt.count(),
  ]);
  const stats = [
    { label: "Users", value: users, icon: Users, color: "bg-foreground" },
    { label: "Reading tests", value: reading, icon: BookOpen, color: "bg-emerald-500" },
    { label: "Listening tests", value: listening, icon: Headphones, color: "bg-amber-500" },
    { label: "Writing tasks", value: writing, icon: PenLine, color: "bg-rose-500" },
    { label: "Speaking sets", value: speaking, icon: Mic, color: "bg-honey" },
    { label: "Vocab lessons", value: vocab, icon: Sparkles, color: "bg-leaf" },
  ];

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Tổng quan hệ thống.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardDescription>{s.label}</CardDescription>
                  <CardTitle className="text-3xl">{s.value}</CardTitle>
                </div>
                <div className={`grid h-10 w-10 place-items-center rounded-lg ${s.color} text-white`}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Tổng số bài làm: <strong>{attempts}</strong></p>
        </CardContent>
      </Card>
    </div>
  );
}
