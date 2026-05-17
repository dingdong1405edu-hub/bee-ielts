import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar } from "lucide-react";
import { ReadingSolutions } from "@/components/learn/reading-solutions";

export const dynamic = "force-dynamic";

export default async function ReadingReviewPage({ params }: { params: { attemptId: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const attempt = await prisma.attempt.findUnique({ where: { id: params.attemptId } });
  if (!attempt || attempt.userId !== session.user.id || attempt.skill !== "READING") notFound();

  // refId may be a single test id, or "mock-id1+id2+..." for a mock exam.
  const ids = attempt.refId.replace(/^mock-/, "").split("+").filter(Boolean);
  const tests = await prisma.readingTest.findMany({
    where: { id: { in: ids } },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  const ordered = ids.map((id) => tests.find((t) => t.id === id)).filter((t): t is (typeof tests)[number] => !!t);
  if (ordered.length === 0) notFound();

  const answers = (attempt.rawAnswer as Record<string, string>) ?? {};
  const allQuestions = ordered.flatMap((t) => t.questions);
  const correct = allQuestions.filter(
    (q) => (answers[q.id] || "").trim().toLowerCase() === (q.correctAnswer as string).toLowerCase(),
  ).length;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Button asChild variant="ghost" size="sm" className="rounded-full">
        <Link href="/profile">
          <ArrowLeft className="h-4 w-4" /> Quay lại Hồ sơ
        </Link>
      </Button>

      <Card className="bg-gradient-to-br from-primary/10 to-accent border-2 border-primary/20">
        <CardContent className="p-6 text-center">
          <div className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(attempt.createdAt).toLocaleString("vi-VN")}
            {attempt.refId.startsWith("mock-") && " · Thi thử"}
          </div>
          <div className="text-5xl font-extrabold gradient-brand-text mt-2">
            {(attempt.score ?? 0).toFixed(1)}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {correct}/{allQuestions.length} câu đúng
          </div>
        </CardContent>
      </Card>

      <ReadingSolutions
        passages={ordered.map((t) => ({
          id: t.id,
          title: t.title,
          passage: t.passage,
          questions: t.questions.map((q) => ({
            id: q.id,
            type: q.type,
            prompt: q.prompt,
            options: (q.options as string[] | null) ?? null,
            correctAnswer: q.correctAnswer as string,
          })),
        }))}
        answers={answers}
      />
    </div>
  );
}
