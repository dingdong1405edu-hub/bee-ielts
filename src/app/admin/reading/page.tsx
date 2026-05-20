import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil } from "lucide-react";
import { BankTabs, resolveBankParam } from "@/components/admin/bank-tabs";

export default async function AdminReadingPage({
  searchParams,
}: {
  searchParams: { bank?: string };
}) {
  const bank = resolveBankParam(searchParams.bank);
  const [tests, practiceCount, mockCount] = await Promise.all([
    prisma.readingTest.findMany({
      where: { bank },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { questions: true } } },
    }),
    prisma.readingTest.count({ where: { bank: "PRACTICE" } }),
    prisma.readingTest.count({ where: { bank: "MOCK" } }),
  ]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Reading Tests</h1>
          <p className="text-muted-foreground">
            {bank === "MOCK"
              ? "Kho đề thi thử Reading — chỉ hiển thị trong Mock Test."
              : "Kho đề luyện tập Reading — dùng cho trang luyện tập hằng ngày."}
          </p>
        </div>
        <Button asChild>
          <Link href={`/admin/reading/new?bank=${bank === "MOCK" ? "mock" : "practice"}`}>
            <Plus className="h-4 w-4" /> Thêm bài {bank === "MOCK" ? "thi thử" : "luyện tập"}
          </Link>
        </Button>
      </div>

      <BankTabs current={bank} practiceCount={practiceCount} mockCount={mockCount} base="/admin/reading" />

      {tests.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Chưa có bài nào trong kho {bank === "MOCK" ? "thi thử" : "luyện tập"}.
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
