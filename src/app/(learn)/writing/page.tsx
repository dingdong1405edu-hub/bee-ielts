import { Suspense } from "react";
import Link from "next/link";
import { PenLine, Clock, BarChart3, FileText, Trophy, History, ChevronRight } from "lucide-react";
import { SkillIntro } from "@/components/learn/skill-intro";
import { TestPicker } from "@/components/learn/test-picker";
import { TestPickerSkeleton } from "@/components/learn/test-picker-skeleton";
import { attemptCounts } from "@/lib/attempt-counts";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteAttemptButton } from "@/components/learn/delete-attempt-button";
import {} from "@/components/brand";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function WritingIntroPage() {
  return (
    <div className="relative space-y-5">
      <SkillIntro
        title="Writing"
        subtitle="2 task · không giới hạn thời gian · AI chấm 4 tiêu chí IELTS"
        icon={PenLine}
        grad="from-[#E47D92] to-[#D75E79]"
        startHref="/writing/start"
        ctaLabel="AI chọn đề ngẫu nhiên"
        bullets={[
          { icon: BarChart3, text: "Task 1 (≥150 từ): mô tả biểu đồ / số liệu" },
          { icon: FileText, text: "Task 2 (≥250 từ): essay về một chủ đề" },
          { icon: Clock, text: "Autosave draft. Không bấm giờ — chỉ đếm thời gian bạn đã làm." },
          { icon: Trophy, text: "AI chấm cả 2 task — overall = Task1 × 1/3 + Task2 × 2/3" },
        ]}
      />

      <Suspense fallback={<TestPickerSkeleton />}>
        <WritingTaskList />
      </Suspense>
    </div>
  );
}

async function WritingTaskList() {
  const session = await auth();

  const [tasks, counts] = await Promise.all([
    prisma.writingTask.findMany({
      where: { bandStageId: null },
      orderBy: [{ taskType: "asc" }, { createdAt: "desc" }],
      select: { id: true, taskType: true, prompt: true, minWords: true, imageUrl: true },
    }),
    attemptCounts("WRITING"),
  ]);

  let history: {
    id: string;
    score: number | null;
    createdAt: Date;
    taskType: number | null;
    promptHead: string;
  }[] = [];

  const doneIds = new Set<string>();
  if (session?.user?.id) {
    const attempts = await prisma.attempt.findMany({
      where: { userId: session.user.id, skill: "WRITING" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, score: true, createdAt: true, refId: true },
    });
    const taskIds = Array.from(new Set(attempts.map((a) => a.refId.replace(/^mock-/, ""))));
    taskIds.forEach((id) => doneIds.add(id));
    const tasksForHist = await prisma.writingTask.findMany({
      where: { id: { in: taskIds } },
      select: { id: true, taskType: true, prompt: true },
    });
    const taskMap = new Map(tasksForHist.map((t) => [t.id, t]));
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
    <>
      <TestPicker
        grad="from-[#E47D92] to-[#D75E79]"
        icon={PenLine}
        emptyText="Chưa có đề Writing nào."
        items={tasks.map((t) => ({
          id: t.id,
          href: `/writing/${t.id}`,
          title: t.prompt.split("\n")[0].slice(0, 110),
          imageUrl: t.imageUrl,
          attemptCount: counts.get(t.id) ?? 0,
          pill: { label: `Task ${t.taskType}`, color: t.taskType === 1 ? "amber" : "indigo" },
          details: [
            t.taskType === 1 ? "Mô tả biểu đồ / số liệu" : "Essay nghị luận",
            `≥ ${t.minWords} từ`,
          ],
          done: doneIds.has(t.id),
        }))}
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
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-honey to-honey-deep text-white font-extrabold">
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
    </>
  );
}
