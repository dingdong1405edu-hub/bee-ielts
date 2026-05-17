"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCw, Timer, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StudyCard } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TileKind = "term" | "definition";

interface Tile {
  tileId: string; // unique across the 12 tiles
  cardId: string; // links a term tile to its definition tile
  kind: TileKind;
  text: string;
}

type TileState = "idle" | "selected" | "matched" | "wrong";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildTiles(cards: StudyCard[]): Tile[] {
  const picked = shuffle(cards).slice(0, 6);
  const tiles: Tile[] = [];
  for (const card of picked) {
    tiles.push({ tileId: `${card.id}-term`, cardId: card.id, kind: "term", text: card.term });
    tiles.push({ tileId: `${card.id}-def`, cardId: card.id, kind: "definition", text: card.definition });
  }
  return shuffle(tiles);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MatchGame({ cards }: { cards: StudyCard[] }) {
  // Guard: need at least 2 cards
  if (cards.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
        <Trophy className="h-10 w-10 text-primary/40" />
        <p className="text-sm font-medium">Cần ít nhất 2 từ để chơi.</p>
      </div>
    );
  }

  return <GameBoard cards={cards} />;
}

// ---------------------------------------------------------------------------
// GameBoard (inner — re-mounts on each new game)
// ---------------------------------------------------------------------------

function GameBoard({ cards }: { cards: StudyCard[] }) {
  const [tiles, setTiles] = useState<Tile[]>(() => buildTiles(cards));
  const [tileStates, setTileStates] = useState<Record<string, TileState>>({});
  const [selected, setSelected] = useState<string | null>(null); // tileId
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [gameKey, setGameKey] = useState(0); // bump to force re-mount

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockRef = useRef(false); // block clicks during wrong flash

  // ---------- timer ----------
  useEffect(() => {
    if (finished) return;
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
    };
  }, [finished, gameKey]);

  // ---------- check win ----------
  const matchedCount = Object.values(tileStates).filter((s) => s === "matched").length;
  const totalTiles = tiles.length;

  useEffect(() => {
    if (totalTiles > 0 && matchedCount === totalTiles && !finished) {
      if (timerRef.current !== null) clearInterval(timerRef.current);
      setFinished(true);
    }
  }, [matchedCount, totalTiles, finished]);

  // ---------- click handler ----------
  const handleTile = useCallback(
    (tileId: string) => {
      if (lockRef.current) return;
      const state = tileStates[tileId] ?? "idle";
      if (state === "matched" || state === "wrong") return;
      if (tileId === selected) {
        // deselect
        setSelected(null);
        setTileStates((prev) => ({ ...prev, [tileId]: "idle" }));
        return;
      }

      if (selected === null) {
        // first pick
        setSelected(tileId);
        setTileStates((prev) => ({ ...prev, [tileId]: "selected" }));
        return;
      }

      // second pick — evaluate
      const firstTile = tiles.find((t) => t.tileId === selected)!;
      const secondTile = tiles.find((t) => t.tileId === tileId)!;

      if (firstTile.cardId === secondTile.cardId && firstTile.kind !== secondTile.kind) {
        // MATCH
        setTileStates((prev) => ({
          ...prev,
          [selected]: "matched",
          [tileId]: "matched",
        }));
        setSelected(null);
      } else {
        // WRONG — flash red then reset
        lockRef.current = true;
        setTileStates((prev) => ({
          ...prev,
          [selected]: "wrong",
          [tileId]: "wrong",
        }));
        setSelected(null);
        setTimeout(() => {
          setTileStates((prev) => ({
            ...prev,
            [firstTile.tileId]: "idle",
            [secondTile.tileId]: "idle",
          }));
          lockRef.current = false;
        }, 500);
      }
    },
    [selected, tileStates, tiles],
  );

  // ---------- restart ----------
  const restart = useCallback(() => {
    lockRef.current = false;
    setTiles(buildTiles(cards));
    setTileStates({});
    setSelected(null);
    setElapsed(0);
    setFinished(false);
    setGameKey((k) => k + 1);
  }, [cards]);

  // ---------- column count: 3 on mobile, 4 on sm+ ----------
  const gridClass = "grid grid-cols-3 sm:grid-cols-4 gap-3";

  return (
    <div className="flex flex-col gap-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="font-extrabold text-lg tracking-tight">Nối hộp</h2>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-sm font-semibold tabular-nums text-muted-foreground">
            <Timer className="h-4 w-4" />
            {formatTime(elapsed)}
          </span>
          <Button variant="ghost" size="sm" onClick={restart} className="gap-1.5">
            <RotateCw className="h-4 w-4" />
            Chơi lại
          </Button>
        </div>
      </div>

      {/* Tile grid */}
      <div className={gridClass}>
        {tiles.map((tile) => {
          const state: TileState = tileStates[tile.tileId] ?? "idle";
          return (
            <TileCell
              key={tile.tileId}
              tile={tile}
              state={state}
              onClick={() => handleTile(tile.tileId)}
            />
          );
        })}
      </div>

      {/* Win panel */}
      {finished && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card py-10 shadow-sm">
          <Trophy className="h-12 w-12 text-yellow-400" />
          <p className="font-extrabold text-2xl">Hoàn thành!</p>
          <p className="text-muted-foreground text-sm">
            Thời gian hoàn thành:{" "}
            <span className="font-bold text-foreground">{formatTime(elapsed)}</span>
          </p>
          <Button onClick={restart} className="gap-2 mt-2">
            <RotateCw className="h-4 w-4" />
            Chơi lại
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TileCell
// ---------------------------------------------------------------------------

interface TileCellProps {
  tile: Tile;
  state: TileState;
  onClick: () => void;
}

function TileCell({ tile, state, onClick }: TileCellProps) {
  const isMatched = state === "matched";
  const isSelected = state === "selected";
  const isWrong = state === "wrong";

  return (
    <button
      type="button"
      disabled={isMatched}
      onClick={onClick}
      className={cn(
        // base
        "relative flex min-h-[5rem] w-full items-center justify-center rounded-xl border-2 p-3",
        "text-sm font-medium leading-snug transition-all duration-150",
        "cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        // idle / hover
        !isMatched && !isSelected && !isWrong &&
          "border-border bg-card hover:border-primary/60 hover:bg-primary/5",
        // selected
        isSelected && "border-primary bg-primary/10 ring-2 ring-primary/40",
        // wrong flash
        isWrong && "border-destructive bg-destructive/10",
        // matched — invisible but keeps grid slot
        isMatched && "pointer-events-none cursor-default border-transparent bg-transparent opacity-0",
      )}
    >
      <span className={cn("text-center", isMatched && "invisible")}>{tile.text}</span>
    </button>
  );
}
