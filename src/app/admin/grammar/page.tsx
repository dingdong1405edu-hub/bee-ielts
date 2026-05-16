import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

export default async function AdminGrammarPage() {
  const units = await prisma.grammarUnit.findMany({
    orderBy: [{ level: "asc" }, { order: "asc" }],
    include: { lessons: true },
  });
  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Grammar Units</h1>
          <p className="text-muted-foreground">Quản lý unit & bài học ngữ pháp.</p>
        </div>
        <Button asChild>
          <Link href="/admin/grammar/new">
            <Plus className="h-4 w-4" /> Thêm bài học
          </Link>
        </Button>
      </div>
      {units.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-normal text-muted-foreground">
              Chưa có unit nào.
            </CardTitle>
          </CardHeader>
        </Card>
      ) : (
        units.map((u) => (
          <Card key={u.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{u.title}</CardTitle>
                <Badge variant="outline">{u.level}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{u.lessons.length} bài</p>
            </CardHeader>
          </Card>
        ))
      )}
    </div>
  );
}
