import Link from "next/link";
import { Plus, Pencil, TrendingUp, BookOpen } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SAMPLE_READING_4_TO_5 } from "@/lib/band-climber-reading-sample";
import { SeedDefaultsButton } from "./seed-defaults-button";
import { SeedReadingButton } from "./seed-reading-button";

export const dynamic = "force-dynamic";

export default async function AdminBandClimberPage() {
  const stages = await prisma.bandStage.findMany({
    orderBy: [{ order: "asc" }, { fromBand: "asc" }],
    include: {
      readingTests: { select: { id: true, title: true } },
    },
  });
  const fourToFive = stages.find((s) => s.fromBand === 4.0 && s.toBand === 5.0);
  const sampleExists =
    fourToFive?.readingTests.some((t) => t.title === SAMPLE_READING_4_TO_5.title) ?? false;

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-primary" /> Vượt band
          </h1>
          <p className="text-muted-foreground text-sm">
            Mẹo giúp học viên nâng từ band X lên band Y, chia theo 4 kỹ năng.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SeedDefaultsButton hasAny={stages.length > 0} />
          {fourToFive && <SeedReadingButton exists={sampleExists} />}
          <Button asChild>
            <Link href="/admin/band-climber/new">
              <Plus className="h-4 w-4" /> Thêm chặng
            </Link>
          </Button>
        </div>
      </div>

      {stages.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <p className="font-bold">Chưa có chặng nào</p>
            <p className="text-sm text-muted-foreground">
              Bấm <strong>“Tạo 3 chặng mặc định”</strong> để khởi tạo nhanh, hoặc tự thêm chặng mới.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {stages.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl gradient-brand text-white font-extrabold">
                  {s.fromBand.toFixed(1)}
                </div>
                <span className="text-muted-foreground shrink-0">→</span>
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent text-foreground font-extrabold border-2 border-primary/30">
                  {s.toBand.toFixed(1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{s.title}</div>
                  {s.subtitle && (
                    <div className="text-xs text-muted-foreground truncate">{s.subtitle}</div>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {s.reading.trim() && <Badge variant="outline" className="text-[10px]">Reading</Badge>}
                    {s.listening.trim() && <Badge variant="outline" className="text-[10px]">Listening</Badge>}
                    {s.writing.trim() && <Badge variant="outline" className="text-[10px]">Writing</Badge>}
                    {s.speaking.trim() && <Badge variant="outline" className="text-[10px]">Speaking</Badge>}
                    {s.readingTests.length > 0 && (
                      <Badge className="text-[10px] bg-sage-600 hover:bg-sage-700">
                        <BookOpen className="h-2.5 w-2.5 mr-0.5" /> {s.readingTests.length} đề Reading
                      </Badge>
                    )}
                  </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/band-climber/${s.id}`}>
                    <Pencil className="h-3.5 w-3.5" /> Sửa
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
