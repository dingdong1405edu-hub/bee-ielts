import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/auth";
import { ChevronRight, Sparkles } from "lucide-react";

export default async function VocabPage() {
  const session = await auth();
  const units = await prisma.vocabUnit.findMany({
    orderBy: [{ level: "asc" }, { order: "asc" }],
    include: {
      lessons: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          order: true,
          progress: { where: { userId: session?.user?.id }, select: { completed: true, score: true } },
        },
      },
    },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-violet-500 text-white">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Vocabulary</h1>
          <p className="text-muted-foreground">Học từ vựng theo unit & lesson</p>
        </div>
      </div>

      {units.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">Chưa có unit nào. Quay lại sau nhé.</CardContent>
        </Card>
      ) : (
        units.map((unit) => (
          <Card key={unit.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{unit.title}</CardTitle>
                <Badge variant="outline">{unit.level}</Badge>
              </div>
              <CardDescription>{unit.lessons.length} lessons</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {unit.lessons.map((l) => {
                const done = l.progress[0]?.completed;
                return (
                  <Link
                    key={l.id}
                    href={`/vocab/${l.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-semibold ${done ? "bg-success text-success-foreground" : "bg-muted"}`}>
                        {l.order}
                      </span>
                      <span className="font-medium">{l.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {done && <Badge variant="success">Hoàn thành</Badge>}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
