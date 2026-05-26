import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil } from "lucide-react";
import { DeleteTestButton } from "@/components/admin/delete-test-button";

export default async function AdminWritingPage() {
  const tasks = await prisma.writingTask.findMany({
    where: { bandStageId: null },
    orderBy: [{ taskType: "asc" }, { createdAt: "desc" }],
  });
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Writing Tasks</h1>
        </div>
        <Button asChild>
          <Link href="/admin/writing/new"><Plus className="h-4 w-4" /> Thêm task</Link>
        </Button>
      </div>
      {tasks.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Chưa có task.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex gap-2 mb-2">
                      <Badge>Task {t.taskType}</Badge>
                      <Badge variant="outline">≥ {t.minWords} từ</Badge>
                    </div>
                    <CardTitle className="text-base">{t.prompt.split("\n")[0].slice(0, 200)}</CardTitle>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/writing/${t.id}`}><Pencil className="h-3.5 w-3.5" /> Sửa</Link>
                    </Button>
                    <DeleteTestButton
                      endpoint={`/api/admin/writing/${t.id}`}
                      name={t.prompt.split("\n")[0].slice(0, 60)}
                      kind="Writing task"
                    />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
