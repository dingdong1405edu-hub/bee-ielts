"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Layers, GraduationCap, Grid3x3, ListChecks, BookMarked } from "lucide-react";
import { cn } from "@/lib/utils";
import { Flashcards } from "./flashcards";
import { LearnMode } from "./learn-mode";
import { MatchGame } from "./match-game";
import { TestMode } from "./test-mode";
import { CardManager } from "./card-manager";
import type { StudyCard } from "./types";

type Mode = "cards" | "flashcard" | "learn" | "match" | "test";

const MODES: { id: Mode; label: string; icon: typeof Layers }[] = [
  { id: "cards", label: "Thẻ từ", icon: BookMarked },
  { id: "flashcard", label: "Flashcard", icon: Layers },
  { id: "learn", label: "Học từ", icon: GraduationCap },
  { id: "match", label: "Nối hộp", icon: Grid3x3 },
  { id: "test", label: "Kiểm tra", icon: ListChecks },
];

export function DeckView({
  deck,
  cards: initialCards,
}: {
  deck: { id: string; title: string };
  cards: StudyCard[];
}) {
  const [mode, setMode] = useState<Mode>("cards");
  const [cards, setCards] = useState<StudyCard[]>(initialCards);

  // Learning modes (flashcard / learn / match / test) need more room so the
  // cards + fonts are big enough to read comfortably; the card manager
  // stays in a narrower lane because it's just a list.
  const wide = mode !== "cards";
  return (
    <div className={cn("mx-auto space-y-5", wide ? "max-w-6xl" : "max-w-3xl")}>
      <div>
        <Link href="/words" className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Bộ thẻ của tôi
        </Link>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">{deck.title}</h1>
        <p className="text-muted-foreground text-sm">{cards.length} từ vựng</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-2 text-sm font-bold transition-colors",
                active
                  ? "border-primary bg-accent/40 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40",
              )}
            >
              <Icon className="h-4 w-4" /> {m.label}
            </button>
          );
        })}
      </div>

      <div>
        {mode === "cards" && (
          <CardManager deckId={deck.id} cards={cards} onChange={setCards} />
        )}
        {mode === "flashcard" && <Flashcards cards={cards} />}
        {mode === "learn" && <LearnMode cards={cards} deckId={deck.id} />}
        {mode === "match" && <MatchGame cards={cards} />}
        {mode === "test" && <TestMode cards={cards} />}
      </div>
    </div>
  );
}
