import { ClipboardList, Sparkles, Lightbulb, AlertTriangle, Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export interface MockFeedbackSkill {
  skill: "LISTENING" | "READING" | "WRITING" | "SPEAKING";
  band: number;
  errors: string[];
  howToImprove: string[];
}

export interface MockFeedback {
  overall: string;
  skills: MockFeedbackSkill[];
  priorities: string[];
  encouragement: string;
}

const SKILL_LABEL: Record<string, string> = {
  LISTENING: "Listening",
  READING: "Reading",
  WRITING: "Writing",
  SPEAKING: "Speaking",
};
const SKILL_ACCENT: Record<string, string> = {
  LISTENING: "from-gold-400 to-gold-600",
  READING: "from-sage-500 to-teal-500",
  WRITING: "from-honey to-honey-deep",
  SPEAKING: "from-leaf to-leaf-deep",
};

/** Validate an unknown JSON blob into a MockFeedback (or null). Tolerates the
 *  older shape (skills with `comment` instead of errors/howToImprove). */
export function asMockFeedback(
  v: unknown,
  /** Authoritative per-skill bands — override the stored band so legacy rows
   *  (which had no per-skill band) and any model drift never show "Band 0.0". */
  bands?: Partial<Record<MockFeedbackSkill["skill"], number>>,
): MockFeedback | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.overall !== "string" || !Array.isArray(o.skills)) return null;
  const skills: MockFeedbackSkill[] = (o.skills as Record<string, unknown>[]).map((s) => {
    const skill = (typeof s.skill === "string" ? s.skill.toUpperCase() : "LISTENING") as MockFeedbackSkill["skill"];
    const authoritative = bands?.[skill];
    return {
      skill,
      band: typeof authoritative === "number" ? authoritative : typeof s.band === "number" ? s.band : 0,
      errors: Array.isArray(s.errors)
        ? (s.errors as unknown[]).filter((x): x is string => typeof x === "string")
        : typeof s.comment === "string"
          ? [s.comment]
          : [],
      howToImprove: Array.isArray(s.howToImprove)
        ? (s.howToImprove as unknown[]).filter((x): x is string => typeof x === "string")
        : [],
    };
  });
  return {
    overall: o.overall as string,
    skills,
    priorities: Array.isArray(o.priorities)
      ? (o.priorities as unknown[]).filter((x): x is string => typeof x === "string")
      : [],
    encouragement: typeof o.encouragement === "string" ? o.encouragement : "",
  };
}

/** Detailed examiner's report (lỗi chi tiết + cách cải thiện) shown after a mock. */
export function MockFeedbackReport({ feedback }: { feedback: MockFeedback }) {
  return (
    <Card className="border-2 border-primary/20 print:border-border">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-sage-600 text-white shadow-md print:hidden">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold tracking-tight">Báo cáo chi tiết của giám khảo Bee</h3>
            <p className="text-xs text-muted-foreground">Lỗi cụ thể từng kỹ năng &amp; cách cải thiện</p>
          </div>
        </div>

        {feedback.overall && (
          <p className="rounded-xl bg-muted/40 p-3 text-sm leading-relaxed text-foreground">{feedback.overall}</p>
        )}

        {/* Per-skill detail: errors (red) + how to improve (green) */}
        <div className="space-y-3">
          {feedback.skills.map((s) => (
            <div key={s.skill} className="rounded-2xl border bg-card p-3.5">
              <div className="mb-2 flex items-center gap-2">
                <span className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${SKILL_ACCENT[s.skill] ?? "from-primary to-sage-600"} text-[11px] font-extrabold text-white print:hidden`}>
                  {s.band.toFixed(1)}
                </span>
                <span className="text-sm font-extrabold">{SKILL_LABEL[s.skill] ?? s.skill}</span>
                <span className="ml-auto text-xs font-bold text-muted-foreground">Band {s.band.toFixed(1)}</span>
              </div>

              {s.errors.length > 0 && (
                <div className="mb-2">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-extrabold text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="h-3.5 w-3.5" /> Lỗi / điểm yếu
                  </div>
                  <ul className="space-y-1">
                    {s.errors.map((e, i) => (
                      <li key={i} className="flex gap-1.5 text-xs leading-relaxed text-foreground/90">
                        <span className="text-rose-500">•</span>
                        <span>{e}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {s.howToImprove.length > 0 && (
                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-extrabold text-sage-700 dark:text-sage-400">
                    <Wrench className="h-3.5 w-3.5" /> Cách cải thiện
                  </div>
                  <ol className="space-y-1">
                    {s.howToImprove.map((h, i) => (
                      <li key={i} className="flex gap-1.5 text-xs leading-relaxed">
                        <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-sage-500 text-[10px] font-extrabold text-white">
                          {i + 1}
                        </span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ))}
        </div>

        {feedback.priorities.length > 0 && (
          <div className="rounded-2xl border-2 border-gold-300 bg-gold-50 p-3.5 dark:border-gold-500/30 dark:bg-gold-500/10">
            <div className="mb-1.5 flex items-center gap-1.5 text-sm font-extrabold text-gold-700 dark:text-gold-300">
              <Lightbulb className="h-4 w-4" /> Ưu tiên luyện tiếp (toàn bài)
            </div>
            <ol className="space-y-1.5">
              {feedback.priorities.map((p, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold-500 text-[11px] font-extrabold text-gold-950">
                    {i + 1}
                  </span>
                  <span>{p}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {feedback.encouragement && (
          <p className="flex items-start gap-1.5 rounded-xl bg-primary/5 p-3 text-sm italic text-foreground">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {feedback.encouragement}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
