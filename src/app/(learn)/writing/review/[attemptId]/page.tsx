import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar } from "lucide-react";
import { WritingFeedback, type WritingResult } from "@/components/learn/writing-feedback";
import { AnnotatedEssay } from "@/components/learn/annotated-essay";
import { TaskDiagram } from "@/components/learn/task-diagram";

export const dynamic = "force-dynamic";

export default async function WritingReviewPage({ params }: { params: { attemptId: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const attempt = await prisma.attempt.findUnique({ where: { id: params.attemptId } });
  if (!attempt || attempt.userId !== session.user.id || attempt.skill !== "WRITING") notFound();

  const taskId = attempt.refId.replace(/^mock-/, "");
  const task = await prisma.writingTask.findUnique({ where: { id: taskId } });

  // Practise writing stores { essay }; a mock exam stores { essay1, essay2 }.
  const raw = (attempt.rawAnswer ?? {}) as { essay?: string; essay1?: string; essay2?: string };
  const essay = (
    raw.essay ?? [raw.essay1, raw.essay2].filter(Boolean).join("\n\n— — — — —\n\n")
  ).trim();
  const result = (attempt.feedback as WritingResult | null) ?? null;
  const wordCount = essay ? essay.split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-4 p-4 md:p-0">
      <Button asChild variant="ghost" size="sm" className="rounded-full">
        <Link href="/writing">
          <ArrowLeft className="h-4 w-4" /> Quay lại Writing
        </Link>
      </Button>

      <Card className="bg-gradient-to-br from-primary/10 to-accent border-2 border-primary/20">
        <CardContent className="p-6 text-center">
          <div className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(attempt.createdAt).toLocaleString("vi-VN")}
          </div>
          <div className="text-5xl font-extrabold gradient-brand-text mt-2">
            {(attempt.score ?? 0).toFixed(1)}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Task {task?.taskType ?? "?"} · {wordCount} từ
          </div>
        </CardContent>
      </Card>

      {task && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-bold">Đề bài</h3>
            <p className="whitespace-pre-wrap text-sm">{task.prompt}</p>
            {task.taskType === 1 && <TaskDiagram svg={task.diagramSvg} />}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5 space-y-2">
          <h3 className="font-bold">Bài viết của bạn</h3>
          {essay ? (
            <>
              {result?.annotations && result.annotations.length > 0 && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Các cụm <span className="font-bold underline decoration-2">in đậm gạch chân</span> là chỗ
                  viết sai — di chuột vào để xem lỗi &amp; cách sửa.{" "}
                  <span className="font-semibold text-rose-600 dark:text-rose-400">Ngữ pháp</span> ·{" "}
                  <span className="font-semibold text-honey-deep dark:text-honey">Từ vựng</span> ·{" "}
                  <span className="font-semibold text-amber-600 dark:text-amber-400">Mạch ý</span>
                </p>
              )}
              <AnnotatedEssay essay={essay} annotations={result?.annotations ?? []} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic">Bạn không nộp bài viết nào.</p>
          )}
        </CardContent>
      </Card>

      {result && <WritingFeedback result={result} taskLabel={`Task ${task?.taskType ?? ""}`} />}
    </div>
  );
}
