import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/auth";
import { Check, Lock, Sparkles, Play } from "lucide-react";
import {EmptyState } from "@/components/brand";

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
    <div className="relative max-w-3xl mx-auto space-y-8">
      
      <div className="flex items-center gap-4">
        <div
          className="grid h-14 w-14 place-items-center rounded-2xl border bg-[#FF5CA8]/10 border-[#FF5CA8]/20 shadow-sm"
          style={{ color: "#FF5CA8" }}
        >
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Vocabulary</h1>
          <p className="text-muted-foreground">Học từ kiểu Duolingo — ngắn, vui, có thưởng XP.</p>
        </div>
      </div>

      {units.length === 0 ? (
        <EmptyState
          title="Chưa có bộ từ vựng nào"
          description="Các unit từ vựng đang được Bee chuẩn bị. Quay lại Bảng điều khiển để khám phá kỹ năng khác nhé!"
          action={
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-full gradient-brand px-5 py-2.5 text-sm font-bold text-white shadow-md transition-opacity hover:opacity-90"
            >
              Về Bảng điều khiển
            </Link>
          }
        />
      ) : (
        units.map((unit, ui) => (
          <section key={unit.id}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <Badge variant="brand" className="mb-2">UNIT {ui + 1} · {unit.level}</Badge>
                <h2 className="text-xl font-extrabold tracking-tight">{unit.title}</h2>
              </div>
              <div className="text-sm text-muted-foreground">
                {unit.lessons.filter((l) => l.progress[0]?.completed).length}/{unit.lessons.length}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {unit.lessons.map((l, idx) => {
                const done = l.progress[0]?.completed;
                const prevDone = idx === 0 ? true : unit.lessons[idx - 1].progress[0]?.completed;
                const locked = !done && !prevDone;
                return (
                  <Link
                    key={l.id}
                    href={locked ? "#" : `/vocab/${l.id}`}
                    aria-disabled={locked}
                    className={`group relative overflow-hidden rounded-2xl border bg-card p-4 transition-all ${locked ? "opacity-50 pointer-events-none" : "hover:-translate-y-0.5 hover:shadow-lg"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`grid h-12 w-12 place-items-center rounded-xl text-white font-extrabold ${
                          done
                            ? "bg-gradient-to-br from-sage-500 to-teal-500"
                            : locked
                              ? "bg-muted"
                              : "bg-gradient-to-br from-honey to-honey-deep"
                        }`}
                      >
                        {done ? <Check className="h-5 w-5" /> : locked ? <Lock className="h-4 w-4 text-muted-foreground" /> : <Play className="h-4 w-4 fill-current" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate">{l.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {done ? `Done · ${l.progress[0]?.score ?? 0}/100` : locked ? "Khoá" : "Bắt đầu"}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
