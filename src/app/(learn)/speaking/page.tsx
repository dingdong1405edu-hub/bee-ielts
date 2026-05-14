import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, ChevronRight } from "lucide-react";

export default async function SpeakingPage() {
  const sets = await prisma.speakingSet.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-500 text-white">
          <Mic className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Speaking</h1>
          <p className="text-muted-foreground">3 part IELTS — ghi âm và để AI chấm</p>
        </div>
      </div>

      {sets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">Chưa có set nào.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sets.map((s) => (
            <Link key={s.id} href={`/speaking/${s.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{s.topic}</CardTitle>
                      <CardDescription className="mt-1">Part 1 + Part 2 + Part 3</CardDescription>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
