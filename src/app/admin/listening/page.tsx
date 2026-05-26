import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Plus, Pencil, AlertTriangle } from "lucide-react";
import { DeleteTestButton } from "@/components/admin/delete-test-button";
import { audioSourceLabel } from "@/lib/utils";

export default async function AdminListeningPage() {
  const tests = await prisma.listeningTest.findMany({
    where: { bank: "PRACTICE", bandStageId: null },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Listening — Luyện tập</h1>
          <p className="text-sm text-muted-foreground">Kho đề cho trang Listening practice hằng ngày.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/listening/mock"><GraduationCap className="h-4 w-4" /> Đề thi thử</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/listening/new"><Plus className="h-4 w-4" /> Thêm bài luyện tập</Link>
          </Button>
        </div>
      </div>

      {tests.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Chưa có bài luyện tập nào.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tests.map((t) => {
            const name = t.title?.trim() || "(Chưa đặt tên)";
            const noName = !t.title?.trim();
            const noQuestions = t._count.questions === 0;
            const broken = noName || noQuestions;
            return (
              <Card key={t.id} className={broken ? "border-destructive/50" : undefined}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{name}</CardTitle>
                      <p className="text-xs text-muted-foreground truncate">
                        {t._count.questions} questions • {audioSourceLabel(t.audioUrl)}
                      </p>
                      {broken && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-destructive">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          Bài lỗi — {noName ? "chưa có tên" : "chưa có câu hỏi"}. Hãy bấm Sửa để hoàn thiện hoặc Xoá.
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/listening/${t.id}`}><Pencil className="h-3.5 w-3.5" /> Sửa</Link>
                      </Button>
                      <DeleteTestButton endpoint={`/api/admin/listening/${t.id}`} name={name} kind="bài nghe" />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
