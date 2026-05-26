import Link from "next/link";
import {
  TrendingUp,
  ArrowRight,
  BookOpen,
  Headphones,
  PenLine,
  Mic,
  GraduationCap,
  Star,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

/**
 * Pick the stage that best matches a learner's placement band. We round
 * the band DOWN to find the gap they should start filling (e.g. band 4.7
 * → 4→5 stage, band 6.3 → 6→7). Returns the stage id whose `fromBand`
 * is closest at or below the placement band; falls back to the first
 * stage if everything is above.
 */
function recommendStageId(
  stages: { id: string; fromBand: number }[],
  placement: number,
): string | null {
  if (stages.length === 0) return null;
  const floor = Math.floor(placement);
  const exact = stages.find((s) => Math.floor(s.fromBand) === floor);
  if (exact) return exact.id;
  const below = stages
    .filter((s) => s.fromBand <= placement)
    .sort((a, b) => b.fromBand - a.fromBand)[0];
  if (below) return below.id;
  return stages[0].id;
}

export default async function BandClimberPage() {
  const session = await auth();
  const [stages, user] = await Promise.all([
    prisma.bandStage.findMany({ orderBy: [{ order: "asc" }, { fromBand: "asc" }] }),
    session?.user?.id
      ? prisma.user.findUnique({
          where: { id: session.user.id },
          select: { placementBand: true, placementDoneAt: true },
        })
      : Promise.resolve(null),
  ]);

  const recommendedId =
    user?.placementBand != null
      ? recommendStageId(stages, user.placementBand)
      : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-3">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl gradient-brand text-white shadow-lg shadow-primary/30">
          <TrendingUp className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Vượt band IELTS</h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Mỗi chặng tổng hợp các mẹo theo 4 kỹ năng để bạn nâng band mục tiêu hiệu quả nhất.
        </p>
      </div>

      {user && user.placementBand == null ? (
        <PlacementGate />
      ) : user?.placementBand != null ? (
        <PlacementResult
          band={user.placementBand}
          doneAt={user.placementDoneAt}
        />
      ) : null}

      {stages.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <p className="font-bold">Chưa có chặng nào</p>
            <p className="text-sm text-muted-foreground">
              Admin chưa tạo nội dung. Hãy quay lại sau.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {stages.map((s) => {
            const isRecommended = s.id === recommendedId;
            return (
              <Link key={s.id} href={`/band-climber/${s.id}`}>
                <Card
                  className={`hover:shadow-lg transition-shadow cursor-pointer ${
                    isRecommended
                      ? "border-2 border-primary ring-2 ring-primary/30 shadow-lg shadow-primary/10"
                      : "hover:border-primary/40"
                  }`}
                >
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl gradient-brand text-white font-extrabold text-lg shadow-md shadow-primary/20">
                      {s.fromBand.toFixed(1)}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent text-foreground font-extrabold text-lg border-2 border-primary/30">
                      {s.toBand.toFixed(1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-extrabold truncate">{s.title}</div>
                        {isRecommended && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                            <Star className="h-2.5 w-2.5 fill-current" /> Đề xuất
                          </span>
                        )}
                      </div>
                      {s.subtitle && (
                        <div className="text-sm text-muted-foreground">{s.subtitle}</div>
                      )}
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <SkillBadge label="Reading" icon={BookOpen} present={!!s.reading.trim()} />
                        <SkillBadge label="Listening" icon={Headphones} present={!!s.listening.trim()} />
                        <SkillBadge label="Writing" icon={PenLine} present={!!s.writing.trim()} />
                        <SkillBadge label="Speaking" icon={Mic} present={!!s.speaking.trim()} />
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** First-time visitor gate — sends them to take the mock test. */
function PlacementGate() {
  return (
    <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-lg leading-tight text-amber-900">
              Đầu tiên — bạn cần biết mình đang ở band nào
            </h2>
            <p className="text-sm text-amber-900/80">
              Hãy thi thử đủ 4 kỹ năng. Sau khi nộp, Bee sẽ tính overall band và đề xuất chặng vượt band phù hợp (4→5, 5→6, …).
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button asChild size="lg" className="bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/30">
            <Link href="/mock">
              <GraduationCap className="h-4 w-4" /> Thi thử ngay
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Once placed — show the band + invite to retake. */
function PlacementResult({ band, doneAt }: { band: number; doneAt: Date | null }) {
  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent">
      <CardContent className="p-4 flex items-center gap-3 flex-wrap">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl gradient-brand text-white font-extrabold text-lg shadow-md">
          {band.toFixed(1)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold">Trình độ hiện tại — Overall band {band.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">
            {doneAt
              ? `Chấm bằng bài thi thử ngày ${new Intl.DateTimeFormat("vi-VN").format(doneAt)}.`
              : "Chấm bằng bài thi thử gần nhất."}{" "}
            Chặng được đề xuất đang được làm nổi bật bên dưới.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/mock">
            <GraduationCap className="h-4 w-4" /> Thi thử lại
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function SkillBadge({
  label,
  icon: Icon,
  present,
}: {
  label: string;
  icon: React.ElementType;
  present: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
        present ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground line-through"
      }`}
      title={present ? `${label}: đã có nội dung` : `${label}: chưa có`}
    >
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}
