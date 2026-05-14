import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminSpeakingPage() {
  const sets = await prisma.speakingSet.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-2xl md:text-3xl font-bold">Speaking Sets</h1>
      <p className="text-sm text-muted-foreground">CRUD UI placeholder — seed cung cấp mẫu.</p>
      <div className="space-y-3">
        {sets.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="text-base">{s.topic}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
