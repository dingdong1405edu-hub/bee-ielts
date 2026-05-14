import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil } from "lucide-react";

export default async function AdminReadingPage() {
  const tests = await prisma.readingTest.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Reading Tests</h1>
          <p className="text-muted-foreground">Quản lý bài đọc + câu hỏi.</p>
        </div>
        <Button asChild>
          <Link href="/admin/reading/new"><Plus className="h-4 w-4" /> Thêm bài</Link>
        </Button>
      </div>
      {tests.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Chưa có bài nào.</CardContent></Card>
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
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/reading/${t.id}`}><Pencil className="h-3.5 w-3.5" /> Sửa</Link>
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
