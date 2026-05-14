import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminGrammarPage() {
  const units = await prisma.grammarUnit.findMany({
    orderBy: [{ level: "asc" }, { order: "asc" }],
    include: { lessons: true },
  });
  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-2xl md:text-3xl font-bold">Grammar Units</h1>
      {units.map((u) => (
        <Card key={u.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{u.title}</CardTitle>
              <Badge variant="outline">{u.level}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{u.lessons.length} bài</p>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
