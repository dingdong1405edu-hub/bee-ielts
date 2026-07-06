"use client";

/**
 * SolutionSheet — the "file hoàn chỉnh có lời giải chi tiết" for a paper-based
 * (Reading/Listening) assignment. Shows the answer key + AI-written detailed
 * solution for every question, and lets the teacher download the whole thing as
 * a Markdown file. Rendered on the teacher's assignment review page.
 */
import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Download, KeyRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface SolutionItem {
  number: number;
  prompt: string;
  answer: string;
  typeLabel: string;
  explanation: string;
}

export function SolutionSheet({
  title,
  className,
  skillLabel,
  items,
}: {
  title: string;
  className: string;
  skillLabel: string;
  items: SolutionItem[];
}) {
  const [open, setOpen] = useState(true);

  const buildMarkdown = () => {
    const lines: string[] = [
      `# Đáp án & lời giải — ${title}`,
      "",
      `> Lớp: ${className} · Kỹ năng: ${skillLabel} · ${items.length} câu`,
      "",
      "## Bảng đáp án",
      "",
      "| Câu | Đáp án |",
      "| --- | --- |",
      ...items.map((it) => `| ${it.number} | ${it.answer} |`),
      "",
      "## Lời giải chi tiết",
      "",
      ...items.flatMap((it) => [
        `### Câu ${it.number} — Đáp án: ${it.answer}`,
        ...(it.prompt ? [`*${it.prompt}*`, ""] : []),
        it.explanation || "_(chưa có lời giải)_",
        "",
      ]),
    ];
    return lines.join("\n");
  };

  const download = () => {
    try {
      const blob = new Blob([buildMarkdown()], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[\\/:*?"<>|]/g, "-")} - dap an & loi giai.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Đã tải file lời giải");
    } catch {
      toast.error("Không tải được file");
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 text-left"
          >
            <KeyRound className="h-5 w-5 text-honey-deep" />
            <span className="font-bold">Đáp án &amp; lời giải chi tiết</span>
            <span className="text-sm text-muted-foreground">({items.length} câu)</span>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
          </button>
          <Button onClick={download} variant="outline" size="sm" className="rounded-lg">
            <Download className="h-4 w-4" /> Tải file (.md)
          </Button>
        </div>

        {open && (
          <div className="space-y-2 p-4">
            {/* Quick answer key */}
            <div className="flex flex-wrap gap-1.5 pb-2">
              {items.map((it) => (
                <Badge key={it.number} variant="outline" className="font-normal">
                  <span className="font-semibold">{it.number}.</span> {it.answer}
                </Badge>
              ))}
            </div>
            {/* Detailed solutions */}
            <ul className="space-y-2">
              {items.map((it) => (
                <li key={it.number} className="rounded-lg border bg-muted/20 p-3">
                  <div className="flex items-start gap-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-honey-tint text-xs font-bold text-honey-deep">
                      {it.number}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      {it.prompt && <p className="text-sm font-medium">{it.prompt}</p>}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="success" className="font-semibold">{it.answer}</Badge>
                        <span className="text-xs text-muted-foreground">· {it.typeLabel}</span>
                      </div>
                      {it.explanation ? (
                        <p className="text-xs leading-relaxed text-muted-foreground">{it.explanation}</p>
                      ) : (
                        <p className="text-xs italic text-muted-foreground">Chưa có lời giải cho câu này.</p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
