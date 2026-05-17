import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ListeningReviewPage({ params }: { params: { attemptId: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const attempt = await prisma.attempt.findUnique({ where: { id: params.attemptId } });
  if (!attempt || attempt.userId !== session.user.id || attempt.skill !== "LISTENING") notFound();

  const testId = attempt.refId.replace(/^mock-/, "");
  const test = await prisma.listeningTest.findUnique({
    where: { id: testId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!test) notFound();

  const answers = (attempt.rawAnswer as Record<string, string>) ?? {};
  const correct = test.questions.filter(
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
            {test.title} · {correct}/{test.questions.length} câu đúng
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-2">
          <h3 className="font-extrabold mb-1">Đáp án chi tiết</h3>
          {test.questions.map((q, i) => {
            const ua = answers[q.id] || "";
            const ok = ua.trim().toLowerCase() === (q.correctAnswer as string).toLowerCase();
            return (
              <div
                key={q.id}
                className={cn(
                  "rounded-lg border p-3 text-sm",
                  ok ? "border-success/50 bg-success/5" : "border-destructive/50 bg-destructive/5",
                )}
              >
                <div className="flex items-start gap-2">
                  <span className="font-bold">{i + 1}.</span>
                  <span className="flex-1">{q.prompt}</span>
                  {ok ? (
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  )}
                </div>
                <div className="mt-1 ml-6">
                  Của bạn:{" "}
                  <span className={ok ? "text-success font-semibold" : "text-destructive line-through"}>
                    {ua || "(trống)"}
                  </span>
                  {!ok && (
                    <>
                      {" "}· Đúng:{" "}
                      <span className="text-success font-semibold">{q.correctAnswer as string}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {test.transcript && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-extrabold mb-2">Transcript</h3>
            <div className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
              {test.transcript}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
