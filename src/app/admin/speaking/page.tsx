import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

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
                <CardTitle className="text-base">{s.topic}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
