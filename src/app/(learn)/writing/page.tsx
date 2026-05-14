import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PenLine, Clock, ChevronRight } from "lucide-react";
import { formatDuration } from "@/lib/utils";

export default async function WritingPage() {
  const tasks = await prisma.writingTask.findMany({ orderBy: [{ taskType: "asc" }, { createdAt: "desc" }] });
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-rose-500 text-white">
          <PenLine className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Writing</h1>
          <p className="text-muted-foreground">Task 1 & 2 — AI chấm theo 4 tiêu chí IELTS</p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">Chưa có task nào.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <Link key={t.id} href={`/writing/${t.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>Task {t.taskType}</Badge>
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" /> {formatDuration(t.timeLimit)}
                        </Badge>
                        <Badge variant="outline">≥ {t.minWords} từ</Badge>
                      </div>
                      <CardTitle className="text-base font-medium">
                        {t.prompt.split("\n")[0].slice(0, 120)}...
                      </CardTitle>
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
