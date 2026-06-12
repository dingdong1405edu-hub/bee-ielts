"use client";

import { useState, useCallback } from "react";
import { Check, X, Eye, RotateCw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BeeMascot, MascotBubble } from "@/components/brand";
import { cn } from "@/lib/utils";
import type { StudyCard } from "./types";
import {
  playCorrectSfx,
  playWrongSfx,
  playSwooshSfx,
  playStreakSfx,
  playLessonCompleteSfx,
} from "@/lib/quiz-sfx";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function postProgress(cardId: string, mastered: boolean): void {
  fetch("/api/words/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cardId, mastered }),
  }).catch(() => {
    // fire-and-forget — ignore errors
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LearnMode({
  cards,
  deckId: _deckId,
}: {
  cards: StudyCard[];
  deckId: string;
}) {
  const total = cards.length;

  const [queue, setQueue] = useState<StudyCard[]>(() => shuffle(cards));
  const [mastered, setMastered] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleReveal = useCallback(() => {
    playSwooshSfx();
    setRevealed(true);
  }, []);

  const handleMastered = useCallback(() => {
    if (queue.length === 0) return;
    const [current, ...rest] = queue;
    postProgress(current.id, true);
    const newMastered = mastered + 1;
    if (rest.length === 0) {
      setMastered(newMastered);
      setDone(true);
      playLessonCompleteSfx();
    } else {
      setQueue(rest);
      setMastered(newMastered);
      setRevealed(false);
      playCorrectSfx();
      // Every 5th mastered word layers a brighter streak chime on top.
      if (newMastered % 5 === 0) setTimeout(playStreakSfx, 220);
    }
  }, [queue, mastered]);

  const handleNotMastered = useCallback(() => {
    if (queue.length === 0) return;
    playWrongSfx();
    const [current, ...rest] = queue;
    setQueue([...rest, current]);
    setRevealed(false);
  }, [queue]);

  const handleRestart = useCallback(() => {
    playSwooshSfx();
    setQueue(shuffle(cards));
    setMastered(0);
    setRevealed(false);
    setDone(false);
  }, [cards]);

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <Trophy className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-semibold text-muted-foreground">
          Bộ thẻ này chưa có từ vựng nào.
        </p>
        <p className="text-sm text-muted-foreground">
          Hãy thêm thẻ để bắt đầu luyện tập!
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Completion screen
  // -------------------------------------------------------------------------

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
        <div className="flex items-end justify-center gap-3">
          <BeeMascot className="w-28 drop-shadow-sm md:w-32" priority />
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <Trophy className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold tracking-tight">Hoàn thành!</h2>
          <p className="text-muted-foreground">
            Bạn đã học thuộc{" "}
            <span className="font-bold text-green-600">{mastered}</span> /{" "}
            <span className="font-bold">{total}</span> từ trong vòng này.
          </p>
          <p className="text-sm text-muted-foreground">
            Luyện tập thêm để ghi nhớ lâu hơn nhé!
          </p>
        </div>
        <Button
          size="lg"
          className="mt-2 gap-2"
          onClick={handleRestart}
        >
          <RotateCw className="h-4 w-4" />
          Học lại từ đầu
        </Button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Main study UI
  // -------------------------------------------------------------------------

  const current = queue[0];
  const progressPct = total > 0 ? Math.round((mastered / total) * 100) : 0;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-7">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-base font-bold text-muted-foreground">
          <span>
            Đã thuộc{" "}
            <span className="font-extrabold text-foreground">{mastered}</span> /{" "}
            {total}
          </span>
          <span className="font-extrabold text-foreground">{progressPct}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Còn lại trong hàng đợi:{" "}
          <span className="font-bold text-foreground">{queue.length}</span>
        </p>
      </div>

      {/* Flashcard — bigger so the term reads from across the room */}
      <Card className="rounded-3xl shadow-xl border-2">
        <CardContent className="flex min-h-[26rem] flex-col items-center justify-center gap-8 p-10 text-center">
          {/* Term */}
          <div className="space-y-3">
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Từ / Thuật ngữ
            </p>
            <h2 className="text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-tight break-words">
              {current.term}
            </h2>
          </div>

          {/* Reveal button or definition */}
          {!revealed ? (
            <Button
              variant="outline"
              size="xl"
              className="gap-2 text-lg px-8"
              onClick={handleReveal}
            >
              <Eye className="h-6 w-6" />
              Hiện nghĩa
            </Button>
          ) : (
            <div className="w-full space-y-4 rounded-2xl border-2 border-border bg-muted/40 p-6 text-left">
              <div>
                <p className="mb-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  Định nghĩa
                </p>
                <p className="text-2xl md:text-3xl font-bold leading-snug">
                  {current.definition}
                </p>
              </div>
              {current.example && (
                <div>
                  <p className="mb-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                    Ví dụ
                  </p>
                  <p className="text-lg md:text-xl italic text-muted-foreground leading-relaxed">
                    {current.example}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mascot nudge — presentational, only after reveal */}
      {revealed && (
        <MascotBubble tone="tip" className="justify-center">
          Bạn nhớ từ này chứ? Tự chấm thật lòng nhé!
        </MascotBubble>
      )}

      {/* Action buttons — only visible after reveal */}
      <div
        className={cn(
          "grid grid-cols-2 gap-4 transition-all duration-300",
          revealed
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      >
        <Button
          size="xl"
          className={cn(
            "gap-2 rounded-2xl text-white text-lg h-16",
            "bg-gold-500 hover:bg-gold-600 active:bg-gold-700",
          )}
          onClick={handleNotMastered}
          aria-label="Chưa thuộc"
        >
          <X className="h-6 w-6" />
          Chưa thuộc
        </Button>
        <Button
          size="xl"
          className={cn(
            "gap-2 rounded-2xl text-white text-lg h-16",
            "bg-green-600 hover:bg-green-700 active:bg-green-800",
          )}
          onClick={handleMastered}
          aria-label="Đã thuộc"
        >
          <Check className="h-6 w-6" />
          Đã thuộc ✓
        </Button>
      </div>
    </div>
  );
}
