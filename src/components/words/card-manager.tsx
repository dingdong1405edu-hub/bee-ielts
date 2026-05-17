"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import type { StudyCard } from "./types";

export function CardManager({
  deckId,
  cards,
  onChange,
}: {
  deckId: string;
  cards: StudyCard[];
  onChange: (cards: StudyCard[]) => void;
}) {
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");
  const [example, setExample] = useState("");
  const [defining, setDefining] = useState(false);
  const [saving, setSaving] = useState(false);

  const aiDefine = async () => {
    if (!term.trim()) return toast.error("Nhập từ trước đã");
    setDefining(true);
    try {
      const res = await fetch("/api/words/define", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: term.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi");
      setDefinition(data.definition || "");
      setExample(data.example || "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI lỗi");
    } finally {
      setDefining(false);
    }
  };

  const addCard = async () => {
    if (!term.trim() || !definition.trim()) return toast.error("Cần có từ và nghĩa");
    setSaving(true);
    try {
      const res = await fetch("/api/words/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckId, term, definition, example }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi");
      onChange([
        ...cards,
        { id: data.id, term: term.trim(), definition: definition.trim(), example: example.trim() || null },
      ]);
      setTerm("");
      setDefinition("");
      setExample("");
      toast.success("Đã thêm thẻ");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const removeCard = async (id: string) => {
    const prev = cards;
    onChange(cards.filter((c) => c.id !== id));
    try {
      const res = await fetch("/api/words/card", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
    } catch {
      onChange(prev);
      toast.error("Xoá thất bại");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="font-extrabold">Thêm thẻ mới</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Từ / cụm từ tiếng Anh"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
            <Button variant="outline" onClick={aiDefine} disabled={defining} className="shrink-0">
              {defining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              AI điền nghĩa
            </Button>
          </div>
          <Textarea
            placeholder="Nghĩa (tiếng Việt)"
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            className="min-h-[60px]"
          />
          <Textarea
            placeholder="Ví dụ (không bắt buộc)"
            value={example}
            onChange={(e) => setExample(e.target.value)}
            className="min-h-[50px]"
          />
          <Button onClick={addCard} disabled={saving} className="rounded-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Thêm vào bộ thẻ
          </Button>
        </CardContent>
      </Card>

      {cards.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Bộ thẻ chưa có từ nào. Thêm từ phía trên để bắt đầu học nhé!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {cards.map((c, i) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted text-xs font-extrabold">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{c.term}</div>
                  <div className="text-sm text-muted-foreground">{c.definition}</div>
                  {c.example && (
                    <div className="text-xs italic text-muted-foreground/80 mt-0.5">“{c.example}”</div>
                  )}
                </div>
                <button
                  onClick={() => removeCard(c.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label="Xoá thẻ"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
