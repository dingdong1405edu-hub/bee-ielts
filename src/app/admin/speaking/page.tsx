import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil } from "lucide-react";
import { DeleteTestButton } from "@/components/admin/delete-test-button";

export default async function AdminSpeakingPage() {
  const sets = await prisma.speakingSet.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Speaking Sets</h1>
          <p className="text-sm text-muted-foreground">Dùng chung cho cả Practice lẫn Mock Test.</p>
        </div>
        <Button asChild>
          <Link href="/admin/speaking/new"><Plus className="h-4 w-4" /> Thêm Speaking set</Link>
        </Button>
      </div>
      {sets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Chưa có Speaking set nào.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sets.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base flex-1 min-w-0">{s.topic}</CardTitle>
                  <div className="flex shrink-0 gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/speaking/${s.id}`}><Pencil className="h-3.5 w-3.5" /> Sửa</Link>
                    </Button>
                    <DeleteTestButton endpoint={`/api/admin/speaking/${s.id}`} name={s.topic} kind="Speaking set" />
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
