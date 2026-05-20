import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, BookOpen, GraduationCap } from "lucide-react";

export default async function AdminReadingMockPage() {
  const tests = await prisma.readingTest.findMany({
    where: { bank: "MOCK" },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" /> Reading — Đề thi thử
          </h1>
          <p className="text-muted-foreground">Kho đề riêng chỉ dùng trong Mock Test (Thi thử IELTS Full).</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/reading"><BookOpen className="h-4 w-4" /> Đề luyện tập</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/reading/mock/new"><Plus className="h-4 w-4" /> Thêm đề thi thử</Link>
          </Button>
        </div>
      </div>

      {tests.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground space-y-2">
            <p>Chưa có đề thi thử nào.</p>
            <p className="text-xs">
              Mock Test cần ít nhất 4 đề Reading (mỗi slot A/B/C/D 1 đề) để tạo bộ đề hoàn chỉnh.
            </p>
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
                      {t.slot && <Badge variant="outline">slot {t.slot}</Badge>}
                    </CardTitle>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/reading/${t.id}`}>
                      <Pencil className="h-3.5 w-3.5" /> Sửa
                    </Link>
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
