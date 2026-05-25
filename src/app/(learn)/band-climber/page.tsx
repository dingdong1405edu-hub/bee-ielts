import Link from "next/link";
import { TrendingUp, ArrowRight, BookOpen, Headphones, PenLine, Mic } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function BandClimberPage() {
  const stages = await prisma.bandStage.findMany({ orderBy: [{ order: "asc" }, { fromBand: "asc" }] });

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
          {stages.map((s) => (
            <Link key={s.id} href={`/band-climber/${s.id}`}>
              <Card className="hover:shadow-lg transition-shadow hover:border-primary/40 cursor-pointer">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl gradient-brand text-white font-extrabold text-lg shadow-md shadow-primary/20">
                    {s.fromBand.toFixed(1)}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent text-foreground font-extrabold text-lg border-2 border-primary/30">
                    {s.toBand.toFixed(1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold">{s.title}</div>
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
          ))}
        </div>
      )}
    </div>
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
