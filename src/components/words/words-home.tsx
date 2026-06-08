"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2, Layers, Trash2, BellRing, BellOff, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Deck = { id: string; title: string; cardCount: number };

export function WordsHome({ decks, popQuizOn }: { decks: Deck[]; popQuizOn: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [quizOn, setQuizOn] = useState(popQuizOn);
  const [quizBusy, setQuizBusy] = useState(false);

  const createDeck = async () => {
    if (!title.trim()) return toast.error("Nhập tên bộ thẻ");
    setCreating(true);
    try {
      const res = await fetch("/api/words/deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi");
      toast.success("Đã tạo bộ thẻ");
      setTitle("");
      router.push(`/words/${data.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tạo thất bại");
    } finally {
      setCreating(false);
    }
  };

  const deleteDeck = async (id: string, name: string) => {
    if (!confirm(`Xoá bộ thẻ "${name}"? Mọi từ trong đó sẽ mất.`)) return;
    try {
      const res = await fetch("/api/words/deck", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      toast.success("Đã xoá");
      router.refresh();
    } catch {
      toast.error("Xoá thất bại");
    }
  };

  const toggleQuiz = async () => {
    const next = !quizOn;
    setQuizBusy(true);
    try {
      const res = await fetch("/api/user/pop-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on: next }),
      });
      if (!res.ok) throw new Error();
      setQuizOn(next);
      toast.success(next ? "Đã bật ôn bất chợt" : "Đã tắt ôn bất chợt");
    } catch {
      toast.error("Không đổi được");
    } finally {
      setQuizBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-honey to-honey-deep text-white shadow-lg shadow-honey/30">
          <Layers className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Học từ</h1>
          <p className="text-muted-foreground text-sm">
            Tạo bộ thẻ riêng — flashcard, học từ, nối hộp, kiểm tra.
          </p>
        </div>
      </div>

      {/* Pop-quiz toggle */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div
            className={cn(
              "grid h-10 w-10 place-items-center rounded-xl text-white",
              quizOn ? "bg-gradient-to-br from-amber-500 to-orange-500" : "bg-muted-foreground/40",
            )}
          >
            {quizOn ? <BellRing className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold">Ôn bất chợt</div>
            <div className="text-xs text-muted-foreground">
              Khi bật, thỉnh thoảng app sẽ hỏi nghĩa một từ ngẫu nhiên của bạn.
            </div>
          </div>
          <Button
            variant={quizOn ? "default" : "outline"}
            size="sm"
            className="rounded-full shrink-0"
            disabled={quizBusy}
            onClick={toggleQuiz}
          >
            {quizBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : quizOn ? "BẬT" : "TẮT"}
          </Button>
        </CardContent>
      </Card>

      {/* Create deck */}
      <Card>
        <CardContent className="p-4 flex gap-2">
          <Input
            placeholder="Tên bộ thẻ mới (vd: Từ vựng Reading tháng 5)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createDeck()}
          />
          <Button onClick={createDeck} disabled={creating} className="shrink-0 rounded-xl">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Tạo bộ
          </Button>
        </CardContent>
      </Card>

      {/* Deck list */}
      {decks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Chưa có bộ thẻ nào. Tạo bộ đầu tiên phía trên nhé! 🐝
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {decks.map((d) => (
            <Card key={d.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <Link href={`/words/${d.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-honey to-honey-deep text-white">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold truncate">{d.title}</div>
                    <div className="text-xs text-muted-foreground">{d.cardCount} từ</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </Link>
                <button
                  onClick={() => deleteDeck(d.id, d.title)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label="Xoá bộ thẻ"
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
