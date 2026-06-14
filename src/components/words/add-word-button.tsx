"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BookPlus, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { playCorrectSfx } from "@/lib/quiz-sfx";

type Deck = { id: string; title: string };

/** Floating "add a word" button available on every learner page. */
export function AddWordButton() {
  const [open, setOpen] = useState(false);
  const [decks, setDecks] = useState<Deck[] | null>(null);
  const [deckId, setDeckId] = useState("");
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");
  const [example, setExample] = useState("");
  const [defining, setDefining] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || decks !== null) return;
    fetch("/api/words/deck")
      .then((r) => r.json())
      .then((d) => {
        const list: Deck[] = d.decks ?? [];
        setDecks(list);
        if (list[0]) setDeckId(list[0].id);
      })
      .catch(() => setDecks([]));
  }, [open, decks]);

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

  const save = async () => {
    if (!deckId) return toast.error("Chọn bộ thẻ");
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
      toast.success("Đã lưu từ vào bộ thẻ");
      playCorrectSfx();
      setTerm("");
      setDefinition("");
      setExample("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)_+_5.5rem)] right-5 z-40 inline-flex items-center gap-2 rounded-full gradient-brand px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/30 transition-transform hover:-translate-y-0.5 md:bottom-5"
        aria-label="Thêm từ vào bộ thẻ"
      >
        <BookPlus className="h-5 w-5" />
        <span className="hidden sm:inline">Thêm từ</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl border bg-card p-5 shadow-xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-lg">Thêm từ vào bộ thẻ</h3>
              <button onClick={() => setOpen(false)} aria-label="Đóng">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {decks === null ? (
              <div className="py-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
              </div>
            ) : decks.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground space-y-3">
                <p>Bạn chưa có bộ thẻ nào.</p>
                <Button asChild className="rounded-full" onClick={() => setOpen(false)}>
                  <Link href="/words">Tạo bộ thẻ đầu tiên</Link>
                </Button>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs font-bold text-muted-foreground">Bộ thẻ</label>
                  <select
                    value={deckId}
                    onChange={(e) => setDeckId(e.target.value)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    {decks.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Từ tiếng Anh"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                  />
                  <Button variant="outline" onClick={aiDefine} disabled={defining} className="shrink-0">
                    {defining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    AI
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
                <Button onClick={save} disabled={saving} className="w-full rounded-full">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookPlus className="h-4 w-4" />}
                  Lưu vào bộ thẻ
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
