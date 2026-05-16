import { prisma } from "@/lib/db";
import { GrammarForm } from "./grammar-form";

export default async function NewGrammarLessonPage() {
  const units = await prisma.grammarUnit.findMany({
    orderBy: [{ level: "asc" }, { order: "asc" }],
    select: { id: true, title: true, level: true },
  });
  return <GrammarForm units={units} />;
}
