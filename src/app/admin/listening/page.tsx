import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminListeningPage() {
  const tests = await prisma.listeningTest.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });
  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-2xl md:text-3xl font-bold">Listening Tests</h1>
      <p className="text-sm text-muted-foreground">
        Tạo nhanh: cần upload audio file vào public/audio/ và set URL. Phần CRUD UI có thể bổ sung sau.
      </p>
      <div className="space-y-3">
        {tests.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <CardTitle className="text-base">{t.title}</CardTitle>
              <p className="text-xs text-muted-foreground">{t._count.questions} questions • {t.audioUrl}</p>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
