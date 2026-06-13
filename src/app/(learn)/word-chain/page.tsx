import type { Metadata } from "next";
import { WordChainGame } from "@/components/learn/word-chain-game";

export const metadata: Metadata = {
  title: "Nối Từ — Bee IELTS",
  description: "Mini-game nối từ tiếng Anh: luyện phản xạ từ vựng theo chữ cái cuối.",
};

export default function WordChainPage() {
  return (
    <div className="relative py-4 sm:py-6">
      <div className="text-center mb-5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
          Mini-game
        </span>
        <h1 className="mt-2 font-display text-3xl md:text-4xl font-extrabold tracking-tight">
          Nối Từ
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Luyện phản xạ từ vựng — nối từ theo chữ cái cuối, tăng dần độ khó!
        </p>
      </div>
      <WordChainGame />
    </div>
  );
}
