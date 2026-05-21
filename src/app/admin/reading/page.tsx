import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, GraduationCap } from "lucide-react";
import { DeleteTestButton } from "@/components/admin/delete-test-button";

export default async function AdminReadingPage() {
  const tests = await prisma.readingTest.findMany({
    where: { bank: "PRACTICE" },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Reading — Luyện tập</h1>
          <p className="text-muted-foreground">Kho đề cho trang Reading practice hằng ngày.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/reading/mock"><GraduationCap className="h-4 w-4" /> Đề thi thử</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/reading/new"><Plus className="h-4 w-4" /> Thêm bài luyện tập</Link>
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
          {tests.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex items-center gap-2 flex-wrap">
                      {t.title}
                      <Badge variant="outline">{t.level}</Badge>
                      <Badge variant="secondary">{t._count.questions} questions</Badge>
                    </CardTitle>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/reading/${t.id}`}>
                        <Pencil className="h-3.5 w-3.5" /> Sửa
                      </Link>
                    </Button>
                    <DeleteTestButton endpoint={`/api/admin/reading/${t.id}`} name={t.title} kind="bài đọc" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
