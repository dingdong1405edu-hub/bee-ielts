import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { WordsHome } from "@/components/words/words-home";

export const dynamic = "force-dynamic";

export default async function WordsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [decks, user] = await Promise.all([
    prisma.wordDeck.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { cards: true } } },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { popQuizOn: true },
    }),
  ]);

  return (
    <WordsHome
      decks={decks.map((d) => ({ id: d.id, title: d.title, cardCount: d._count.cards }))}
      popQuizOn={user?.popQuizOn ?? false}
    />
  );
}
