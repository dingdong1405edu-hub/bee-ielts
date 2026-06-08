"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { BookOpen, Headphones, PenLine, Mic } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Honeycomb, Leaf, MascotBubble } from "@/components/brand";
import { cn } from "@/lib/utils";

type Skill = "reading" | "listening" | "writing" | "speaking";

const TABS: { key: Skill; label: string; icon: React.ElementType; color: string }[] = [
  { key: "reading", label: "Reading", icon: BookOpen, color: "text-sage-600" },
  { key: "listening", label: "Listening", icon: Headphones, color: "text-gold-600" },
  { key: "writing", label: "Writing", icon: PenLine, color: "text-rose-600" },
  { key: "speaking", label: "Speaking", icon: Mic, color: "text-leaf" },
];

/**
 * Skill-tab viewer for a band stage. Each tab renders its skill's markdown
 * through react-markdown with prose styling. Empty tabs show a gentle "chưa
 * có nội dung" placeholder so the admin can leave a skill blank intentionally.
 */
export function StageView({
  reading,
  listening,
  writing,
  speaking,
}: {
  reading: string;
  listening: string;
  writing: string;
  speaking: string;
}) {
  const content: Record<Skill, string> = { reading, listening, writing, speaking };
  const [active, setActive] = useState<Skill>("reading");
  const current = content[active].trim();

  return (
    <Card>
      <div className="relative overflow-hidden border-b">
        <Honeycomb className="pointer-events-none absolute inset-0 text-[#7A8C46]/[0.05]" />
        <div className="relative grid grid-cols-2 sm:grid-cols-4">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.key;
          const hasContent = !!content[t.key].trim();
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-3 text-sm font-bold transition-all",
                isActive
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4", isActive && t.color)} />
              <span>{t.label}</span>
              {!hasContent && (
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
                  trống
                </span>
              )}
            </button>
          );
        })}
        </div>
      </div>
      <CardContent className="p-5">
        <MascotBubble tone="tip" className="mb-4">
          <span className="inline-flex items-center gap-1.5">
            <Leaf className="h-4 w-4 shrink-0 text-leaf" />
            Đọc mẹo rồi leo lên band cao hơn nhé — bạn làm được mà!
          </span>
        </MascotBubble>
        {current ? (
          <div className="prose prose-sm md:prose-base max-w-none dark:prose-invert prose-headings:font-extrabold prose-headings:tracking-tight">
            <ReactMarkdown>{current}</ReactMarkdown>
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Chưa có nội dung cho phần này. Quay lại sau nhé — admin đang chuẩn bị.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
