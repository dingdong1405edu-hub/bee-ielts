import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { WordChainGame } from "@/components/learn/word-chain-game";

export const metadata: Metadata = {
  title: "Nối Từ — Bee IELTS",
  description: "Mini-game nối từ tiếng Anh: luyện phản xạ từ vựng theo chữ cái cuối.",
};

export default async function WordChainPage() {
  const session = await auth();
  const name = session?.user?.name?.split(" ").slice(-1)[0] ?? "";

  return (
    <div className="relative py-4 sm:py-6">
      <div className="mx-auto max-w-2xl mb-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Mục tiêu
        </Link>
      </div>
      <WordChainGame playerName={name} />
    </div>
  );
}
