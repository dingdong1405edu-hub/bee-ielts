import Link from "next/link";
import { CheckCircle2, ChevronRight, ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export type PickerItem = {
  id: string;
  href: string;
  title: string;
  tags?: string[];
  done?: boolean;
};

/** "Pick your own test" list — the manual alternative to the random/AI picker. */
export function TestPicker({
  items,
  grad,
  emptyText = "Chưa có đề nào.",
}: {
  items: PickerItem[];
  grad: string;
  emptyText?: string;
}) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <ListChecks className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-extrabold">Hoặc tự chọn đề</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-3">Nhấn vào đề bạn muốn làm.</p>
      {items.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">{emptyText}</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((it, i) => (
            <Card key={it.id} className="hover:shadow-md hover:border-primary/40 transition-all">
              <CardContent className="p-0">
                <Link href={it.href} className="flex items-center gap-3 p-4">
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${grad} text-white font-extrabold text-sm`}
                  >
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{it.title}</div>
                    {it.tags && it.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {it.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {it.done && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success shrink-0">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Đã làm
                    </span>
                  )}
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
