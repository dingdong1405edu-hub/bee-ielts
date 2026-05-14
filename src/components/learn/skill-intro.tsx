import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, type LucideIcon } from "lucide-react";

interface IntroProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  grad: string;
  bullets: { icon: LucideIcon; text: string }[];
  startHref: string;
  ctaLabel?: string;
}

export function SkillIntro({ title, subtitle, icon: Icon, grad, bullets, startHref, ctaLabel = "Bắt đầu làm bài" }: IntroProps) {
  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      <div className="text-center space-y-3">
        <div className={`mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br ${grad} text-white shadow-lg shadow-primary/20`}>
          <Icon className="h-8 w-8" />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          Luyện tập <span className="gradient-brand-text">{title}</span>
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">{subtitle}</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="font-extrabold mb-4 text-sm tracking-wider text-muted-foreground uppercase">Cần biết trước khi làm</h2>
          <ul className="space-y-3">
            {bullets.map((b, i) => {
              const BIcon = b.icon;
              return (
                <li key={i} className="flex items-start gap-3">
                  <div className={`shrink-0 grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br ${grad} text-white`}>
                    <BIcon className="h-4 w-4" />
                  </div>
                  <span className="text-sm pt-1">{b.text}</span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Button asChild variant="brand" size="xl" className="w-full rounded-full text-base">
        <Link href={startHref}>
          {ctaLabel} <ArrowRight className="h-5 w-5" />
        </Link>
      </Button>
      <p className="text-center text-xs text-muted-foreground">Đề được chọn ngẫu nhiên dựa trên target band của bạn.</p>
    </div>
  );
}
