import Link from "next/link";
import { PenLine, Clock, BarChart3, FileText, Trophy, History, ChevronRight } from "lucide-react";
import { SkillIntro } from "@/components/learn/skill-intro";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteAttemptButton } from "@/components/learn/delete-attempt-button";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function WritingIntroPage() {
  const session = await auth();

  // Past writing attempts — newest first
  let history: {
    id: string;
    score: number | null;
    createdAt: Date;
    taskType: number | null;
    promptHead: string;
  }[] = [];

  if (session?.user?.id) {
    const attempts = await prisma.attempt.findMany({
      where: { userId: session.user.id, skill: "WRITING" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, score: true, createdAt: true, refId: true },
    });
    const taskIds = Array.from(new Set(attempts.map((a) => a.refId.replace(/^mock-/, ""))));
    const tasks = await prisma.writingTask.findMany({
      where: { id: { in: taskIds } },
      select: { id: true, taskType: true, prompt: true },
    });
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    history = attempts.map((a) => {
      const t = taskMap.get(a.refId.replace(/^mock-/, ""));
      return {
        id: a.id,
        score: a.score,
        createdAt: a.createdAt,
        taskType: t?.taskType ?? null,
        promptHead: t ? t.prompt.split("\n")[0].slice(0, 80) : "Bài viết",
      };
    });
  }

  return (
    <div className="space-y-6">
      <SkillIntro
        title="Writing"
        subtitle="2 task · 60 phút · AI chấm 4 tiêu chí IELTS"
        icon={PenLine}
        grad="from-rose-500 to-pink-500"
        startHref="/writing/start"
        bullets={[
          { icon: BarChart3, text: "Task 1 (20 phút, ≥150 từ): mô tả biểu đồ / số liệu" },
          { icon: FileText, text: "Task 2 (40 phút, ≥250 từ): essay về một chủ đề" },
          { icon: Clock, text: "Autosave draft. Hết giờ Task 1 tự chuyển Task 2." },
          { icon: Trophy, text: "AI chấm cả 2 task — overall = Task1 × 1/3 + Task2 × 2/3" },
        ]}
      />

      {history.length > 0 && (
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <History className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-extrabold">Bài viết đã làm</h2>
            <span className="text-xs text-muted-foreground">· nhấn để xem lại lời giải</span>
          </div>
          <div className="space-y-2">
            {history.map((h) => (
              <Card key={h.id} className="hover:shadow-md hover:border-primary/40 transition-all">
                <CardContent className="p-4 flex items-center gap-3">
                  <Link href={`/writing/review/${h.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-white font-extrabold">
                      {(h.score ?? 0).toFixed(1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-muted-foreground">
                        {h.taskType ? `Task ${h.taskType}` : "Writing"} ·{" "}
                        {new Date(h.createdAt).toLocaleDateString("vi-VN")}
                      </div>
                      <div className="text-sm font-semibold truncate">{h.promptHead}</div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </Link>
                  <DeleteAttemptButton attemptId={h.id} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
