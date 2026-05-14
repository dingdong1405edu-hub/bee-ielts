import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Headphones, Clock, ChevronRight } from "lucide-react";
import { formatDuration } from "@/lib/utils";

export default async function ListeningPage() {
  const tests = await prisma.listeningTest.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-500 text-white">
          <Headphones className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Listening</h1>
          <p className="text-muted-foreground">Nghe audio và làm bài</p>
        </div>
      </div>

      {tests.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Chưa có bài Listening. Admin upload audio + transcript trong dashboard.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tests.map((t) => (
            <Link key={t.id} href={`/listening/${t.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{t.title}</CardTitle>
                      <CardDescription className="mt-2 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {formatDuration(t.timeLimit)}
                        </span>
                        <span>{t._count.questions} câu hỏi</span>
                      </CardDescription>
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
