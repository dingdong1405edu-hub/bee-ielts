import { ClipboardList, Sparkles, Lightbulb, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export interface MockFeedback {
  overall: string;
  skills: { skill: "LISTENING" | "READING" | "WRITING" | "SPEAKING"; comment: string }[];
  strengths: string[];
  priorities: string[];
  encouragement: string;
}

const SKILL_LABEL: Record<string, string> = {
  LISTENING: "Listening",
  READING: "Reading",
  WRITING: "Writing",
  SPEAKING: "Speaking",
};
const SKILL_DOT: Record<string, string> = {
  LISTENING: "bg-gold-500",
  READING: "bg-sage-500",
  WRITING: "bg-honey-deep",
  SPEAKING: "bg-leaf",
};

/** Validate an unknown JSON blob into a MockFeedback (or null). */
export function asMockFeedback(v: unknown): MockFeedback | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.overall !== "string" || !Array.isArray(o.skills)) return null;
  return o as unknown as MockFeedback;
}

/** The examiner's report (nhận xét) shown after a mock test. */
export function MockFeedbackReport({ feedback }: { feedback: MockFeedback }) {
  return (
    <Card className="border-2 border-primary/20 print:border-border">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-sage-600 text-white shadow-md print:hidden">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold tracking-tight">Nhận xét của giám khảo Bee</h3>
            <p className="text-xs text-muted-foreground">Đánh giá tổng thể bài thi thử &amp; định hướng luyện tiếp</p>
          </div>
        </div>

        {feedback.overall && (
          <p className="text-sm leading-relaxed text-foreground">{feedback.overall}</p>
        )}

        {feedback.skills?.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {feedback.skills.map((s) => (
              <div key={s.skill} className="rounded-2xl border bg-card p-3">
                <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider">
                  <span className={`h-2 w-2 rounded-full ${SKILL_DOT[s.skill] ?? "bg-muted-foreground"}`} />
                  {SKILL_LABEL[s.skill] ?? s.skill}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.comment}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {feedback.strengths?.length > 0 && (
            <div className="rounded-2xl border-2 border-sage-300 bg-sage-50 p-3.5 dark:border-sage-500/30 dark:bg-sage-500/10">
              <div className="mb-1.5 flex items-center gap-1.5 text-sm font-extrabold text-sage-700 dark:text-sage-300">
                <CheckCircle2 className="h-4 w-4" /> Điểm mạnh
              </div>
              <ul className="space-y-1">
                {feedback.strengths.map((s, i) => (
                  <li key={i} className="flex gap-1.5 text-xs leading-relaxed">
                    <span className="text-sage-600">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {feedback.priorities?.length > 0 && (
            <div className="rounded-2xl border-2 border-gold-300 bg-gold-50 p-3.5 dark:border-gold-500/30 dark:bg-gold-500/10">
              <div className="mb-1.5 flex items-center gap-1.5 text-sm font-extrabold text-gold-700 dark:text-gold-300">
                <Lightbulb className="h-4 w-4" /> Ưu tiên luyện tiếp
              </div>
              <ol className="space-y-1.5">
                {feedback.priorities.map((p, i) => (
                  <li key={i} className="flex gap-2 text-xs leading-relaxed">
                    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-gold-500 text-[10px] font-extrabold text-gold-950">
                      {i + 1}
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

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
