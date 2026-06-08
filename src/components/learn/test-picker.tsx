import Link from "next/link";
import { CheckCircle2, ListChecks, Users, type LucideIcon } from "lucide-react";

export type PillColor = "amber" | "violet" | "indigo" | "emerald" | "sky" | "rose";

export type PickerItem = {
  id: string;
  href: string;
  title: string;
  imageUrl?: string | null;
  attemptCount?: number;
  pill?: { label: string; color: PillColor };
  details?: string[];
  done?: boolean;
};

const PILL_BG: Record<PillColor, string> = {
  amber: "bg-gold-500",
  violet: "bg-honey",
  indigo: "bg-leaf",
  emerald: "bg-sage-600",
  sky: "bg-primary",
  rose: "bg-rose-500",
};

// Rotating colors for the per-card detail lines (question types etc).
const DETAIL_COLORS = [
  "text-sage-600 dark:text-sage-400",
  "text-honey-deep dark:text-honey",
  "text-rose-600 dark:text-rose-400",
  "text-gold-700 dark:text-gold-400",
  "text-primary dark:text-primary/70",
  "text-leaf dark:text-leaf-tint",
];

/** IELTS question-type → human label, matching common test-bank wording. */
export function questionTypeLabel(type: string): string {
  const map: Record<string, string> = {
    MCQ: "Multiple Choice",
    FILL_BLANK: "Gap Filling",
    TRUE_FALSE: "True - False",
    TRUE_FALSE_NOT_GIVEN: "True - False - Not Given",
    MATCHING: "Matching",
    MATCHING_HEADINGS: "Matching Headings",
    MATCHING_INFO: "Matching Information",
    MATCHING_FEATURES: "Matching Features",
    MATCHING_SENTENCE_ENDINGS: "Matching Sentence Endings",
    SHORT_ANSWER: "Short Answer",
  };
  return map[type] ?? type;
}

/** "Pick your own test" card grid — the manual alternative to the random/AI picker. */
export function TestPicker({
  items,
  grad,
  icon: Icon,
  emptyText = "Chưa có đề nào.",
}: {
  items: PickerItem[];
  grad: string;
  icon: LucideIcon;
  emptyText?: string;
}) {
  return (
    <div className="max-w-6xl mx-auto w-full">
      <div className="flex items-center gap-2 mb-1">
        <ListChecks className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-extrabold">Hoặc tự chọn đề</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Nhấn vào đề bạn muốn làm.</p>

      {items.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((it) => (
            <Link
              key={it.id}
              href={it.href}
              className="group block overflow-hidden rounded-2xl border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
            >
              <div className="relative aspect-[16/10]">
                {it.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className={`grid h-full w-full place-items-center bg-gradient-to-br ${grad}`}>
                    <Icon className="h-10 w-10 text-white/80" />
                  </div>
                )}

                {it.attemptCount != null && (
                  <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                    <Users className="h-3 w-3" />
                    {it.attemptCount.toLocaleString("vi-VN")} lượt làm bài
                  </div>
                )}

                {it.done && (
                  <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-success px-2 py-1 text-[10px] font-bold text-success-foreground">
                    <CheckCircle2 className="h-3 w-3" /> Đã làm
                  </div>
                )}

                {it.pill && (
                  <div
                    className={`absolute bottom-2 left-2 rounded-md px-2.5 py-1 text-xs font-bold text-white ${PILL_BG[it.pill.color]}`}
                  >
                    {it.pill.label}
                  </div>
                )}
              </div>

              <div className="p-3">
                <h3 className="text-sm font-bold leading-snug line-clamp-2 group-hover:text-primary">
                  {it.title}
                </h3>
                {it.details && it.details.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {it.details.map((d, i) => (
                      <li key={d} className={`text-xs font-semibold ${DETAIL_COLORS[i % DETAIL_COLORS.length]}`}>
                        • {d}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
