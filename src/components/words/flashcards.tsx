"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Shuffle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StudyCard } from "./types";

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function Flashcards({ cards }: { cards: StudyCard[] }) {
  const [deck, setDeck] = useState<StudyCard[]>(() => [...cards]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  // flipKey forces AnimatePresence to remount the card when we navigate
  const [flipKey, setFlipKey] = useState(0);

  const goTo = useCallback(
    (next: number) => {
      setIndex(next);
      setFlipped(false);
      setFlipKey((k) => k + 1);
    },
    [],
  );

  const goPrev = useCallback(() => {
    if (deck.length === 0) return;
    goTo((index - 1 + deck.length) % deck.length);
  }, [deck.length, goTo, index]);

  const goNext = useCallback(() => {
    if (deck.length === 0) return;
    goTo((index + 1) % deck.length);
  }, [deck.length, goTo, index]);

  const flip = useCallback(() => setFlipped((f) => !f), []);

  const handleShuffle = useCallback(() => {
    setDeck(shuffleArray(cards));
    setIndex(0);
    setFlipped(false);
    setFlipKey((k) => k + 1);
  }, [cards]);

  const handleReset = useCallback(() => {
    setDeck([...cards]);
    setIndex(0);
    setFlipped(false);
    setFlipKey((k) => k + 1);
  }, [cards]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        flip();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flip, goPrev, goNext]);

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center text-muted-foreground">
        <span className="text-5xl">📭</span>
        <p className="text-lg font-semibold">Bộ thẻ chưa có từ nào.</p>
        <p className="text-sm">Hãy thêm từ mới để bắt đầu luyện tập!</p>
      </div>
    );
  }

  const card = deck[index];

  return (
    <div className="flex flex-col items-center gap-6 px-4 py-6 select-none">
      {/* Progress */}
      <div className="flex w-full max-w-2xl items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {index + 1} / {deck.length}
        </span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShuffle}
            aria-label="Trộn thẻ"
            title="Trộn thẻ"
          >
            <Shuffle className="h-4 w-4 mr-1" />
            Trộn thẻ
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            aria-label="Đặt lại"
            title="Đặt lại thứ tự gốc"
          >
            <RotateCw className="h-4 w-4 mr-1" />
            Đặt lại
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-2xl h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${((index + 1) / deck.length) * 100}%` }}
        />
      </div>

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={flipKey}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="w-full max-w-2xl"
        >
          <div
            className="relative w-full cursor-pointer"
            style={{ minHeight: "18rem", perspective: "1200px" }}
            onClick={flip}
            role="button"
            tabIndex={0}
            aria-label={flipped ? "Mặt sau thẻ — nhấn để lật" : "Mặt trước thẻ — nhấn để lật"}
            onKeyDown={(e) => {
              if (e.code === "Space" || e.code === "Enter") {
                e.preventDefault();
                flip();
              }
            }}
          >
            {/* Inner wrapper — rotates */}
            <div
              className="relative w-full h-full transition-transform duration-500"
              style={{
                transformStyle: "preserve-3d",
                transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                minHeight: "18rem",
              }}
            >
              {/* Front */}
              <CardFace side="front">
                <span className="absolute top-3 right-4 text-xs font-medium text-muted-foreground uppercase tracking-widest">
                  Từ
                </span>
                <p className="font-extrabold text-3xl md:text-4xl text-foreground leading-tight">
                  {card.term}
                </p>
                <p className="mt-4 text-xs text-muted-foreground">
                  Nhấn vào thẻ hoặc nhấn <kbd className="px-1 py-0.5 rounded bg-muted border text-xs">Space</kbd> để lật
                </p>
              </CardFace>

              {/* Back */}
              <CardFace side="back">
                <span className="absolute top-3 right-4 text-xs font-medium text-muted-foreground uppercase tracking-widest">
                  Nghĩa
                </span>
                <p className="font-extrabold text-2xl md:text-3xl text-foreground leading-snug">
                  {card.definition}
                </p>
                {card.example && (
                  <p className="mt-4 text-sm md:text-base italic text-muted-foreground leading-relaxed">
                    {card.example}
                  </p>
                )}
              </CardFace>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="lg"
          onClick={goPrev}
          aria-label="Thẻ trước"
          className={cn(deck.length <= 1 && "opacity-40 pointer-events-none")}
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          Trước
        </Button>

        <span className="text-sm text-muted-foreground w-16 text-center font-medium tabular-nums">
          {index + 1} / {deck.length}
        </span>

        <Button
          variant="outline"
          size="lg"
          onClick={goNext}
          aria-label="Thẻ tiếp"
          className={cn(deck.length <= 1 && "opacity-40 pointer-events-none")}
        >
          Tiếp
          <ChevronRight className="h-5 w-5 ml-1" />
        </Button>
      </div>

      {/* Keyboard hint */}
      <p className="text-xs text-muted-foreground">
        <kbd className="px-1.5 py-0.5 rounded bg-muted border">←</kbd>{" "}
        <kbd className="px-1.5 py-0.5 rounded bg-muted border">→</kbd>{" "}
        để chuyển thẻ &nbsp;·&nbsp;{" "}
        <kbd className="px-1.5 py-0.5 rounded bg-muted border">Space</kbd> để lật
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helper sub-component — not exported                                  */
/* ------------------------------------------------------------------ */

interface CardFaceProps {
  side: "front" | "back";
  children: React.ReactNode;
}

function CardFace({ side, children }: CardFaceProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center",
        "rounded-3xl border bg-card px-8 py-10 shadow-md",
        "backface-hidden",
        side === "back" && "[transform:rotateY(180deg)]",
      )}
      style={{ WebkitBackfaceVisibility: "hidden", backfaceVisibility: "hidden" }}
    >
      {children}
    </div>
  );
}
