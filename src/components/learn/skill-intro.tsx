import Link from "next/link";
import { Button } from "@/components/ui/button";
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

/**
 * Compact, professional skill intro: a single header card (icon + tight title +
 * subtitle + inline CTA) above a dense two-column "need to know" list — instead
 * of a tall centred hero. Keeps the four skill pages information-dense.
 */
export function SkillIntro({ title, subtitle, icon: Icon, grad, bullets, startHref, ctaLabel = "Bắt đầu làm bài" }: IntroProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${grad} text-white shadow-md`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-extrabold tracking-tight leading-tight">
            Luyện tập <span className="gradient-brand-text">{title}</span>
          </h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Button asChild variant="brand" className="rounded-full">
          <Link href={startHref}>
            {ctaLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* What to know — dense two-column */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Cần biết trước khi làm</h2>
        <ul className="grid gap-x-5 gap-y-2.5 sm:grid-cols-2">
          {bullets.map((b, i) => {
            const BIcon = b.icon;
            return (
              <li key={i} className="flex items-start gap-2.5">
                <div className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${grad} text-white`}>
                  <BIcon className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm leading-snug">{b.text}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
