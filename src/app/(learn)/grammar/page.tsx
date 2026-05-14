import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpenText, ChevronRight } from "lucide-react";

export default async function GrammarPage() {
  const units = await prisma.grammarUnit.findMany({
    orderBy: [{ level: "asc" }, { order: "asc" }],
    include: { lessons: { orderBy: { order: "asc" } } },
  });
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-500 text-white">
          <BookOpenText className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Grammar</h1>
          <p className="text-muted-foreground">Luyện ngữ pháp qua các unit ngắn</p>
        </div>
      </div>

      {units.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">Chưa có unit nào.</CardContent>
        </Card>
      ) : (
        units.map((u) => (
          <Card key={u.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{u.title}</CardTitle>
                <Badge variant="outline">{u.level}</Badge>
              </div>
              <CardDescription>{u.lessons.length} bài</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {u.lessons.map((l) => (
                <Link
                  key={l.id}
                  href={`/grammar/${l.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent"
                >
                  <span className="font-medium">{l.title}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
