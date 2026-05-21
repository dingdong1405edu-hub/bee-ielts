import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Plus, Pencil } from "lucide-react";

export default async function AdminListeningPage() {
  const tests = await prisma.listeningTest.findMany({
    where: { bank: "PRACTICE" },
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
          {tests.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{t.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {t._count.questions} questions • {t.audioUrl}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/listening/${t.id}`}><Pencil className="h-3.5 w-3.5" /> Sửa</Link>
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
