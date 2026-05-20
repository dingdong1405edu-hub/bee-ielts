import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BankTabs, resolveBankParam } from "@/components/admin/bank-tabs";

export default async function AdminListeningPage({
  searchParams,
}: {
  searchParams: { bank?: string };
}) {
  const bank = resolveBankParam(searchParams.bank);
  const [tests, practiceCount, mockCount] = await Promise.all([
    prisma.listeningTest.findMany({
      where: { bank },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { questions: true } } },
    }),
    prisma.listeningTest.count({ where: { bank: "PRACTICE" } }),
    prisma.listeningTest.count({ where: { bank: "MOCK" } }),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Listening Tests</h1>
        <p className="text-sm text-muted-foreground">
          {bank === "MOCK"
            ? "Kho đề thi thử Listening — chỉ hiển thị trong Mock Test."
            : "Kho đề luyện tập Listening — dùng cho trang luyện tập hằng ngày."}
        </p>
      </div>

      <BankTabs current={bank} practiceCount={practiceCount} mockCount={mockCount} base="/admin/listening" />

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
                <CardTitle className="text-base">{t.title}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {t._count.questions} questions • {t.audioUrl}
                </p>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
