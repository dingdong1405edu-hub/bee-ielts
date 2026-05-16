import { prisma } from "@/lib/db";
import { VocabForm } from "./vocab-form";

export default async function NewVocabLessonPage() {
  const units = await prisma.vocabUnit.findMany({
    orderBy: [{ level: "asc" }, { order: "asc" }],
    select: { id: true, title: true, level: true },
  });
  return <VocabForm units={units} />;
}
